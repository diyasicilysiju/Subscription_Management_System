import prisma from '../config/db.js';
import { NotFoundError } from '../utils/appError.js';
import { sum } from '../utils/money.js';
import { addDays, addInterval, fmtDate } from '../utils/dates.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import { nextNumber, withNumberRetry } from '../utils/numbering.js';
import { computeLine, computeTotals } from './pricing.service.js';
import { getDefaultTaxRate } from './tax.service.js';
import { rankApplicableDiscounts, recordDiscountApplication, reserveDiscountUse } from './discount.service.js';
import { markOverdueInvoices } from './invoice.service.js';
import { expireDueSubscriptions } from './subscription.service.js';

/**
 * Recurring billing engine (Member 4)
 *
 * One service serves the admin "run billing" endpoint and the optional scheduler.
 *
 * Rules
 *  - Billing is in advance. A subscription is due when nextBillingDate <= target date;
 *    the invoice covers [nextBillingDate, nextBillingDate + one interval).
 *  - Missed periods are caught up (never skipped) - one invoice per missed period.
 *  - Nothing is billed twice: each subscription is processed inside a transaction that
 *    locks its row and re-reads nextBillingDate, an existing invoice for the same
 *    period is detected before inserting, and the DB has a unique constraint on
 *    (subscriptionId, billingPeriodStart, billingPeriodEnd) as a last line of defence.
 *    A retry after a crash therefore just advances the schedule.
 *  - One failing subscription never stops the run; failures land in BillingRun.errorLog.
 *  - Paused, pending, cancelled and expired subscriptions are never billed; trials are
 *    billed only once the trial has ended.
 */

const DEFAULT_PAYMENT_TERMS_DAYS = parseInt(process.env.DEFAULT_PAYMENT_TERMS_DAYS, 10) || 30;
const MAX_PERIODS_PER_SUBSCRIPTION = 400; // safety valve for e.g. a DAILY plan neglected for over a year
const BATCH_SIZE = 200;

const lineDescription = (name, periodStart, periodEnd) => `${name} (${fmtDate(periodStart)} to ${fmtDate(periodEnd)})`;

/** Lines to bill for one period: the subscription's items, or the plan price if it has none. */
const buildBillableLines = (subscription, periodStart, periodEnd) => {
  const { plan } = subscription;
  if (subscription.items.length) {
    return subscription.items.map((item) => ({
      key: item.id,
      variantId: item.variantId,
      productId: item.variant.productId,
      planId: plan.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      description: lineDescription(`${item.variant.product.name} - ${item.variant.name} [${plan.name}]`, periodStart, periodEnd),
    }));
  }
  return [{
    key: 'plan',
    variantId: null,
    productId: null,
    planId: plan.id,
    quantity: 1,
    unitPrice: plan.price,
    description: lineDescription(plan.name, periodStart, periodEnd),
  }];
};

/**
 * Create the invoice for one period inside the caller's transaction.
 * Picks the best valid discount automatically and claims its use atomically.
 */
const createInvoiceForPeriod = async (tx, { subscription, periodStart, periodEnd, billingRunId, autoConfirm, taxRate, now }) => {
  const lines = buildBillableLines(subscription, periodStart, periodEnd);
  const preDiscount = lines.map((l) => ({ ...l, ...computeLine({ unitPrice: l.unitPrice, quantity: l.quantity, taxRate: 0 }) }));

  // Auto-apply the best discount we can still reserve (no stacking).
  let chosen = null;
  const ranked = await rankApplicableDiscounts(tx, {
    customerId: subscription.customerId,
    now,
    lines: preDiscount.map((l) => ({ key: l.key, net: l.net, quantity: l.quantity, productId: l.productId, planId: l.planId })),
  });
  for (const entry of ranked) {
    if (await reserveDiscountUse(tx, entry.discount, subscription.customerId)) {
      chosen = entry;
      break;
    }
  }

  const priced = lines.map((l) => ({
    ...l,
    ...computeLine({ unitPrice: l.unitPrice, quantity: l.quantity, discountAmount: chosen?.result.perLine.get(l.key) ?? 0, taxRate }),
  }));
  const totals = computeTotals(priced);
  const paidUpFront = totals.totalAmount.lessThanOrEqualTo(0);

  const invoiceNumber = await nextNumber(tx, 'invoice', 'invoiceNumber', 'INV');
  const termsDays = subscription.paymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS; // Subscription.paymentTermsDays once Member 3 adds it
  const invoice = await tx.invoice.create({
    data: {
      invoiceNumber,
      customerId: subscription.customerId,
      subscriptionId: subscription.id,
      billingRunId,
      status: autoConfirm ? (paidUpFront ? 'PAID' : 'ISSUED') : 'DRAFT',
      issueDate: now,
      dueDate: addDays(now, termsDays),
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountPaid: 0,
      amountDue: paidUpFront && autoConfirm ? 0 : totals.totalAmount,
      paidAt: paidUpFront && autoConfirm ? now : null,
      items: {
        create: priced.map((l) => ({
          description: l.description,
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount,
          taxRate: l.taxRate, // frozen snapshot: later tax edits never change this invoice
          taxAmount: l.taxAmount,
          totalAmount: l.totalAmount,
        })),
      },
    },
  });

  if (chosen) {
    await recordDiscountApplication(tx, {
      discountId: chosen.discount.id,
      customerId: subscription.customerId,
      invoiceId: invoice.id,
      appliedAmount: chosen.result.amount,
    });
  }
  return invoice;
};

/**
 * Bill every due period of one subscription. Returns the invoices created and
 * the number of periods that already had an invoice (skipped, not duplicated).
 */
export const billSubscription = async (subscriptionId, { targetDate, billingRunId = null, autoConfirm = false, now = new Date() }) =>
  withNumberRetry('invoiceNumber', () =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscriptionId}::uuid FOR UPDATE`;
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true, items: { include: { variant: { include: { product: true } } } } },
      });
      const outcome = { created: [], skipped: 0 };
      if (!subscription || !['ACTIVE', 'TRIALING'].includes(subscription.status)) return outcome;
      if (subscription.status === 'TRIALING' && subscription.trialEndsAt && subscription.trialEndsAt > targetDate) return outcome;

      const { plan } = subscription;
      const anchorDay = subscription.startDate.getUTCDate();
      const taxRate = await getDefaultTaxRate(tx);

      let periodStart = subscription.nextBillingDate;
      let lastStart = null;
      let lastEnd = null;
      let periods = 0;

      while (periodStart <= targetDate && periods < MAX_PERIODS_PER_SUBSCRIPTION) {
        if (subscription.endDate && periodStart >= subscription.endDate) break;
        const periodEnd = addInterval(periodStart, plan.billingInterval, plan.intervalCount, anchorDay);

        const existing = await tx.invoice.findFirst({
          where: { subscriptionId, billingPeriodStart: periodStart, billingPeriodEnd: periodEnd },
          select: { id: true },
        });
        if (existing) {
          outcome.skipped += 1; // already billed (e.g. a retry after a crash): just move the schedule on
        } else {
          outcome.created.push(await createInvoiceForPeriod(tx, { subscription, periodStart, periodEnd, billingRunId, autoConfirm, taxRate, now }));
        }
        lastStart = periodStart;
        lastEnd = periodEnd;
        periodStart = periodEnd;
        periods += 1;
      }

      if (periods > 0) {
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: {
            nextBillingDate: periodStart,
            currentPeriodStart: lastStart,
            currentPeriodEnd: lastEnd,
            ...(subscription.status === 'TRIALING' ? { status: 'ACTIVE' } : {}),
          },
        });
      }
      return outcome;
    })
  );

/**
 * Run billing for everything due on or before `targetDate`.
 * @param {Object} options
 * @param {Date}    [options.targetDate=now]
 * @param {string}  [options.subscriptionId] - bill just this subscription
 * @param {boolean} [options.autoConfirm=false] - issue invoices straight away instead of leaving DRAFTs
 * @param {Object}  [options.user] - who triggered it (audit log); omitted for the scheduler
 */
export const runBilling = async ({ targetDate = new Date(), subscriptionId, autoConfirm = false, user = null, batchSize = BATCH_SIZE } = {}) => {
  const startedAt = Date.now();
  const now = new Date();
  const run = await prisma.billingRun.create({ data: { targetBillingDate: targetDate, status: 'STARTED' } });

  const errors = [];
  const invoices = [];
  let evaluated = 0;
  let skipped = 0;
  let fatal = null;

  try {
    await markOverdueInvoices(now);
    const expired = await expireDueSubscriptions(now);

    const where = {
      status: { in: ['ACTIVE', 'TRIALING'] },
      nextBillingDate: { lte: targetDate },
      OR: [{ trialEndsAt: null }, { trialEndsAt: { lte: targetDate } }],
      ...(subscriptionId ? { id: subscriptionId } : {}),
    };

    // Keyset pagination (id > lastId). Billing moves each subscription out of `where`, so a Prisma
    // cursor row would vanish from the result set and `skip: 1` would silently drop a live subscription.
    let lastId = null;
    for (;;) {
      const batch = await prisma.subscription.findMany({
        where: lastId ? { AND: [where, { id: { gt: lastId } }] } : where,
        select: { id: true, subscriptionNumber: true },
        orderBy: { id: 'asc' },
        take: batchSize,
      });
      if (!batch.length) break;
      lastId = batch[batch.length - 1].id;

      for (const sub of batch) {
        evaluated += 1;
        try {
          const outcome = await billSubscription(sub.id, { targetDate, billingRunId: run.id, autoConfirm, now });
          invoices.push(...outcome.created);
          skipped += outcome.skipped;
        } catch (error) {
          errors.push({ subscriptionId: sub.id, subscriptionNumber: sub.subscriptionNumber, message: error.message });
        }
      }
    }
    run.expired = expired;
  } catch (error) {
    fatal = error;
    errors.push({ message: `Billing run aborted: ${error.message}` });
  }

  const totalBilled = sum(invoices.map((i) => i.totalAmount));
  const status = fatal || (errors.length > 0 && invoices.length === 0 && evaluated > 0)
    ? 'FAILED'
    : errors.length > 0 ? 'PARTIAL' : 'COMPLETED';

  const finished = await prisma.billingRun.update({
    where: { id: run.id },
    data: {
      status,
      subscriptionsEvaluated: evaluated,
      invoicesGenerated: invoices.length,
      totalAmountBilled: totalBilled,
      executionTimeMs: Date.now() - startedAt,
      errorLog: errors.length ? errors : null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: 'BILLING_RUN',
      entity: 'BillingRun',
      entityId: run.id,
      details: { status, evaluated, generated: invoices.length, skippedDuplicates: skipped, targetDate, autoConfirm },
    },
  });

  return {
    billingRun: finished,
    summary: {
      status,
      subscriptionsEvaluated: evaluated,
      invoicesGenerated: invoices.length,
      periodsAlreadyBilled: skipped,
      subscriptionsExpired: run.expired ?? 0,
      totalAmountBilled: totalBilled,
      errors,
    },
    invoices: invoices.slice(0, 200).map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber, subscriptionId: i.subscriptionId, totalAmount: i.totalAmount, status: i.status })),
  };
};

export const listBillingRuns = async (query = {}) => {
  const pager = parsePagination(query);
  const [billingRuns, total] = await Promise.all([
    prisma.billingRun.findMany({ orderBy: { runDate: 'desc' }, skip: pager.skip, take: pager.take }),
    prisma.billingRun.count(),
  ]);
  return { billingRuns, meta: buildMeta(pager, total) };
};

export const getBillingRun = async (id) => {
  const billingRun = await prisma.billingRun.findUnique({
    where: { id },
    include: { invoices: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true, customerId: true, subscriptionId: true } } },
  });
  if (!billingRun) throw new NotFoundError('Billing run not found');
  return billingRun;
};

/** Optional in-process scheduler (BILLING_SCHEDULER_ENABLED=true). Uses the very same runBilling(). */
let timer = null;
export const startBillingScheduler = (intervalMinutes = parseInt(process.env.BILLING_INTERVAL_MINUTES, 10) || 60) => {
  if (timer) return timer;
  const tick = () =>
    runBilling({ autoConfirm: process.env.BILLING_AUTO_CONFIRM === 'true' })
      .then(({ summary }) => console.log(`[billing] scheduled run ${summary.status}: ${summary.invoicesGenerated} invoice(s)`))
      .catch((error) => console.error('[billing] scheduled run failed:', error));
  timer = setInterval(tick, intervalMinutes * 60 * 1000);
  timer.unref();
  return timer;
};

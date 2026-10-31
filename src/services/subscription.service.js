import prisma from '../config/db.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/appError.js';
import { D, round2, sum } from '../utils/money.js';
import { addDays, addInterval } from '../utils/dates.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import { nextNumber, withNumberRetry } from '../utils/numbering.js';
import { assertCanAccess, customerScope, isStaffOrAdmin } from './access.service.js';
import { validatePlanQuantity } from './plan.service.js';
import { DEFAULT_PAYMENT_TERMS_DAYS } from './pricing.service.js';

/**
 * Subscription lifecycle (Member 4)
 *
 * Brief states -> schema states:
 *   Draft / Quotation -> Quotation DRAFT / SENT      Confirmed -> PENDING
 *   Active            -> TRIALING / ACTIVE            Paused    -> PAUSED
 *   Closed            -> CANCELLED (early close) or EXPIRED (reached its end date)
 *
 * Allowed transitions
 *   PENDING   -> ACTIVE | TRIALING (activate) | CANCELLED
 *   TRIALING  -> ACTIVE (billing, when the trial ends) | PAUSED | CANCELLED | EXPIRED
 *   ACTIVE    -> PAUSED | CANCELLED | EXPIRED
 *   PAUSED    -> ACTIVE | TRIALING (resume) | CANCELLED | EXPIRED
 *   EXPIRED   -> ACTIVE (renew)
 *   CANCELLED -> (terminal; create a new subscription)
 *
 * Per-plan switches (allowPause / allowEarlyClose / allowRenew) are honoured as
 * soon as Member 3 adds them to Plan; until then every action is allowed.
 */

const OPEN_STATES = ['PENDING', 'TRIALING', 'ACTIVE', 'PAUSED'];

const detailInclude = {
  customer: { select: { id: true, contactName: true, companyName: true, email: true } },
  plan: true, // all plan fields, so per-plan switches (allowPause, ...) apply once they exist
  items: { include: { variant: { select: { id: true, name: true, sku: true, product: { select: { id: true, name: true } } } } } },
};

/** Recurring amount per period: sum of lines, or the plan price when no lines exist. */
export const recurringAmount = (subscription) => {
  if (subscription.items?.length) {
    return round2(sum(subscription.items.map((i) => D(i.unitPrice).mul(i.quantity))));
  }
  return round2(subscription.plan?.price ?? 0);
};

export const presentSubscription = (subscription) => ({
  ...subscription,
  totalAmount: recurringAmount(subscription),
  items: (subscription.items ?? []).map((item) => ({
    ...item,
    description: [item.variant?.product?.name, item.variant?.name].filter(Boolean).join(' - ') || 'Subscription line',
    totalAmount: round2(D(item.unitPrice).mul(item.quantity)),
  })),
});

const planAllows = (plan, flag) => plan?.[flag] !== false;

const logAudit = (db, user, action, subscription, details = {}) =>
  db.auditLog.create({
    data: { userId: user?.id ?? null, action, entity: 'Subscription', entityId: subscription.id, details: { subscriptionNumber: subscription.subscriptionNumber, ...details } },
  });

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export const listSubscriptions = async (user, query = {}) => {
  const where = { ...(await customerScope(user, query.customerId)) };
  if (query.status) where.status = String(query.status).toUpperCase();
  if (query.planId) where.planId = query.planId;
  if (query.search) {
    where.OR = [
      { subscriptionNumber: { contains: query.search, mode: 'insensitive' } },
      { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      { customer: { contactName: { contains: query.search, mode: 'insensitive' } } },
      { plan: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  const pager = parsePagination(query);
  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({ where, include: detailInclude, orderBy: { createdAt: 'desc' }, skip: pager.skip, take: pager.take }),
    prisma.subscription.count({ where }),
  ]);
  return { subscriptions: rows.map(presentSubscription), meta: buildMeta(pager, total) };
};

const loadSubscription = async (id) => {
  const subscription = await prisma.subscription.findUnique({ where: { id }, include: detailInclude });
  return subscription;
};

export const getSubscription = async (user, id) => {
  const subscription = await loadSubscription(id);
  await assertCanAccess(user, subscription, 'Subscription');
  return presentSubscription(subscription);
};

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

/** Period / status fields for a new or newly activated subscription. */
const lifecycleFields = (plan, start, { activate, trialAllowed }) => {
  const anchorDay = start.getUTCDate();
  if (activate && trialAllowed && plan.trialDays > 0) {
    const trialEndsAt = addDays(start, plan.trialDays);
    return { status: 'TRIALING', trialEndsAt, currentPeriodStart: start, currentPeriodEnd: trialEndsAt, nextBillingDate: trialEndsAt };
  }
  return {
    status: activate ? 'ACTIVE' : 'PENDING',
    trialEndsAt: null,
    currentPeriodStart: start,
    currentPeriodEnd: addInterval(start, plan.billingInterval, plan.intervalCount, anchorDay),
    nextBillingDate: start, // first invoice is due immediately, in advance of the period
  };
};

/**
 * Create a subscription (and its lines) inside the caller's transaction.
 * Shared by direct creation and quotation conversion.
 */
export const createSubscriptionRecord = async (tx, { customerId, plan, items, startDate, endDate, autoRenew = true, paymentTermsDays, notes = null, activate = true, user }) => {
  const start = startDate ?? new Date();
  const priorOnPlan = await tx.subscription.count({ where: { customerId, planId: plan.id } });
  const fields = lifecycleFields(plan, start, { activate, trialAllowed: priorOnPlan === 0 });

  const subscriptionNumber = await nextNumber(tx, 'subscription', 'subscriptionNumber', 'SUB');
  const subscription = await tx.subscription.create({
    data: {
      subscriptionNumber,
      customerId,
      planId: plan.id,
      billingInterval: plan.billingInterval,
      startDate: start,
      endDate: endDate ?? null,
      autoRenew,
      paymentTermsDays: paymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS,
      notes,
      ...fields,
      items: {
        create: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: round2(i.unitPrice),
          taxRate: i.taxRate === undefined || i.taxRate === null ? null : D(i.taxRate), // null = default tax at billing time
        })),
      },
    },
  });
  await logAudit(tx, user, 'SUBSCRIPTION_CREATED', subscription, { status: subscription.status });
  return subscription;
};

export const createSubscription = async (user, data) => {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new NotFoundError('Customer not found');
  if (customer.status !== 'ACTIVE') throw new BadRequestError('Cannot create a subscription for an inactive customer');

  const totalQuantity = data.items.reduce((total, i) => total + i.quantity, 0);
  const { plan } = await validatePlanQuantity(data.planId, totalQuantity); // enforces minQuantity + availability

  const variants = await prisma.productVariant.findMany({ where: { id: { in: data.items.map((i) => i.variantId) } } });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const items = data.items.map((item) => {
    const variant = byId.get(item.variantId);
    if (!variant || !variant.isActive) throw new BadRequestError(`Product variant ${item.variantId} does not exist or is inactive`);
    return { variantId: item.variantId, quantity: item.quantity, unitPrice: item.unitPrice ?? variant.price, taxRate: item.taxRate };
  });
  if (data.endDate && data.startDate && data.endDate <= data.startDate) {
    throw new BadRequestError('End date must be after the start date');
  }

  const created = await withNumberRetry('subscriptionNumber', () =>
    prisma.$transaction((tx) =>
      createSubscriptionRecord(tx, {
        customerId: customer.id, plan, items, startDate: data.startDate, endDate: data.endDate,
        autoRenew: data.autoRenew, paymentTermsDays: data.paymentTermsDays, notes: data.notes, activate: data.activate, user,
      })
    )
  );
  return getSubscription(user, created.id);
};

/* ------------------------------------------------------------------ */
/* Lifecycle transitions                                               */
/* ------------------------------------------------------------------ */

const invalidTransition = (subscription, action) =>
  new ConflictError(`Cannot ${action} a subscription that is ${subscription.status}`, null, 'INVALID_SUBSCRIPTION_TRANSITION');

const planBlocks = (plan, action, label) =>
  new ConflictError(`Plan '${plan.name}' does not allow ${label}`, null, `PLAN_DOES_NOT_ALLOW_${action}`);

/** Load + authorise, then apply a guarded update (status is re-checked in SQL so races fail safely). */
const applyTransition = async (user, id, { action, from, flag, flagLabel, buildData, auditAction, details }) => {
  const subscription = await loadSubscription(id);
  await assertCanAccess(user, subscription, 'Subscription');
  if (!from.includes(subscription.status)) throw invalidTransition(subscription, action);
  if (flag && !planAllows(subscription.plan, flag)) throw planBlocks(subscription.plan, action.toUpperCase(), flagLabel);

  const data = await buildData(subscription);
  const result = await prisma.subscription.updateMany({ where: { id, status: subscription.status }, data });
  if (result.count === 0) throw invalidTransition(await loadSubscription(id), action);

  await logAudit(prisma, user, auditAction, subscription, { from: subscription.status, ...(details?.(subscription) ?? {}) });
  return getSubscription(user, id);
};

export const activateSubscription = async (user, id) => {
  if (!isStaffOrAdmin(user)) throw new ForbiddenError('Only staff can activate a subscription');
  return applyTransition(user, id, {
    action: 'activate',
    from: ['PENDING'],
    auditAction: 'SUBSCRIPTION_ACTIVATED',
    buildData: async (s) => {
      const start = s.startDate > new Date() ? s.startDate : new Date();
      const prior = await prisma.subscription.count({ where: { customerId: s.customerId, planId: s.planId, NOT: { id: s.id } } });
      const { status, ...rest } = lifecycleFields(s.plan, start, { activate: true, trialAllowed: prior === 0 });
      return { status, ...rest, startDate: start };
    },
  });
};

export const pauseSubscription = (user, id) =>
  applyTransition(user, id, {
    action: 'pause',
    from: ['ACTIVE', 'TRIALING'],
    flag: 'allowPause',
    flagLabel: 'pausing',
    auditAction: 'SUBSCRIPTION_PAUSED',
    buildData: async () => ({ status: 'PAUSED', pausedAt: new Date() }),
  });

/** Resuming pushes the schedule out by the time spent paused so paused time is never billed. */
export const resumeSubscription = (user, id) =>
  applyTransition(user, id, {
    action: 'resume',
    from: ['PAUSED'],
    auditAction: 'SUBSCRIPTION_RESUMED',
    buildData: async (s) => {
      const now = new Date();
      const pausedMs = s.pausedAt ? Math.max(0, now.getTime() - s.pausedAt.getTime()) : 0;
      const shift = (d) => (d ? new Date(d.getTime() + pausedMs) : d);
      const stillTrialing = s.trialEndsAt && shift(s.trialEndsAt) > now;
      return {
        status: stillTrialing ? 'TRIALING' : 'ACTIVE',
        resumedAt: now,
        pausedAt: null,
        nextBillingDate: shift(s.nextBillingDate),
        currentPeriodEnd: shift(s.currentPeriodEnd),
        trialEndsAt: shift(s.trialEndsAt),
        endDate: shift(s.endDate),
      };
    },
    details: (s) => ({ pausedAt: s.pausedAt }),
  });

export const cancelSubscription = (user, id, reason = null) =>
  applyTransition(user, id, {
    action: 'cancel',
    from: OPEN_STATES,
    flag: 'allowEarlyClose',
    flagLabel: 'early closure',
    auditAction: 'SUBSCRIPTION_CANCELLED',
    buildData: async (s) => {
      const now = new Date();
      return {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: reason,
        autoRenew: false,
        endDate: s.endDate && s.endDate < now ? s.endDate : now,
      };
    },
    details: () => ({ reason }),
  });

/**
 * Renew: an EXPIRED subscription restarts from now; a live one with a fixed end
 * date gets that end date extended by one billing interval.
 */
export const renewSubscription = (user, id) =>
  applyTransition(user, id, {
    action: 'renew',
    from: ['ACTIVE', 'TRIALING', 'EXPIRED'],
    flag: 'allowRenew',
    flagLabel: 'renewal',
    auditAction: 'SUBSCRIPTION_RENEWED',
    buildData: async (s) => {
      const { billingInterval, intervalCount } = s.plan;
      const anchorDay = s.startDate.getUTCDate();
      if (s.status === 'EXPIRED') {
        const now = new Date();
        return {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: addInterval(now, billingInterval, intervalCount, anchorDay),
          nextBillingDate: now,
          endDate: s.endDate ? addInterval(now, billingInterval, intervalCount, anchorDay) : null,
          cancelledAt: null,
        };
      }
      if (!s.endDate) {
        throw new ConflictError('This subscription has no end date and already renews automatically', null, 'ALREADY_AUTO_RENEWING');
      }
      return { endDate: addInterval(s.endDate, billingInterval, intervalCount, anchorDay), autoRenew: true };
    },
  });

/**
 * Close subscriptions whose end date has passed (EXPIRED). Run by every billing
 * run and by the scheduler. Safe to call repeatedly.
 */
export const expireDueSubscriptions = async (now = new Date(), db = prisma) => {
  const result = await db.subscription.updateMany({
    // Plans with autoCloseOnEnd = false keep running past their end date until someone closes them.
    where: { endDate: { lte: now }, status: { in: ['ACTIVE', 'TRIALING', 'PAUSED'] }, plan: { autoCloseOnEnd: true } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
};

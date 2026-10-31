import prisma from '../config/db.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/appError.js';
import { D } from '../utils/money.js';
import { addDays } from '../utils/dates.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import { nextNumber, withNumberRetry } from '../utils/numbering.js';
import { assertCanAccess, customerScope, isStaffOrAdmin } from './access.service.js';
import { computeLine, computeTotals } from './pricing.service.js';
import { getDefaultTaxRate } from './tax.service.js';
import { validatePlanQuantity } from './plan.service.js';
import { createSubscriptionRecord, getSubscription } from './subscription.service.js';

/**
 * Quotation Service (Member 4)
 *
 * DRAFT -> SENT -> ACCEPTED -> CONVERTED   (REJECTED / EXPIRED are terminal)
 * A quotation is valid until `validUntil`; stale ones are flipped to EXPIRED on read.
 * Conversion is one-shot: the status flip is a guarded UPDATE inside the same
 * transaction that creates the subscription, so double clicks cannot create two.
 */

const CONVERTIBLE = ['DRAFT', 'SENT', 'ACCEPTED'];

const detailInclude = {
  customer: { select: { id: true, contactName: true, companyName: true, email: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: { select: { id: true, name: true, sku: true } },
      plan: { select: { id: true, name: true, code: true, billingInterval: true, minQuantity: true } },
    },
  },
  convertedSubscription: { select: { id: true, subscriptionNumber: true, status: true } },
};

/** Flip quotes past their validity date to EXPIRED. Cheap, indexed-by-status UPDATE. */
export const expireStaleQuotations = (now = new Date()) =>
  prisma.quotation.updateMany({
    where: { status: { in: CONVERTIBLE }, validUntil: { lt: now } },
    data: { status: 'EXPIRED' },
  });

export const listQuotations = async (user, query = {}) => {
  await expireStaleQuotations();
  const where = { ...(await customerScope(user, query.customerId)) };
  if (!isStaffOrAdmin(user)) where.status = { not: 'DRAFT' }; // customers never see unsent drafts
  if (query.status) where.status = String(query.status).toUpperCase();
  if (query.search) {
    where.OR = [
      { quotationNumber: { contains: query.search, mode: 'insensitive' } },
      { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      { customer: { contactName: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  const pager = parsePagination(query);
  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({ where, include: detailInclude, orderBy: { createdAt: 'desc' }, skip: pager.skip, take: pager.take }),
    prisma.quotation.count({ where }),
  ]);
  return { quotations, meta: buildMeta(pager, total) };
};

const loadQuotation = (id) => prisma.quotation.findUnique({ where: { id }, include: detailInclude });

export const getQuotation = async (user, id) => {
  await expireStaleQuotations();
  const quotation = await loadQuotation(id);
  await assertCanAccess(user, quotation, 'Quotation');
  if (!isStaffOrAdmin(user) && quotation.status === 'DRAFT') throw new NotFoundError('Quotation not found');
  return quotation;
};

/* ------------------------------------------------------------------ */

export const createQuotation = async (user, data) => {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new NotFoundError('Customer not found');
  if (customer.status !== 'ACTIVE') throw new BadRequestError('Cannot quote an inactive customer');

  const validUntil = data.validUntil ?? addDays(new Date(), data.validDays ?? 30);
  if (validUntil <= new Date()) throw new BadRequestError('Quotation validity date must be in the future');

  const defaultTaxRate = await getDefaultTaxRate();
  const variantIds = [...new Set(data.items.map((i) => i.variantId).filter(Boolean))];
  const planIds = [...new Set(data.items.map((i) => i.planId ?? data.planId).filter(Boolean))];
  const [variants, plans] = await Promise.all([
    prisma.productVariant.findMany({ where: { id: { in: variantIds } }, include: { product: { select: { name: true } } } }),
    prisma.plan.findMany({ where: { id: { in: planIds } } }),
  ]);
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const planById = new Map(plans.map((p) => [p.id, p]));

  // Plan minimum quantity / availability: total quantity per plan, via Member 2's validator.
  const qtyByPlan = new Map();
  for (const item of data.items) {
    const planId = item.planId ?? data.planId;
    if (planId) qtyByPlan.set(planId, (qtyByPlan.get(planId) ?? 0) + item.quantity);
  }
  for (const [planId, quantity] of qtyByPlan) {
    if (!planById.has(planId)) throw new BadRequestError(`Plan ${planId} does not exist`);
    await validatePlanQuantity(planId, quantity);
  }

  const computed = data.items.map((item) => {
    const planId = item.planId ?? data.planId ?? null;
    const variant = item.variantId ? variantById.get(item.variantId) : null;
    if (item.variantId && (!variant || !variant.isActive)) throw new BadRequestError(`Product variant ${item.variantId} does not exist or is inactive`);
    const plan = planId ? planById.get(planId) : null;

    const unitPrice = item.unitPrice ?? variant?.price ?? plan?.price;
    if (unitPrice === undefined || unitPrice === null) throw new BadRequestError('Each line needs a unitPrice, variantId or planId');
    const description =
      item.description ??
      ([variant?.product?.name, variant?.name].filter(Boolean).join(' - ') || plan?.name || 'Quotation line');
    const line = computeLine({ unitPrice, quantity: item.quantity, discountAmount: item.discountAmount ?? 0, taxRate: item.taxRate ?? defaultTaxRate });
    return { item, planId, description, unitPrice, line };
  });
  const totals = computeTotals(computed.map((c) => c.line));

  const created = await withNumberRetry('quotationNumber', () =>
    prisma.$transaction(async (tx) => {
      const quotationNumber = await nextNumber(tx, 'quotation', 'quotationNumber', 'QUO');
      const quotation = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: customer.id,
          createdById: user.id,
          status: 'DRAFT',
          validUntil,
          ...totals,
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          items: {
            create: computed.map(({ item, planId, description, unitPrice, line }) => ({
              description,
              variantId: item.variantId ?? null,
              planId,
              quantity: item.quantity,
              unitPrice: D(unitPrice),
              discountAmount: line.discountAmount,
              taxRate: line.taxRate,
              totalAmount: line.totalAmount,
            })),
          },
        },
      });
      await tx.auditLog.create({ data: { userId: user.id, action: 'QUOTATION_CREATED', entity: 'Quotation', entityId: quotation.id, details: { quotationNumber } } });
      return quotation;
    })
  );
  return loadQuotation(created.id);
};

/* ------------------------------------------------------------------ */

const transition = async (user, id, { from, to, action, customerAllowed = false }) => {
  await expireStaleQuotations();
  const quotation = await loadQuotation(id);
  await assertCanAccess(user, quotation, 'Quotation');
  if (!isStaffOrAdmin(user) && !customerAllowed) throw new ForbiddenError(`Only staff can ${action} a quotation`);
  if (!from.includes(quotation.status)) {
    throw new ConflictError(`Cannot ${action} a quotation that is ${quotation.status}`, null, 'INVALID_QUOTATION_TRANSITION');
  }
  const result = await prisma.quotation.updateMany({ where: { id, status: quotation.status }, data: { status: to } });
  if (result.count === 0) throw new ConflictError(`Quotation was changed by someone else; reload and try again`, null, 'INVALID_QUOTATION_TRANSITION');
  await prisma.auditLog.create({ data: { userId: user.id, action: `QUOTATION_${to}`, entity: 'Quotation', entityId: id, details: { from: quotation.status } } });
  return loadQuotation(id);
};

export const sendQuotation = (user, id) => transition(user, id, { from: ['DRAFT'], to: 'SENT', action: 'send' });
export const acceptQuotation = (user, id) => transition(user, id, { from: ['SENT'], to: 'ACCEPTED', action: 'accept', customerAllowed: true });
export const rejectQuotation = (user, id) => transition(user, id, { from: ['DRAFT', 'SENT'], to: 'REJECTED', action: 'reject', customerAllowed: true });

/**
 * Convert a valid quotation into a subscription.
 * Requires every line to carry a product variant, and all lines to share one plan.
 */
export const convertQuotation = async (user, id, { activate = true, startDate, endDate, autoRenew = true } = {}) => {
  await expireStaleQuotations();
  const quotation = await loadQuotation(id);
  if (!quotation) throw new NotFoundError('Quotation not found');

  if (quotation.convertedSubscriptionId || quotation.status === 'CONVERTED') {
    throw new ConflictError('This quotation has already been converted to a subscription', null, 'QUOTATION_ALREADY_CONVERTED');
  }
  if (!CONVERTIBLE.includes(quotation.status)) {
    throw new ConflictError(`A ${quotation.status} quotation cannot be converted`, null, 'QUOTATION_NOT_CONVERTIBLE');
  }

  const planIds = [...new Set(quotation.items.map((i) => i.planId).filter(Boolean))];
  if (planIds.length !== 1) {
    throw new ValidationError('A quotation needs exactly one plan on its lines before it can become a subscription', [{ field: 'items', message: 'Set the same planId on every line' }]);
  }
  const lacksVariant = quotation.items.filter((i) => !i.variantId);
  if (lacksVariant.length) {
    throw new ValidationError('Every quotation line needs a product variant before conversion', lacksVariant.map((i) => ({ field: 'items', message: `Line '${i.description}' has no variantId` })));
  }

  const totalQuantity = quotation.items.reduce((total, i) => total + i.quantity, 0);
  const { plan } = await validatePlanQuantity(planIds[0], totalQuantity);

  const subscriptionId = await withNumberRetry('subscriptionNumber', () =>
    prisma.$transaction(async (tx) => {
      // Claim the quotation atomically; a concurrent second conversion gets count 0.
      const claimed = await tx.quotation.updateMany({
        where: { id, status: { in: CONVERTIBLE }, convertedSubscriptionId: null },
        data: { status: 'CONVERTED' },
      });
      if (claimed.count === 0) {
        throw new ConflictError('This quotation has already been converted to a subscription', null, 'QUOTATION_ALREADY_CONVERTED');
      }

      const subscription = await createSubscriptionRecord(tx, {
        customerId: quotation.customerId,
        plan,
        items: quotation.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice })),
        startDate,
        endDate,
        autoRenew,
        notes: `Converted from quotation ${quotation.quotationNumber}`,
        activate,
        user,
      });
      await tx.quotation.update({ where: { id }, data: { convertedSubscriptionId: subscription.id } });
      await tx.auditLog.create({
        data: { userId: user.id, action: 'QUOTATION_CONVERTED', entity: 'Quotation', entityId: id, details: { quotationNumber: quotation.quotationNumber, subscriptionNumber: subscription.subscriptionNumber } },
      });
      return subscription.id;
    })
  );

  return {
    quotation: await loadQuotation(id),
    subscription: await getSubscription(user, subscriptionId),
  };
};

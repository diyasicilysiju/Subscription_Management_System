import prisma from '../config/db.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/appError.js';
import { D, minDecimal, percentOf, round2, sum } from '../utils/money.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';

/**
 * Discount Service (Member 4)
 *
 * Admin-managed rules (fixed amount or percentage) with minimum purchase /
 * quantity, validity dates, usage limits and optional product / plan
 * eligibility. The billing engine auto-applies the best eligible rule to the next
 * invoice; usage limits are enforced atomically in SQL so concurrent billing
 * runs or requests can never exceed `maxUses`.
 */

const eligibilityInclude = {
  eligibleProducts: { select: { productId: true } },
  eligiblePlans: { select: { planId: true } },
};

/** Canonical (schema) fields plus the aliases the frontend reads. */
export const presentDiscount = (discount) => {
  const { eligibleProducts = [], eligiblePlans = [], ...rest } = discount;
  return {
    ...rest,
    productIds: eligibleProducts.map((p) => p.productId),
    planIds: eligiblePlans.map((p) => p.planId),
    minOrderAmount: discount.minPurchaseAmount,
    maxRedemptions: discount.maxUses,
    timesRedeemed: discount.usedCount,
    startDate: discount.validFrom,
    endDate: discount.validTo,
  };
};

export const listDiscounts = async (query = {}) => {
  const where = {};
  if (query.isActive !== undefined && query.isActive !== '') where.isActive = String(query.isActive) === 'true';
  if (query.type) where.type = String(query.type).toUpperCase();
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const pager = parsePagination(query, { defaultLimit: 50 });
  const [rows, total] = await Promise.all([
    prisma.discount.findMany({
      where,
      include: eligibilityInclude,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip: pager.skip,
      take: pager.take,
    }),
    prisma.discount.count({ where }),
  ]);
  return { discounts: rows.map(presentDiscount), meta: buildMeta(pager, total) };
};

export const getDiscount = async (id) => {
  const discount = await prisma.discount.findUnique({ where: { id }, include: eligibilityInclude });
  if (!discount) throw new NotFoundError('Discount not found');
  return presentDiscount(discount);
};

const assertEligibilityTargetsExist = async (db, productIds = [], planIds = []) => {
  if (productIds.length) {
    const found = await db.product.count({ where: { id: { in: productIds } } });
    if (found !== new Set(productIds).size) throw new BadRequestError('One or more eligible products do not exist');
  }
  if (planIds.length) {
    const found = await db.plan.count({ where: { id: { in: planIds } } });
    if (found !== new Set(planIds).size) throw new BadRequestError('One or more eligible plans do not exist');
  }
};

export const createDiscount = async (data, actorId) => {
  const { productIds = [], planIds = [], ...fields } = data;
  const existing = await prisma.discount.findUnique({ where: { code: fields.code } });
  if (existing) throw new ConflictError(`Discount with code '${fields.code}' already exists`);

  return prisma.$transaction(async (tx) => {
    await assertEligibilityTargetsExist(tx, productIds, planIds);
    const created = await tx.discount.create({
      data: {
        ...fields,
        eligibleProducts: { create: [...new Set(productIds)].map((productId) => ({ productId })) },
        eligiblePlans: { create: [...new Set(planIds)].map((planId) => ({ planId })) },
      },
      include: eligibilityInclude,
    });
    await tx.auditLog.create({
      data: { userId: actorId, action: 'DISCOUNT_CREATED', entity: 'Discount', entityId: created.id, details: { code: created.code } },
    });
    return presentDiscount(created);
  });
};

export const updateDiscount = async (id, data, actorId) => {
  const current = await prisma.discount.findUnique({ where: { id } });
  if (!current) throw new NotFoundError('Discount not found');
  const { productIds, planIds, ...fields } = data;

  if (fields.code && fields.code !== current.code) {
    const clash = await prisma.discount.findFirst({ where: { code: fields.code, NOT: { id } } });
    if (clash) throw new ConflictError(`Discount with code '${fields.code}' already exists`);
  }
  if (fields.maxUses !== undefined && fields.maxUses !== null && fields.maxUses < current.usedCount) {
    throw new BadRequestError(`maxUses cannot be lower than the ${current.usedCount} redemptions already used`);
  }
  const type = fields.type ?? current.type;
  const value = fields.value ?? current.value;
  if (type === 'PERCENTAGE' && D(value).greaterThan(100)) throw new BadRequestError('Percentage discounts cannot exceed 100');

  return prisma.$transaction(async (tx) => {
    await assertEligibilityTargetsExist(tx, productIds, planIds);
    if (productIds) {
      await tx.discountProduct.deleteMany({ where: { discountId: id } });
      await tx.discountProduct.createMany({ data: [...new Set(productIds)].map((productId) => ({ discountId: id, productId })) });
    }
    if (planIds) {
      await tx.discountPlan.deleteMany({ where: { discountId: id } });
      await tx.discountPlan.createMany({ data: [...new Set(planIds)].map((planId) => ({ discountId: id, planId })) });
    }
    const updated = await tx.discount.update({ where: { id }, data: fields, include: eligibilityInclude });
    await tx.auditLog.create({
      data: { userId: actorId, action: 'DISCOUNT_UPDATED', entity: 'Discount', entityId: id, details: { fields: Object.keys(fields) } },
    });
    return presentDiscount(updated);
  });
};

/* ------------------------------------------------------------------ */
/* Auto-application engine (used by the billing service)               */
/* ------------------------------------------------------------------ */

/**
 * Work out what a discount would take off a set of priced lines.
 * @param {Object} discount - discount with eligibleProducts / eligiblePlans
 * @param {Array<{key:any, net:Decimal, quantity:number, productId?:string, planId?:string}>} lines
 * @returns {{amount: Decimal, perLine: Map<any, Decimal>} | null} null when not applicable
 */
export const evaluateDiscount = (discount, lines) => {
  const productSet = new Set((discount.eligibleProducts ?? []).map((p) => p.productId));
  const planSet = new Set((discount.eligiblePlans ?? []).map((p) => p.planId));
  const restricted = productSet.size > 0 || planSet.size > 0;

  const eligible = lines.filter((l) => !restricted || planSet.has(l.planId) || productSet.has(l.productId));
  if (!eligible.length) return null;

  const base = sum(eligible.map((l) => l.net));
  const quantity = eligible.reduce((total, l) => total + l.quantity, 0);
  if (base.lessThanOrEqualTo(0)) return null;
  if (discount.minPurchaseAmount !== null && discount.minPurchaseAmount !== undefined && base.lessThan(D(discount.minPurchaseAmount))) return null;
  if (discount.minQuantity && quantity < discount.minQuantity) return null;

  const amount =
    discount.type === 'PERCENTAGE' ? percentOf(base, discount.value) : minDecimal(round2(discount.value), base);
  if (amount.lessThanOrEqualTo(0)) return null;

  // Spread across eligible lines pro rata; the last line absorbs rounding.
  const perLine = new Map();
  let remaining = amount;
  eligible.forEach((line, index) => {
    const share = index === eligible.length - 1 ? remaining : minDecimal(round2(amount.mul(line.net).div(base)), remaining);
    perLine.set(line.key, share);
    remaining = remaining.minus(share);
  });
  return { amount, perLine };
};

/**
 * Rank every currently valid discount that fits these lines, best saving first.
 * No stacking: the billing engine applies the first one it can reserve.
 */
export const rankApplicableDiscounts = async (db, { customerId, lines, now = new Date() }) => {
  const candidates = await db.discount.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
      ],
    },
    include: eligibilityInclude,
  });
  if (!candidates.length) return [];

  const perCustomer = await db.discountApplication.groupBy({
    by: ['discountId'],
    where: { customerId, status: 'APPLIED', discountId: { in: candidates.map((c) => c.id) } },
    _count: { _all: true },
  });
  const usedByCustomer = new Map(perCustomer.map((row) => [row.discountId, row._count._all]));

  return candidates
    .filter((c) => c.maxUses === null || c.usedCount < c.maxUses)
    .filter((c) => c.maxUsesPerCustomer === null || (usedByCustomer.get(c.id) ?? 0) < c.maxUsesPerCustomer)
    .map((discount) => ({ discount, result: evaluateDiscount(discount, lines) }))
    .filter((entry) => entry.result)
    .sort((a, b) => b.result.amount.comparedTo(a.result.amount));
};

/**
 * Atomically claim one use of a discount inside the caller's transaction.
 * The single conditional UPDATE locks the row, so two concurrent invoices can
 * never push usedCount past maxUses. Returns false when the limit is already hit.
 */
export const reserveDiscountUse = async (tx, discount, customerId) => {
  const updated = await tx.$executeRaw`
    UPDATE discounts
       SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
     WHERE id = ${discount.id}::uuid
       AND "isActive" = true
       AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
  if (updated === 0) return false;

  if (discount.maxUsesPerCustomer !== null && discount.maxUsesPerCustomer !== undefined) {
    // Row is now locked by us, so concurrent redemptions are serialised for this check.
    const used = await tx.discountApplication.count({ where: { discountId: discount.id, customerId, status: 'APPLIED' } });
    if (used >= discount.maxUsesPerCustomer) {
      await tx.$executeRaw`UPDATE discounts SET "usedCount" = "usedCount" - 1 WHERE id = ${discount.id}::uuid`;
      return false;
    }
  }
  return true;
};

/**
 * Record a redemption. A DiscountApplication must reference an invoice OR a
 * quotation, never both and never neither (DATABASE_DESIGN.md section 4.8).
 */
export const recordDiscountApplication = (tx, { discountId, customerId, invoiceId = null, quotationId = null, appliedAmount }) => {
  if (Boolean(invoiceId) === Boolean(quotationId)) {
    throw new BadRequestError('A discount application must reference either an invoice or a quotation, not both or neither');
  }
  return tx.discountApplication.create({
    data: { discountId, customerId, invoiceId, quotationId, appliedAmount: round2(appliedAmount), status: 'APPLIED' },
  });
};

/** Give redemptions back when an invoice is cancelled. */
export const revertDiscountApplications = async (tx, invoiceId) => {
  const applied = await tx.discountApplication.findMany({ where: { invoiceId, status: 'APPLIED' } });
  for (const application of applied) {
    await tx.discountApplication.update({ where: { id: application.id }, data: { status: 'REVERTED' } });
    await tx.$executeRaw`UPDATE discounts SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE id = ${application.discountId}::uuid`;
  }
  return applied.length;
};

import prisma from '../config/db.js';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/appError.js';

/**
 * Subscription Plan Service
 * Uses the shared Prisma singleton client from src/config/db.js.
 */

/**
 * List all subscription plans with optional filters
 * @param {Object} query - { search, billingInterval, isActive }
 */
export const getAllPlans = async ({ search = '', billingInterval, isActive } = {}) => {
  const where = {};

  if (isActive !== undefined && isActive !== '') {
    where.isActive = String(isActive) === 'true';
  }

  if (billingInterval) {
    where.billingInterval = billingInterval.toUpperCase();
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.plan.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
  });
};

/**
 * Retrieve a specific plan by UUID or Code
 * @param {string} identifier - UUID or unique plan code
 */
export const getPlanById = async (identifier) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  const plan = await prisma.plan.findFirst({
    where: isUuid ? { id: identifier } : { code: identifier.toUpperCase() },
    include: {
      _count: {
        select: {
          subscriptions: true,
          quotationItems: true,
        },
      },
    },
  });

  if (!plan) {
    throw new NotFoundError(`Subscription plan '${identifier}' not found`);
  }

  return plan;
};

/**
 * Create a new subscription plan
 * @param {Object} data 
 */
export const createPlan = async (data) => {
  const existingCode = await prisma.plan.findUnique({
    where: { code: data.code.toUpperCase() },
  });

  if (existingCode) {
    throw new ConflictError(`Plan with code '${data.code.toUpperCase()}' already exists`);
  }

  return prisma.plan.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description || null,
      billingInterval: data.billingInterval.toUpperCase(),
      intervalCount: data.intervalCount || 1,
      price: data.price,
      currency: data.currency || 'USD',
      trialDays: data.trialDays || 0,
      minQuantity: Math.max(1, data.minQuantity || 1),
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      availableTo: data.availableTo ? new Date(data.availableTo) : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

/**
 * Update an existing subscription plan
 * @param {string} id 
 * @param {Object} data 
 */
export const updatePlan = async (id, data) => {
  await getPlanById(id);

  if (data.code) {
    const existing = await prisma.plan.findFirst({
      where: { code: data.code.toUpperCase(), NOT: { id } },
    });
    if (existing) {
      throw new ConflictError(`Plan with code '${data.code.toUpperCase()}' already exists`);
    }
  }

  const updatePayload = { ...data };
  if (data.code) updatePayload.code = data.code.toUpperCase();
  if (data.billingInterval) updatePayload.billingInterval = data.billingInterval.toUpperCase();
  if (data.availableFrom) updatePayload.availableFrom = new Date(data.availableFrom);
  if (data.availableTo) updatePayload.availableTo = new Date(data.availableTo);

  return prisma.plan.update({
    where: { id },
    data: updatePayload,
  });
};

/**
 * Soft delete plan (deactivate)
 * @param {string} id 
 */
export const deletePlan = async (id) => {
  await getPlanById(id);

  return prisma.plan.update({
    where: { id },
    data: { isActive: false },
  });
};

/**
 * Enforce Plan.minQuantity Requirement
 * 
 * Validates that requested quantity meets the plan's minimum quantity constraint.
 * Shared with Member 4 (Subscription Lifecycle & Quoting modules).
 * 
 * @param {string} planId - Plan UUID or Code
 * @param {number} requestedQuantity - Proposed quantity for subscription or quotation
 * @returns {Promise<{ isValid: boolean, plan: Object, requestedQuantity: number }>}
 */
export const validatePlanQuantity = async (planId, requestedQuantity) => {
  const plan = await getPlanById(planId);

  // 1. Availability check
  if (!plan.isActive) {
    throw new BadRequestError(`Subscription plan '${plan.name}' is currently inactive`);
  }

  const now = new Date();
  if (plan.availableFrom && now < new Date(plan.availableFrom)) {
    throw new BadRequestError(`Subscription plan '${plan.name}' is not yet available (starts ${plan.availableFrom})`);
  }

  if (plan.availableTo && now > new Date(plan.availableTo)) {
    throw new BadRequestError(`Subscription plan '${plan.name}' is no longer available (expired ${plan.availableTo})`);
  }

  // 2. Minimum Quantity Constraint Enforcement
  const qty = parseInt(requestedQuantity, 10);
  if (isNaN(qty) || qty < 1) {
    throw new BadRequestError('Subscription quantity must be a positive integer', null, 'INVALID_QUANTITY');
  }

  if (qty < plan.minQuantity) {
    throw new BadRequestError(
      `Requested quantity (${qty}) is below the minimum required quantity (${plan.minQuantity}) for plan '${plan.name}'`,
      [
        {
          field: 'quantity',
          message: `Minimum required quantity for plan '${plan.name}' is ${plan.minQuantity}`,
          minQuantity: plan.minQuantity,
          requestedQuantity: qty,
        },
      ],
      'PLAN_MIN_QUANTITY_NOT_MET'
    );
  }

  return {
    isValid: true,
    plan,
    requestedQuantity: qty,
  };
};

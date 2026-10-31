import prisma from '../config/db.js';
import { AppError, NotFoundError } from '../utils/appError.js';

/**
 * Subscription Plan Service
 * 
 * NOTE FOR MEMBER 3:
 * Awaits subscription plan model in schema.prisma.
 */

export const getAllPlans = async () => {
  if (!prisma?.plan) {
    throw new AppError('Plan model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.plan.findMany();
};

export const getPlanById = async (id) => {
  if (!prisma?.plan) {
    throw new AppError('Plan model awaiting Member 3 schema.prisma definition.', 503);
  }
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) throw new NotFoundError('Subscription plan not found');
  return plan;
};

export const createPlan = async (data) => {
  if (!prisma?.plan) {
    throw new AppError('Plan model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.plan.create({ data });
};

export const updatePlan = async (id, data) => {
  if (!prisma?.plan) {
    throw new AppError('Plan model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.plan.update({ where: { id }, data });
};

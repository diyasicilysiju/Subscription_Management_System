import prisma from '../config/db.js';
import { AppError, NotFoundError } from '../utils/appError.js';

/**
 * Customer Service
 * 
 * NOTE FOR MEMBER 3:
 * Awaits customer model in schema.prisma.
 */

export const getAllCustomers = async () => {
  if (!prisma?.customer) {
    throw new AppError('Customer model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.customer.findMany();
};

export const getCustomerById = async (id) => {
  if (!prisma?.customer) {
    throw new AppError('Customer model awaiting Member 3 schema.prisma definition.', 503);
  }
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new NotFoundError('Customer not found');
  return customer;
};

export const createCustomer = async (data) => {
  if (!prisma?.customer) {
    throw new AppError('Customer model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.customer.create({ data });
};

export const updateCustomer = async (id, data) => {
  if (!prisma?.customer) {
    throw new AppError('Customer model awaiting Member 3 schema.prisma definition.', 503);
  }
  return prisma.customer.update({ where: { id }, data });
};

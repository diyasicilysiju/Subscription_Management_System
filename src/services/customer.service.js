import prisma from '../config/db.js';
import { NotFoundError, ConflictError } from '../utils/appError.js';

/**
 * Customer Service
 * Uses the shared Prisma singleton client from src/config/db.js.
 */

/**
 * Retrieve all customers with search and pagination
 * @param {Object} query - { search, status, page, limit }
 */
export const getAllCustomers = async ({ search = '', status, page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * take;

  const where = {};

  if (status) {
    where.status = status.toUpperCase();
  }

  if (search) {
    where.OR = [
      { contactName: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            subscriptions: true,
            invoices: true,
            quotations: true,
          },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    meta: {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
};

/**
 * Retrieve a specific customer by UUID
 * @param {string} id 
 */
export const getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      subscriptions: {
        select: {
          id: true,
          subscriptionNumber: true,
          status: true,
          plan: { select: { id: true, name: true, billingInterval: true, price: true } },
          currentPeriodStart: true,
          currentPeriodEnd: true,
        },
      },
      invoices: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          amountDue: true,
          dueDate: true,
        },
      },
      _count: {
        select: {
          subscriptions: true,
          invoices: true,
          quotations: true,
          payments: true,
        },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError(`Customer with ID '${id}' not found`);
  }

  return customer;
};

/**
 * Create a new customer record
 * @param {Object} data 
 */
export const createCustomer = async (data) => {
  const contactName = data.contactName || data.name || 'Valued Customer';

  // Check email uniqueness
  const existing = await prisma.customer.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new ConflictError('A customer with this email address already exists');
  }

  return prisma.customer.create({
    data: {
      contactName,
      email: data.email,
      companyName: data.companyName || null,
      phone: data.phone || null,
      billingAddress: data.billingAddress || null,
      shippingAddress: data.shippingAddress || null,
      taxNumber: data.taxNumber || null,
      status: data.status ? data.status.toUpperCase() : 'ACTIVE',
    },
  });
};

/**
 * Update an existing customer
 * @param {string} id 
 * @param {Object} data 
 */
export const updateCustomer = async (id, data) => {
  await getCustomerById(id);

  const updatePayload = {};
  if (data.contactName || data.name) updatePayload.contactName = data.contactName || data.name;
  if (data.companyName !== undefined) updatePayload.companyName = data.companyName;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.billingAddress !== undefined) updatePayload.billingAddress = data.billingAddress;
  if (data.shippingAddress !== undefined) updatePayload.shippingAddress = data.shippingAddress;
  if (data.taxNumber !== undefined) updatePayload.taxNumber = data.taxNumber;
  if (data.status !== undefined) updatePayload.status = data.status.toUpperCase();

  return prisma.customer.update({
    where: { id },
    data: updatePayload,
  });
};

/**
 * Soft delete or remove customer
 * @param {string} id 
 */
export const deleteCustomer = async (id) => {
  const customer = await getCustomerById(id);

  // Soft delete by setting status to INACTIVE
  return prisma.customer.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
};

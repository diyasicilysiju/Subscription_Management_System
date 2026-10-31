import prisma from '../config/db.js';
import { ROLES, normalizeRole } from '../constants/roles.js';
import { ForbiddenError, NotFoundError } from '../utils/appError.js';

/**
 * Backend ownership rules for Member 4's modules.
 * Admin/Staff see everything; a Customer only ever sees their own records,
 * regardless of any customerId the frontend sends.
 */
export const isStaffOrAdmin = (user) => {
  const role = normalizeRole(user?.role);
  return role === ROLES.ADMIN || role === ROLES.STAFF;
};

/** Resolve the Customer.id that belongs to a logged-in customer user. */
export const resolveCustomerId = async (user) => {
  if (user?.customerId) return user.customerId;
  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!customer) throw new ForbiddenError('No customer profile is linked to this account');
  return customer.id;
};

/**
 * Prisma `where` fragment restricting a query to what the caller may see.
 * Staff/Admin may optionally narrow by ?customerId=.
 */
export const customerScope = async (user, requestedCustomerId) => {
  if (isStaffOrAdmin(user)) {
    return requestedCustomerId ? { customerId: requestedCustomerId } : {};
  }
  return { customerId: await resolveCustomerId(user) };
};

/**
 * Throw 404 (not 403, to avoid leaking existence) when a customer asks for a
 * record owned by someone else.
 */
export const assertCanAccess = async (user, record, label = 'Record') => {
  if (!record) throw new NotFoundError(`${label} not found`);
  if (isStaffOrAdmin(user)) return;
  const own = await resolveCustomerId(user);
  if (record.customerId !== own) throw new NotFoundError(`${label} not found`);
};

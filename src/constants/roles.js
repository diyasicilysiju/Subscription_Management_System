/**
 * User Roles for Brightloop Subscription Management System
 * Matches Prisma Schema Enum `Role` exactly: ADMIN, STAFF, CUSTOMER.
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
};

export const ALL_ROLES = Object.values(ROLES);

export const STAFF_OR_ADMIN = [ROLES.ADMIN, ROLES.STAFF];

/**
 * Normalize role strings (e.g. 'Admin' -> 'ADMIN', 'staff' -> 'STAFF')
 * @param {string} role 
 * @returns {string}
 */
export const normalizeRole = (role) => {
  if (!role) return ROLES.CUSTOMER;
  const upper = String(role).toUpperCase();
  if (ALL_ROLES.includes(upper)) return upper;
  return ROLES.CUSTOMER;
};

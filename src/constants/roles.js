/**
 * User Roles for Brightloop Subscription Management System
 * Role-Based Access Control (RBAC) Constants
 */
export const ROLES = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  CUSTOMER: 'Customer',
};

export const ALL_ROLES = Object.values(ROLES);

export const STAFF_OR_ADMIN = [ROLES.ADMIN, ROLES.STAFF];

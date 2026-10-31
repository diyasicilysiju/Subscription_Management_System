import { ForbiddenError, UnauthorizedError } from '../utils/appError.js';
import { ROLES, normalizeRole } from '../constants/roles.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Compares user's role against allowed roles in a case-insensitive manner.
 * Must be mounted AFTER the `authenticate` middleware.
 * 
 * @param  {...string} allowedRoles - E.g. 'ADMIN', 'STAFF' or 'Admin', 'Staff'
 * @returns {import('express').RequestHandler}
 */
export const authorize = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User is not authenticated'));
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.includes(userRole)) {
      return next(
        new ForbiddenError(
          `Access forbidden: You do not have permission to perform this action. Required role: ${allowedRoles.join(' or ')}`
        )
      );
    }

    return next();
  };
};

/**
 * Ownership or Staff/Admin Access Middleware
 * 
 * Allows Admin and Staff full access, but restricts Customers
 * strictly to their own resources.
 * 
 * @param {string} paramKey - Key in req.params (e.g. 'id' or 'customerId')
 */
export const authorizeOwnerOrStaff = (paramKey = 'id') => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User is not authenticated'));
    }

    const userRole = normalizeRole(req.user.role);

    // Admin and Staff have full administrative access
    if (userRole === ROLES.ADMIN || userRole === ROLES.STAFF) {
      return next();
    }

    // Customer can only access their own resources
    const targetId = req.params[paramKey] || req.query[paramKey] || req.body[paramKey];

    const isOwner =
      targetId === req.user.id ||
      targetId === req.user.customerId;

    if (!isOwner) {
      return next(
        new ForbiddenError('Access forbidden: Customers can only access their own records')
      );
    }

    return next();
  };
};

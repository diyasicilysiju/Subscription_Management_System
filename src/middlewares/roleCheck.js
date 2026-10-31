import { ForbiddenError, UnauthorizedError } from '../utils/appError.js';
import { ROLES } from '../constants/roles.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Must be mounted AFTER the `authenticate` middleware.
 * 
 * @param  {...string} allowedRoles - E.g. 'Admin', 'Staff'
 * @returns {import('express').RequestHandler}
 */
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User is not authenticated'));
    }

    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
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
 * strictly to their own resources (matching customer ID in params or body).
 * 
 * @param {string} paramKey - Key in req.params (e.g. 'customerId' or 'id')
 */
export const authorizeOwnerOrStaff = (paramKey = 'customerId') => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User is not authenticated'));
    }

    const { role, id } = req.user;

    // Admin and Staff have full administrative access
    if (role === ROLES.ADMIN || role === ROLES.STAFF) {
      return next();
    }

    // Customer can only access their own resource
    const targetId = req.params[paramKey] || req.query[paramKey] || req.body[paramKey];

    if (role === ROLES.CUSTOMER && targetId && targetId !== id) {
      return next(
        new ForbiddenError('Access forbidden: Customers can only access their own resources')
      );
    }

    return next();
  };
};

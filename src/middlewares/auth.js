import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/appError.js';

/**
 * JWT Authentication Middleware
 * 
 * Verifies the Bearer token in the Authorization header.
 * Attaches the authenticated user payload to req.user.
 */
export const authenticate = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token is required. Format: Bearer <token>'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Malformed authorization header. Bearer token missing.'));
  }

  try {
    const decoded = verifyToken(token);
    // Attach decoded user information (id, email, role) to request
    req.user = decoded;
    return next();
  } catch (error) {
    return next(error);
  }
};

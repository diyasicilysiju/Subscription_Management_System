import { ZodError } from 'zod';
import { AppError, NotFoundError } from '../utils/appError.js';
import { sendError } from '../utils/apiResponse.js';
import { config } from '../config/env.js';

/**
 * 404 Not Found Middleware
 * Catches all unmatched routes and forwards a NotFoundError to the centralized error handler.
 */
export const notFoundHandler = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralized Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;
  let code = err.code || null;

  // 1. Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Request validation failed';
    code = 'VALIDATION_ERROR';
    errors = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }

  // 2. Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
    code = 'TOKEN_EXPIRED';
  }

  // 3. Handle Malformed JSON payload
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body';
    code = 'INVALID_JSON';
  }

  // Log unexpected server errors in development
  if (!err.isOperational && statusCode === 500) {
    console.error('💥 UNHANDLED SERVER ERROR:', err);
  }

  // Include stack trace only in non-production environments when unexpected
  if (!config.isProduction && statusCode === 500) {
    errors = errors || { stack: err.stack };
  }

  return sendError(res, {
    statusCode,
    message,
    errors,
    code,
  });
};

/**
 * Custom Operational Application Error Class
 * 
 * Used throughout the app to throw predictable, operational errors
 * that the centralized error handler transforms into standard HTTP responses.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} statusCode - HTTP Status code (400, 401, 403, 404, 409, etc.)
   * @param {any} [errors=null] - Specific field or validation errors
   * @param {string} [code=null] - Machine-readable error code
   */
  constructor(message, statusCode = 500, errors = null, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors = null, code = 'BAD_REQUEST') {
    super(message, 400, errors, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', errors = null, code = 'UNAUTHORIZED') {
    super(message, 401, errors, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden: Insufficient permissions', errors = null, code = 'FORBIDDEN') {
    super(message, 403, errors, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errors = null, code = 'NOT_FOUND') {
    super(message, 404, errors, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errors = null, code = 'CONFLICT') {
    super(message, 409, errors, code);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null, code = 'VALIDATION_ERROR') {
    super(message, 422, errors, code);
  }
}

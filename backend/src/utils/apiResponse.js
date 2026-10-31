/**
 * Consistent API Response Helper Functions
 * 
 * Standardizes all responses sent to Member 1 (Frontend UI)
 * and Member 4 (Lifecycle integrations).
 */

/**
 * Send a standardized success response
 * @param {import('express').Response} res - Express response object
 * @param {Object} options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {string} [options.message='Success'] - Descriptive human-readable message
 * @param {any} [options.data=null] - The payload to return
 * @param {Object} [options.meta=null] - Optional pagination or metadata
 */
export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== null && meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Send a standardized error response
 * @param {import('express').Response} res - Express response object
 * @param {Object} options
 * @param {number} [options.statusCode=500] - HTTP status code
 * @param {string} [options.message='An error occurred'] - Human-readable error message
 * @param {any} [options.errors=null] - Detailed validation or field error array/object
 * @param {string} [options.code=null] - Machine-readable error code (e.g. 'UNAUTHORIZED')
 */
export const sendError = (res, { statusCode = 500, message = 'An error occurred', errors = null, code = null } = {}) => {
  const payload = {
    success: false,
    message,
  };

  if (errors !== null && errors !== undefined) {
    payload.errors = errors;
  }

  if (code !== null && code !== undefined) {
    payload.code = code;
  }

  return res.status(statusCode).json(payload);
};

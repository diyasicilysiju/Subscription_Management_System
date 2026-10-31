/**
 * Reusable Zod Validation Middleware
 * 
 * Supports:
 * - Direct Zod schema (ZodObject, ZodEffects, etc.) -> validates req.body
 * - Wrapper object { body, query, params } -> validates corresponding request properties
 * 
 * @param {import('zod').ZodTypeAny | { body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schema
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema) => async (req, _res, next) => {
  try {
    // If schema specifies explicit sub-properties { body, query, params }
    if (schema && (schema.body || schema.query || schema.params)) {
      if (schema.body && typeof schema.body.parseAsync === 'function') {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query && typeof schema.query.parseAsync === 'function') {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params && typeof schema.params.parseAsync === 'function') {
        req.params = await schema.params.parseAsync(req.params);
      }
      return next();
    }

    // Otherwise, validate req.body directly using the Zod schema
    if (schema && typeof schema.parseAsync === 'function') {
      req.body = await schema.parseAsync(req.body);
      return next();
    }

    return next();
  } catch (error) {
    // Forward ZodError to centralized error handler
    return next(error);
  }
};

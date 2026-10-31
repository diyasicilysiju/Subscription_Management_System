import { ZodObject } from 'zod';

/**
 * Reusable Zod Validation Middleware
 * 
 * Supports validating:
 * - A single Zod object (defaults to validating req.body)
 * - An object containing { body, query, params } schemas
 * 
 * @param {import('zod').ZodSchema | { body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schema
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema) => async (req, _res, next) => {
  try {
    // If schema is a direct Zod schema, assume validating req.body
    if (schema instanceof ZodObject) {
      req.body = await schema.parseAsync(req.body);
      return next();
    }

    // Otherwise, check for specific parts: body, query, params
    if (schema.body) {
      req.body = await schema.body.parseAsync(req.body);
    }
    if (schema.query) {
      req.query = await schema.query.parseAsync(req.query);
    }
    if (schema.params) {
      req.params = await schema.params.parseAsync(req.params);
    }

    return next();
  } catch (error) {
    // Forward ZodError directly to the centralized error handler
    return next(error);
  }
};

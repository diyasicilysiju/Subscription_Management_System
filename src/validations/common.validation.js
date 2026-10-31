import { z } from 'zod';
import { BadRequestError } from '../utils/appError.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuid = (label = 'id') => z.string({ required_error: `${label} is required` }).regex(UUID_RE, `${label} must be a valid UUID`);

/** Accepts ISO datetimes or plain YYYY-MM-DD dates and yields a Date. */
export const dateInput = z
  .union([z.string(), z.date()])
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Must be a valid date')
  .transform((v) => new Date(v));

export const money = (label = 'Amount') =>
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).finite().min(0, `${label} cannot be negative`);

/** Router-level guard: every `:id` style param must be a UUID (Prisma throws otherwise). */
export const requireUuidParams = (...names) => (req, _res, next) => {
  for (const name of names) {
    if (req.params[name] && !UUID_RE.test(req.params[name])) {
      return next(new BadRequestError(`Invalid ${name}: must be a UUID`, [{ field: name, message: 'Must be a valid UUID' }]));
    }
  }
  return next();
};

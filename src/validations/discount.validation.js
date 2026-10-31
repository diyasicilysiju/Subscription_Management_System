import { z } from 'zod';
import { dateInput, uuid } from './common.validation.js';

/**
 * Accept the frontend's field names (minOrderAmount, maxRedemptions, startDate,
 * endDate) as aliases of the schema's (minPurchaseAmount, maxUses, validFrom,
 * validTo). Empty strings from untouched form fields are treated as "not set".
 */
const ALIASES = {
  minOrderAmount: 'minPurchaseAmount',
  maxRedemptions: 'maxUses',
  startDate: 'validFrom',
  endDate: 'validTo',
};

const normalise = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const target = ALIASES[key] ?? key;
    if (value === '' || value === undefined) continue;
    if (!(target in out) || target === key) out[target] = value;
  }
  if (typeof out.code === 'string') out.code = out.code.trim().toUpperCase();
  if (typeof out.type === 'string') out.type = out.type.trim().toUpperCase();
  return out;
};

const optionalInt = z.coerce.number().int('Must be a whole number').min(1, 'Must be at least 1').optional().nullable();

const base = z.object({
  name: z.string({ required_error: 'Discount name is required' }).trim().min(2, 'Discount name is too short'),
  code: z.string({ required_error: 'Discount code is required' }).trim().min(2, 'Discount code is too short'),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT'], { errorMap: () => ({ message: 'Type must be PERCENTAGE or FIXED_AMOUNT' }) }),
  value: z.coerce.number({ required_error: 'Discount value is required', invalid_type_error: 'Discount value must be a number' }).gt(0, 'Discount value must be greater than 0'),
  minPurchaseAmount: z.coerce.number().min(0, 'Minimum purchase cannot be negative').optional().nullable(),
  minQuantity: optionalInt,
  maxUses: optionalInt,
  maxUsesPerCustomer: optionalInt,
  validFrom: dateInput.optional().nullable(),
  validTo: dateInput.optional().nullable(),
  isActive: z.boolean().optional(),
  productIds: z.array(uuid('productId')).optional(),
  planIds: z.array(uuid('planId')).optional(),
});

const crossChecks = (data, ctx) => {
  if (data.type === 'PERCENTAGE' && data.value > 100) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percentage discounts cannot exceed 100' });
  }
  if (data.validFrom && data.validTo && data.validTo <= data.validFrom) {
    ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'End date must be after the start date' });
  }
};

export const createDiscountSchema = z.preprocess(normalise, base.superRefine(crossChecks));

// type/value cross-check for partial updates is repeated in the service where current values are known
export const updateDiscountSchema = z.preprocess(
  normalise,
  base.partial().superRefine((data, ctx) => {
    if (data.type === 'PERCENTAGE' && data.value !== undefined && data.value > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percentage discounts cannot exceed 100' });
    }
    if (data.validFrom && data.validTo && data.validTo <= data.validFrom) {
      ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'End date must be after the start date' });
    }
  })
);

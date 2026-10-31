import { z } from 'zod';

export const createTaxSchema = z.object({
  name: z.string({ required_error: 'Tax name is required' }).trim().min(2, 'Tax name is too short'),
  code: z.string({ required_error: 'Tax code is required' }).trim().toUpperCase().min(2, 'Tax code is too short'),
  rate: z.coerce
    .number({ required_error: 'Tax rate is required', invalid_type_error: 'Tax rate must be a number' })
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%'),
  description: z.string().trim().optional().nullable(),
  isCompound: z.boolean().optional().default(false),
  isDefault: z.boolean().optional().default(false), // the tax applied automatically to lines without an explicit rate
  isActive: z.boolean().optional().default(true),
});

export const updateTaxSchema = createTaxSchema.partial().extend({
  // partial() would keep the .default() values and silently reset flags on update
  isCompound: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

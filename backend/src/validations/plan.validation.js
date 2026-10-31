import { z } from 'zod';

export const BILLING_INTERVALS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export const createPlanSchema = z.object({
  name: z.string({ required_error: 'Plan name is required' }).trim().min(2),
  code: z
    .string({ required_error: 'Plan code is required' })
    .trim()
    .toUpperCase()
    .min(2),
  description: z.string().trim().optional(),
  billingInterval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
    required_error: 'Billing interval must be DAILY, WEEKLY, MONTHLY, or YEARLY',
  }),
  intervalCount: z.number().int().min(1).optional().default(1),
  price: z.number({ required_error: 'Plan price is required' }).min(0),
  currency: z.string().trim().optional().default('USD'),
  trialDays: z.number().int().min(0).optional().default(0),
  minQuantity: z.number({ required_error: 'Minimum quantity is required' }).int().min(1).default(1),
  availableFrom: z.string().datetime().optional().nullable(),
  availableTo: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updatePlanSchema = createPlanSchema.partial();

export const validateQuantitySchema = z.object({
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
});

import { z } from 'zod';

export const BILLING_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export const createPlanSchema = z.object({
  name: z.string({ required_error: 'Plan name is required' }).trim().min(2),
  description: z.string().optional(),
  billingFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
    required_error: 'Billing frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY',
  }),
  price: z.number({ required_error: 'Plan price is required' }).min(0),
  minQuantity: z.number().int().min(1).default(1),
  isAvailable: z.boolean().default(true),
  allowPause: z.boolean().default(true),
  allowRenewal: z.boolean().default(true),
  autoCloseDays: z.number().int().min(0).optional(),
});

export const updatePlanSchema = createPlanSchema.partial();

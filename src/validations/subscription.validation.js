import { z } from 'zod';
import { dateInput, money, uuid } from './common.validation.js';

const subscriptionItem = z.object({
  variantId: uuid('variantId'),
  quantity: z.coerce.number({ required_error: 'Quantity is required' }).int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
  unitPrice: money('Unit price').optional(),
});

export const createSubscriptionSchema = z.object({
  customerId: uuid('customerId'),
  planId: uuid('planId'),
  items: z.array(subscriptionItem, { required_error: 'At least one subscription line is required' }).min(1, 'At least one subscription line is required'),
  startDate: dateInput.optional(),
  endDate: dateInput.optional().nullable(),
  autoRenew: z.boolean().optional().default(true),
  notes: z.string().trim().max(2000).optional().nullable(),
  // New subscriptions go live immediately unless the caller explicitly wants a PENDING (confirmed) one.
  activate: z.boolean().optional().default(true),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

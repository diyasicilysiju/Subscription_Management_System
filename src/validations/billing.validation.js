import { z } from 'zod';
import { dateInput, uuid } from './common.validation.js';

export const runBillingSchema = z.object({
  targetDate: dateInput.optional(), // bill everything due on or before this date (default: now)
  subscriptionId: uuid('subscriptionId').optional(), // bill just one subscription
  autoConfirm: z.boolean().optional().default(false), // issue straight away instead of leaving DRAFT invoices
});

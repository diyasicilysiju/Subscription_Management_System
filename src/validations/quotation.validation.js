import { z } from 'zod';
import { dateInput, money, uuid } from './common.validation.js';

const quotationItem = z
  .object({
    planId: uuid('planId').optional().nullable(),
    variantId: uuid('variantId').optional().nullable(),
    description: z.string().trim().min(1).max(300).optional(),
    quantity: z.coerce.number({ required_error: 'Quantity is required' }).int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
    unitPrice: money('Unit price').optional(),
    discountAmount: money('Discount').optional(),
    taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').optional(),
  })
  .refine((i) => i.variantId || i.planId || (i.description && i.unitPrice !== undefined), {
    message: 'Each line needs a variantId, a planId, or a description with a unitPrice',
  });

export const createQuotationSchema = z
  .object({
    customerId: uuid('customerId'),
    planId: uuid('planId').optional(), // default plan for lines that do not set their own
    validUntil: dateInput.optional(),
    validDays: z.coerce.number().int().min(1).max(365).optional(),
    items: z.array(quotationItem, { required_error: 'At least one quotation line is required' }).min(1, 'At least one quotation line is required'),
    notes: z.string().trim().max(2000).optional().nullable(),
    terms: z.string().trim().max(4000).optional().nullable(),
  });

export const convertQuotationSchema = z.object({
  activate: z.boolean().optional().default(true),
  startDate: dateInput.optional(),
  endDate: dateInput.optional().nullable(),
  autoRenew: z.boolean().optional().default(true),
});

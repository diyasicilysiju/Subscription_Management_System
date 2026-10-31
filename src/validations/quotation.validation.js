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
    templateId: uuid('templateId').optional(), // start from a quotation template; its plan, lines, validity, notes and terms are the defaults
    planId: uuid('planId').optional(), // default plan for lines that do not set their own
    validUntil: dateInput.optional(),
    validDays: z.coerce.number().int().min(1).max(365).optional(),
    items: z.array(quotationItem).min(1, 'At least one quotation line is required').optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    terms: z.string().trim().max(4000).optional().nullable(),
  })
  .refine((q) => q.templateId || q.items, { message: 'Provide quotation lines, or a templateId to take them from', path: ['items'] });

export const convertQuotationSchema = z.object({
  activate: z.boolean().optional().default(true),
  startDate: dateInput.optional(),
  endDate: dateInput.optional().nullable(),
  autoRenew: z.boolean().optional().default(true),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
});

/* ---- quotation templates ---- */

const templateItem = z.object({
  variantId: uuid('variantId'),
  quantity: z.coerce.number({ required_error: 'Quantity is required' }).int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
  description: z.string().trim().min(1).max(300).optional().nullable(),
  unitPrice: money('Unit price').optional().nullable(), // omit = the variant's current price
});

export const createTemplateSchema = z.object({
  name: z.string({ required_error: 'Template name is required' }).trim().min(2, 'Template name is too short'),
  code: z.string({ required_error: 'Template code is required' }).trim().toUpperCase().min(2, 'Template code is too short'),
  description: z.string().trim().max(1000).optional().nullable(),
  planId: uuid('planId'),
  validityDays: z.coerce.number().int().min(1, 'Validity must be at least 1 day').max(365).optional().default(30),
  items: z.array(templateItem, { required_error: 'A template needs at least one line' }).min(1, 'A template needs at least one line'),
  notes: z.string().trim().max(2000).optional().nullable(),
  terms: z.string().trim().max(4000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  validityDays: z.coerce.number().int().min(1).max(365).optional(),
  isActive: z.boolean().optional(),
});

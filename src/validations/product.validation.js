import { z } from 'zod';

export const productVariantSchema = z.object({
  name: z.string({ required_error: 'Variant name is required' }).trim().min(1),
  sku: z.string().optional(),
  salesPrice: z.number({ required_error: 'Variant sales price is required' }).min(0),
  costPrice: z.number().min(0).optional().default(0),
  attributes: z.record(z.any()).optional(),
});

export const createProductSchema = z.object({
  name: z.string({ required_error: 'Product name is required' }).trim().min(2),
  description: z.string().optional(),
  salesPrice: z.number({ required_error: 'Sales price is required' }).min(0),
  costPrice: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
  variants: z.array(productVariantSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

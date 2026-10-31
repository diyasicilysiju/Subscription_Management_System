import { z } from 'zod';

export const productVariantSchema = z.object({
  name: z.string({ required_error: 'Variant name is required' }).trim().min(1),
  sku: z.string({ required_error: 'Variant SKU is required' }).trim().min(1),
  price: z.number({ required_error: 'Variant price is required' }).min(0),
  costPrice: z.number().min(0).optional().default(0),
  priceAdjustment: z.number().optional().default(0),
  attributes: z.record(z.any()).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateVariantSchema = productVariantSchema.partial();

export const createProductSchema = z.object({
  name: z.string({ required_error: 'Product name is required' }).trim().min(2),
  description: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  salesPrice: z.number({ required_error: 'Sales price is required' }).min(0),
  costPrice: z.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  variants: z.array(productVariantSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

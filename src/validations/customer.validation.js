import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string({ required_error: 'Customer name is required' }).trim().min(2),
  email: z.string({ required_error: 'Customer email is required' }).email().trim().toLowerCase(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

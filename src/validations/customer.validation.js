import { z } from 'zod';

export const createCustomerSchema = z.object({
  contactName: z.string().trim().min(2, 'Contact name must be at least 2 characters').optional(),
  name: z.string().trim().min(2).optional(),
  email: z.string({ required_error: 'Customer email is required' }).email('Invalid email format').trim().toLowerCase(),
  companyName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  billingAddress: z.string().trim().optional(),
  shippingAddress: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
}).refine((data) => data.contactName || data.name, {
  message: 'Either contactName or name is required',
  path: ['contactName'],
});

export const updateCustomerSchema = z.object({
  contactName: z.string().trim().min(2).optional(),
  name: z.string().trim().min(2).optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  companyName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  billingAddress: z.string().trim().optional(),
  shippingAddress: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

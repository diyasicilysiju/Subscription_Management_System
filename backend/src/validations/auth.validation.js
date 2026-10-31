import { z } from 'zod';
import { ROLES, normalizeRole } from '../constants/roles.js';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  role: z
    .string()
    .optional()
    .transform((val) => normalizeRole(val)),
}).refine((data) => data.name || data.firstName, {
  message: 'Either name or firstName must be provided',
  path: ['firstName'],
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

export const createStaffSchema = z.object({
  email: z
    .string({ required_error: 'Staff email is required' })
    .email('Invalid email address format')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  name: z.string().trim().min(2).optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  role: z.string().optional().default(ROLES.STAFF).transform(() => ROLES.STAFF),
}).refine((data) => data.name || data.firstName, {
  message: 'Either name or firstName must be provided',
  path: ['firstName'],
});

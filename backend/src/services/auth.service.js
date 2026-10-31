import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/appError.js';
import { ROLES } from '../constants/roles.js';

/**
 * Authentication Service
 * Uses the shared Prisma singleton client from src/config/db.js.
 * Operates on the Prisma User and Customer models.
 */

/**
 * Register a new user (defaults to CUSTOMER role)
 * Also creates an associated Customer profile if role is CUSTOMER.
 * @param {Object} input - { email, password, name, firstName, lastName, phone, role }
 */
export const registerUser = async ({ email, password, name, firstName, lastName, phone, role = ROLES.CUSTOMER }) => {
  // 1. Resolve first and last names
  let fName = firstName;
  let lName = lastName;
  if (!fName && name) {
    const parts = name.trim().split(' ');
    fName = parts[0] || 'User';
    lName = parts.slice(1).join(' ') || '';
  }

  // 2. Check if user with email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('An account with this email address already exists');
  }

  // 3. Hash password securely
  const hashedPassword = await hashPassword(password);

  // 4. Create user in database (with customer profile if CUSTOMER role)
  const isCustomer = role === ROLES.CUSTOMER;

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: fName || 'User',
      lastName: lName || '',
      phone: phone || null,
      role: role || ROLES.CUSTOMER,
      ...(isCustomer
        ? {
            customer: {
              create: {
                contactName: `${fName || ''} ${lName || ''}`.trim() || 'Valued Customer',
                email,
                phone: phone || null,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      createdAt: true,
      customer: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          status: true,
        },
      },
    },
  });

  // 5. Generate signed JWT token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    customerId: user.customer?.id || null,
  });

  return { user, token };
};

/**
 * Authenticate user with email and password
 * @param {Object} input - { email, password }
 */
export const loginUser = async ({ email, password }) => {
  // 1. Find user by email including linked customer profile
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      customer: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          status: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password', null, 'INVALID_CREDENTIALS');
  }

  // 2. Verify hashed password
  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password', null, 'INVALID_CREDENTIALS');
  }

  // 3. Generate JWT token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    customerId: user.customer?.id || null,
  });

  // Exclude password hash from response
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

/**
 * Fetch current user profile by ID
 * @param {string} userId
 */
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      customer: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          billingAddress: true,
          shippingAddress: true,
          taxNumber: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User profile not found');
  }

  return user;
};

/**
 * Create a staff user (Admin only operation)
 * @param {Object} input - { email, password, name, firstName, lastName, phone }
 */
export const createStaffUser = async (input) => {
  return registerUser({
    ...input,
    role: ROLES.STAFF,
  });
};

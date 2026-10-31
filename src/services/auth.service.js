import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '../utils/appError.js';
import { ROLES } from '../constants/roles.js';

/**
 * Authentication Service
 * 
 * NOTE FOR MEMBER 3 (Database Lead):
 * This service implements the business rules, password hashing, and JWT issuance.
 * The database queries below interact via the Prisma client stub. Once Member 3
 * defines the User model in schema.prisma and runs `npx prisma generate`,
 * verify that the model name (e.g., prisma.user) and fields match:
 * - email (String, unique)
 * - password (String, hashed)
 * - name (String)
 * - role (String/Enum: 'Admin' | 'Staff' | 'Customer')
 */

/**
 * Register a new user (defaults to Customer role)
 * @param {Object} input - { email, password, name, role }
 */
export const registerUser = async ({ email, password, name, role = ROLES.CUSTOMER }) => {
  // Check if database client is ready
  if (!prisma?.user) {
    throw new AppError(
      'Database is awaiting Member 3 schema.prisma integration. User model is not yet compiled.',
      503,
      null,
      'DATABASE_PENDING_SCHEMA'
    );
  }

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('An account with this email address already exists');
  }

  // 2. Hash password securely
  const hashedPassword = await hashPassword(password);

  // 3. Create user in database
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role || ROLES.CUSTOMER,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  // 4. Generate JWT token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, token };
};

/**
 * Authenticate user with email and password
 * @param {Object} input - { email, password }
 */
export const loginUser = async ({ email, password }) => {
  if (!prisma?.user) {
    throw new AppError(
      'Database is awaiting Member 3 schema.prisma integration. User model is not yet compiled.',
      503,
      null,
      'DATABASE_PENDING_SCHEMA'
    );
  }

  // 1. Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
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
  if (!prisma?.user) {
    throw new AppError(
      'Database is awaiting Member 3 schema.prisma integration.',
      503,
      null,
      'DATABASE_PENDING_SCHEMA'
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User profile not found');
  }

  return user;
};

/**
 * Create a staff user (Admin only operation)
 * @param {Object} input - { email, password, name }
 */
export const createStaffUser = async ({ email, password, name }) => {
  return registerUser({
    email,
    password,
    name,
    role: ROLES.STAFF,
  });
};

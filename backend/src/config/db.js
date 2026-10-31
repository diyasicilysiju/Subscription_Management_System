import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma Singleton Client
 * Configured per Member 3's database architecture.
 * Shared across all backend services and controllers.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

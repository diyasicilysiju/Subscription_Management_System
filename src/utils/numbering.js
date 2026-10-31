import prisma from '../config/db.js';

/**
 * Human readable document numbers: PREFIX-YYYY-NNNN (QUO-2026-0001, INV-2026-0003, ...).
 * Computed as "highest existing + 1" inside the caller's transaction; a concurrent
 * request that picks the same number hits the unique index and the whole
 * transaction is retried by `withNumberRetry`.
 */
export const nextNumber = async (db, model, field, prefix) => {
  const stem = `${prefix}-${new Date().getUTCFullYear()}-`;
  const last = await db[model].findFirst({
    where: { [field]: { startsWith: stem } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  });
  const next = last ? parseInt(last[field].slice(stem.length), 10) + 1 : 1;
  return `${stem}${String(next).padStart(4, '0')}`;
};

const isNumberCollision = (error, field) =>
  error?.code === 'P2002' && String(error.meta?.target ?? '').includes(field);

/** Re-run a whole transaction when only the document-number unique index collided. */
export const withNumberRetry = async (field, work, attempts = 12) => {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isNumberCollision(error, field)) throw error;
      lastError = error;
      // small random pause so racing requests stop picking the same number in lockstep
      await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 40));
    }
  }
  throw lastError;
};

export const transaction = (work, options = { timeout: 30000, maxWait: 10000 }) =>
  prisma.$transaction(work, options);

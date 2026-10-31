import { Prisma } from '@prisma/client';

/**
 * Money helpers (Member 4).
 * All currency maths uses Prisma/decimal.js Decimals, never floats.
 */
const { Decimal } = Prisma;

export const D = (value) => new Decimal(value ?? 0);

export const round2 = (value) => D(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export const sum = (values) => values.reduce((total, v) => total.plus(D(v)), D(0));

/** amount * pct / 100, rounded to cents */
export const percentOf = (amount, pct) => round2(D(amount).mul(D(pct)).div(100));

export const minDecimal = (a, b) => (D(a).lessThan(D(b)) ? D(a) : D(b));

/**
 * Deep-convert Decimals to JS numbers so JSON responses carry numeric money
 * values (the frontend formats them with toFixed/Intl, not as strings).
 */
export const plain = (value) => {
  if (value === null || value === undefined) return value;
  if (Decimal.isDecimal(value)) return value.toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  }
  return value;
};

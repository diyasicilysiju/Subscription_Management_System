import prisma from '../config/db.js';
import { config } from '../config/env.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/appError.js';
import { D } from '../utils/money.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';

/**
 * Tax Service (Member 4) - admin-configurable tax rates.
 */
export const listTaxes = async (query = {}) => {
  const where = {};
  if (query.isActive !== undefined && query.isActive !== '') where.isActive = String(query.isActive) === 'true';
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const pager = parsePagination(query, { defaultLimit: 50 });
  const [taxes, total] = await Promise.all([
    prisma.tax.findMany({ where, orderBy: [{ isActive: 'desc' }, { name: 'asc' }], skip: pager.skip, take: pager.take }),
    prisma.tax.count({ where }),
  ]);
  return { taxes, meta: buildMeta(pager, total) };
};

export const getTax = async (id) => {
  const tax = await prisma.tax.findUnique({ where: { id } });
  if (!tax) throw new NotFoundError('Tax not found');
  return tax;
};

export const createTax = async (data) => {
  const existing = await prisma.tax.findUnique({ where: { code: data.code } });
  if (existing) throw new ConflictError(`Tax with code '${data.code}' already exists`);
  return prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.tax.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    return tx.tax.create({ data: { ...data, isDefault: Boolean(data.isDefault), isActive: data.isDefault ? true : data.isActive } });
  });
};

export const updateTax = async (id, data) => {
  const current = await getTax(id);
  if (data.code) {
    const clash = await prisma.tax.findFirst({ where: { code: data.code, NOT: { id } } });
    if (clash) throw new ConflictError(`Tax with code '${data.code}' already exists`);
  }
  if (data.isActive === false && (data.isDefault ?? current.isDefault)) {
    throw new BadRequestError('The default tax cannot be deactivated; make another tax the default first');
  }
  // Rate changes never touch existing invoices: invoice lines store their own taxRate snapshot.
  return prisma.$transaction(async (tx) => {
    // At most one default: promoting this tax demotes the previous one in the same transaction.
    if (data.isDefault) await tx.tax.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } });
    return tx.tax.update({ where: { id }, data: data.isDefault ? { ...data, isActive: true } : data });
  });
};

/**
 * The tax applied automatically when a line carries no explicit rate: the active tax
 * flagged isDefault. Databases that have not flagged one yet fall back to the active
 * tax whose code is DEFAULT_TAX_CODE (default 'TAX-US-STD'); with no match the rate is 0.
 */
export const getDefaultTaxRate = async (db = prisma) => {
  const flagged = await db.tax.findFirst({ where: { isDefault: true, isActive: true } });
  if (flagged) return D(flagged.rate);
  const code = process.env.DEFAULT_TAX_CODE || config.defaultTaxCode || 'TAX-US-STD';
  const tax = await db.tax.findFirst({ where: { code, isActive: true } });
  return tax ? D(tax.rate) : D(0);
};

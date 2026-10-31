import prisma from '../config/db.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/appError.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import { validatePlanQuantity } from './plan.service.js';

/**
 * Quotation Template Service (Member 4)
 *
 * A template is a ready-made starting point for a sales rep: the right plan and product
 * lines, valid for a set number of days. Staff start a quotation from one with
 * POST /quotations { templateId, customerId }; only the Admin manages templates.
 */

const detailInclude = {
  plan: { select: { id: true, name: true, code: true, billingInterval: true, minQuantity: true, price: true, isActive: true } },
  items: {
    orderBy: { createdAt: 'asc' },
    include: { variant: { select: { id: true, name: true, sku: true, price: true, isActive: true, product: { select: { id: true, name: true } } } } },
  },
};

export const listTemplates = async (query = {}) => {
  const where = {};
  if (query.isActive !== undefined && query.isActive !== '') where.isActive = String(query.isActive) === 'true';
  if (query.planId) where.planId = query.planId;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const pager = parsePagination(query, { defaultLimit: 50 });
  const [templates, total] = await Promise.all([
    prisma.quotationTemplate.findMany({ where, include: detailInclude, orderBy: [{ isActive: 'desc' }, { name: 'asc' }], skip: pager.skip, take: pager.take }),
    prisma.quotationTemplate.count({ where }),
  ]);
  return { templates, meta: buildMeta(pager, total) };
};

export const getTemplate = async (id) => {
  const template = await prisma.quotationTemplate.findUnique({ where: { id }, include: detailInclude });
  if (!template) throw new NotFoundError('Quotation template not found');
  return template;
};

/** Plan and variants must exist, variants must be active, and the lines must satisfy Plan.minQuantity. */
const assertTemplateIsUsable = async (planId, items) => {
  const variantIds = [...new Set(items.map((i) => i.variantId))];
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, isActive: true } });
  if (variants.length !== variantIds.length) throw new BadRequestError('One or more product variants do not exist');
  if (variants.some((v) => !v.isActive)) throw new BadRequestError('One or more product variants are inactive');
  await validatePlanQuantity(planId, items.reduce((total, i) => total + i.quantity, 0)); // 404 if the plan is missing
};

const toItemRows = (items) =>
  items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, description: i.description ?? null, unitPrice: i.unitPrice ?? null }));

export const createTemplate = async (data, actorId) => {
  const clash = await prisma.quotationTemplate.findUnique({ where: { code: data.code } });
  if (clash) throw new ConflictError(`Template with code '${data.code}' already exists`);
  await assertTemplateIsUsable(data.planId, data.items);

  const { items, ...fields } = data;
  const created = await prisma.$transaction(async (tx) => {
    const template = await tx.quotationTemplate.create({ data: { ...fields, items: { create: toItemRows(items) } } });
    await tx.auditLog.create({ data: { userId: actorId, action: 'QUOTATION_TEMPLATE_CREATED', entity: 'QuotationTemplate', entityId: template.id, details: { code: template.code } } });
    return template;
  });
  return getTemplate(created.id);
};

export const updateTemplate = async (id, data, actorId) => {
  const current = await getTemplate(id);
  if (data.code && data.code !== current.code) {
    const clash = await prisma.quotationTemplate.findFirst({ where: { code: data.code, NOT: { id } } });
    if (clash) throw new ConflictError(`Template with code '${data.code}' already exists`);
  }
  const { items, ...fields } = data;
  const planId = fields.planId ?? current.planId;
  const lines = items ?? current.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  if (items || fields.planId) await assertTemplateIsUsable(planId, lines);

  await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.quotationTemplateItem.deleteMany({ where: { templateId: id } });
      await tx.quotationTemplateItem.createMany({ data: toItemRows(items).map((row) => ({ ...row, templateId: id })) });
    }
    await tx.quotationTemplate.update({ where: { id }, data: fields });
    await tx.auditLog.create({ data: { userId: actorId, action: 'QUOTATION_TEMPLATE_UPDATED', entity: 'QuotationTemplate', entityId: id, details: { fields: Object.keys(data) } } });
  });
  return getTemplate(id);
};

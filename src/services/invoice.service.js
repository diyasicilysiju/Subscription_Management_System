import prisma from '../config/db.js';
import { ConflictError, NotFoundError } from '../utils/appError.js';
import { buildMeta, parseDateRange, parsePagination } from '../utils/pagination.js';
import { assertCanAccess, customerScope, isStaffOrAdmin } from './access.service.js';
import { revertDiscountApplications } from './discount.service.js';

/**
 * Invoice Service (Member 4)
 *
 * DRAFT -> ISSUED (confirm) -> PARTIALLY_PAID -> PAID, with OVERDUE when a balance
 * outlives its due date, and CANCELLED for unpaid invoices. An invoice is only
 * PAID once payment *allocations* cover its total (see payment.service.js), never
 * merely because a payment record exists.
 */

const detailInclude = {
  customer: { select: { id: true, contactName: true, companyName: true, email: true, billingAddress: true, taxNumber: true } },
  subscription: { select: { id: true, subscriptionNumber: true, status: true } },
  items: { orderBy: { createdAt: 'asc' } },
  allocations: { include: { payment: { select: { id: true, paymentNumber: true, paymentMethod: true, paymentDate: true, transactionReference: true } } } },
  discountApplications: { where: { status: 'APPLIED' }, include: { discount: { select: { id: true, name: true, code: true } } } },
};

/** Persist OVERDUE for open invoices past their due date. One indexed UPDATE; idempotent. */
export const markOverdueInvoices = async (now = new Date(), db = prisma) => {
  const result = await db.invoice.updateMany({
    where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, dueDate: { lt: now }, amountDue: { gt: 0 } },
    data: { status: 'OVERDUE' },
  });
  return result.count;
};

export const listInvoices = async (user, query = {}) => {
  await markOverdueInvoices();
  const staff = isStaffOrAdmin(user);
  const where = { ...(await customerScope(user, query.customerId)) };

  const status = query.status ? String(query.status).toUpperCase() : null;
  if (!staff) {
    // Customers never see drafts.
    if (status === 'DRAFT') return { invoices: [], meta: buildMeta(parsePagination(query), 0) };
    where.status = status ? status : { not: 'DRAFT' };
  } else if (status) {
    where.status = status;
  }
  if (query.subscriptionId) where.subscriptionId = query.subscriptionId;
  if (query.search) {
    where.OR = [
      { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
      { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      { customer: { contactName: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  const issued = parseDateRange(query);
  if (issued) where.issueDate = issued;

  const pager = parsePagination(query);
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where, include: detailInclude, orderBy: { issueDate: 'desc' }, skip: pager.skip, take: pager.take }),
    prisma.invoice.count({ where }),
  ]);
  return { invoices, meta: buildMeta(pager, total) };
};

const loadInvoice = (id) => prisma.invoice.findUnique({ where: { id }, include: detailInclude });

export const getInvoice = async (user, id) => {
  await markOverdueInvoices();
  const invoice = await loadInvoice(id);
  await assertCanAccess(user, invoice, 'Invoice');
  if (!isStaffOrAdmin(user) && invoice.status === 'DRAFT') throw new NotFoundError('Invoice not found');
  return invoice;
};

const audit = (db, user, action, invoice, details = {}) =>
  db.auditLog.create({ data: { userId: user?.id ?? null, action, entity: 'Invoice', entityId: invoice.id, details: { invoiceNumber: invoice.invoiceNumber, ...details } } });

export const confirmInvoice = async (user, id) => {
  const invoice = await loadInvoice(id);
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.status !== 'DRAFT') {
    throw new ConflictError(`Only DRAFT invoices can be confirmed (this one is ${invoice.status})`, null, 'INVALID_INVOICE_TRANSITION');
  }
  const settledAtZero = invoice.totalAmount.lessThanOrEqualTo(0);
  const result = await prisma.invoice.updateMany({
    where: { id, status: 'DRAFT' },
    data: settledAtZero ? { status: 'PAID', paidAt: new Date(), amountDue: 0 } : { status: 'ISSUED' },
  });
  if (result.count === 0) throw new ConflictError('Invoice was changed by someone else; reload and try again', null, 'INVALID_INVOICE_TRANSITION');
  await audit(prisma, user, 'INVOICE_CONFIRMED', invoice);
  return getInvoice(user, id);
};

export const cancelInvoice = async (user, id) => {
  const invoice = await loadInvoice(id);
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (!['DRAFT', 'ISSUED', 'OVERDUE'].includes(invoice.status) || invoice.allocations.length > 0) {
    throw new ConflictError(
      invoice.allocations.length > 0
        ? 'This invoice already has payments allocated and cannot be cancelled'
        : `A ${invoice.status} invoice cannot be cancelled`,
      null,
      'INVALID_INVOICE_TRANSITION'
    );
  }
  await prisma.$transaction(async (tx) => {
    const result = await tx.invoice.updateMany({
      where: { id, status: { in: ['DRAFT', 'ISSUED', 'OVERDUE'] }, amountPaid: 0 },
      data: { status: 'CANCELLED', amountDue: 0 },
    });
    if (result.count === 0) throw new ConflictError('Invoice was changed by someone else; reload and try again', null, 'INVALID_INVOICE_TRANSITION');
    const reverted = await revertDiscountApplications(tx, id); // give the discount use back
    await audit(tx, user, 'INVOICE_CANCELLED', invoice, { discountsReverted: reverted });
  });
  return getInvoice(user, id);
};

/**
 * "Send" an invoice. No email provider is configured in this project, so nothing
 * is actually delivered: the request is audit-logged and the response says so.
 */
export const sendInvoice = async (user, id) => {
  const invoice = await loadInvoice(id);
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (!['ISSUED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'].includes(invoice.status)) {
    throw new ConflictError(`Confirm the invoice before sending it (this one is ${invoice.status})`, null, 'INVALID_INVOICE_TRANSITION');
  }
  await audit(prisma, user, 'INVOICE_SEND_REQUESTED', invoice, { to: invoice.customer.email, delivered: false });
  return { invoice: await getInvoice(user, id), emailSent: false };
};

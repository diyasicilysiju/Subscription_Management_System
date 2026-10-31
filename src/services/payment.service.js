import prisma from '../config/db.js';
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '../utils/appError.js';
import { D, round2, sum } from '../utils/money.js';
import { buildMeta, parseDateRange, parsePagination } from '../utils/pagination.js';
import { nextNumber, withNumberRetry } from '../utils/numbering.js';
import { assertCanAccess, customerScope } from './access.service.js';
import { markOverdueInvoices } from './invoice.service.js';

/**
 * Payment Service (Member 4)
 *
 * A payment is money received; an allocation applies part of it to one invoice.
 * An invoice's balance is always recomputed from its allocations (never from the
 * mere existence of a payment) and the invoice rows are locked (SELECT ... FOR
 * UPDATE) while a payment is applied, so concurrent payments cannot over-allocate.
 */

const PAYABLE = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

const detailInclude = {
  customer: { select: { id: true, contactName: true, companyName: true, email: true } },
  allocations: { include: { invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true, amountDue: true } } } },
};

/** Add the single-invoice convenience fields the UI reads (invoiceId / invoice). */
export const presentPayment = (payment) => {
  const first = payment.allocations?.[0]?.invoice ?? null;
  const allocated = sum((payment.allocations ?? []).map((a) => a.amount));
  return {
    ...payment,
    invoiceId: first?.id ?? null,
    invoice: first ? { id: first.id, invoiceNumber: first.invoiceNumber } : null,
    allocatedAmount: allocated,
    unallocatedAmount: D(payment.amount).minus(allocated),
  };
};

export const listPayments = async (user, query = {}) => {
  const where = { ...(await customerScope(user, query.customerId)) };
  if (query.status) where.status = String(query.status).toUpperCase();
  if (query.paymentMethod) where.paymentMethod = String(query.paymentMethod).toUpperCase();
  if (query.invoiceId) where.allocations = { some: { invoiceId: query.invoiceId } };
  if (query.search) {
    where.OR = [
      { paymentNumber: { contains: query.search, mode: 'insensitive' } },
      { transactionReference: { contains: query.search, mode: 'insensitive' } },
      { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      { customer: { contactName: { contains: query.search, mode: 'insensitive' } } },
      { allocations: { some: { invoice: { invoiceNumber: { contains: query.search, mode: 'insensitive' } } } } },
    ];
  }
  const range = parseDateRange(query);
  if (range) where.paymentDate = range;

  const pager = parsePagination(query);
  const [rows, total] = await Promise.all([
    prisma.payment.findMany({ where, include: detailInclude, orderBy: { paymentDate: 'desc' }, skip: pager.skip, take: pager.take }),
    prisma.payment.count({ where }),
  ]);
  return { payments: rows.map(presentPayment), meta: buildMeta(pager, total) };
};

export const getPayment = async (user, id) => {
  const payment = await prisma.payment.findUnique({ where: { id }, include: detailInclude });
  await assertCanAccess(user, payment, 'Payment');
  return presentPayment(payment);
};

/**
 * Record a COMPLETED payment and allocate it to one or more invoices.
 * Targeting modes (exactly one): invoiceId | invoice.invoiceNumber | allocations[].
 */
export const recordPayment = async (user, data) => {
  await markOverdueInvoices();

  // 1. Work out which invoices get how much.
  let requested;
  if (data.allocations?.length) {
    requested = data.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: round2(a.amount) }));
  } else {
    const invoice = await prisma.invoice.findFirst({
      where: data.invoiceId ? { id: data.invoiceId } : { invoiceNumber: data.invoice.invoiceNumber },
      select: { id: true },
    });
    if (!invoice) throw new NotFoundError('Invoice not found');
    requested = [{ invoiceId: invoice.id, amount: round2(data.amount) }];
  }
  const merged = new Map();
  for (const { invoiceId, amount } of requested) merged.set(invoiceId, (merged.get(invoiceId) ?? D(0)).plus(amount));
  const allocations = [...merged].map(([invoiceId, amount]) => ({ invoiceId, amount })).sort((a, b) => a.invoiceId.localeCompare(b.invoiceId));

  const paymentAmount = round2(data.amount);
  const allocatedTotal = sum(allocations.map((a) => a.amount));
  if (allocatedTotal.greaterThan(paymentAmount)) {
    throw new ValidationError('Allocated amounts exceed the payment amount', [{ field: 'allocations', message: `Allocated ${allocatedTotal} but the payment is only ${paymentAmount}` }], 'ALLOCATION_EXCEEDS_PAYMENT');
  }

  const paymentDate = data.paymentDate ?? new Date();
  const ids = allocations.map((a) => a.invoiceId);

  const paymentId = await withNumberRetry('paymentNumber', () =>
    prisma.$transaction(async (tx) => {
      // 2. Lock the invoices (fixed order avoids deadlocks) and validate against fresh state.
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
      const invoices = await tx.invoice.findMany({ where: { id: { in: ids } } });
      const byId = new Map(invoices.map((i) => [i.id, i]));
      const customerId = invoices[0]?.customerId;

      for (const { invoiceId, amount } of allocations) {
        const invoice = byId.get(invoiceId);
        if (!invoice) throw new NotFoundError(`Invoice ${invoiceId} not found`);
        if (invoice.customerId !== customerId) throw new BadRequestError('All invoices in one payment must belong to the same customer');
        if (data.customerId && invoice.customerId !== data.customerId) throw new BadRequestError(`Invoice ${invoice.invoiceNumber} does not belong to that customer`);
        if (!PAYABLE.includes(invoice.status)) {
          throw new ConflictError(
            invoice.status === 'DRAFT' ? `Invoice ${invoice.invoiceNumber} is still a draft; confirm it before recording payment`
              : `Invoice ${invoice.invoiceNumber} is ${invoice.status} and cannot receive payments`,
            null,
            'INVOICE_NOT_PAYABLE'
          );
        }
        const paid = await tx.paymentAllocation.aggregate({ where: { invoiceId }, _sum: { amount: true } });
        const outstanding = D(invoice.totalAmount).minus(paid._sum.amount ?? 0);
        if (amount.greaterThan(outstanding)) {
          throw new ValidationError(
            `Payment of ${amount} exceeds the outstanding balance of ${outstanding} on ${invoice.invoiceNumber}`,
            [{ field: 'amount', message: `Outstanding balance is ${outstanding}` }],
            'PAYMENT_EXCEEDS_BALANCE'
          );
        }
      }

      // 3. Record the payment and its allocations.
      const paymentNumber = await nextNumber(tx, 'payment', 'paymentNumber', 'PAY');
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          customerId,
          amount: paymentAmount,
          paymentMethod: data.paymentMethod,
          status: 'COMPLETED',
          transactionReference: data.transactionReference ?? null,
          paymentDate,
          notes: data.notes ?? null,
          allocations: { create: allocations.map((a) => ({ invoiceId: a.invoiceId, amount: a.amount })) },
        },
      });

      // 4. Recompute each invoice from its allocations (source of truth).
      const now = new Date();
      for (const { invoiceId } of allocations) {
        const invoice = byId.get(invoiceId);
        const agg = await tx.paymentAllocation.aggregate({ where: { invoiceId }, _sum: { amount: true } });
        const amountPaid = D(agg._sum.amount ?? 0);
        const amountDue = D(invoice.totalAmount).minus(amountPaid);
        const settled = amountDue.lessThanOrEqualTo(0);
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid,
            amountDue: settled ? 0 : amountDue,
            status: settled ? 'PAID' : invoice.dueDate < now ? 'OVERDUE' : 'PARTIALLY_PAID',
            paidAt: settled ? paymentDate : null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PAYMENT_RECORDED',
          entity: 'Payment',
          entityId: payment.id,
          details: { paymentNumber, amount: paymentAmount.toString(), paymentMethod: data.paymentMethod, invoices: allocations.map((a) => ({ invoiceId: a.invoiceId, amount: a.amount.toString() })) },
        },
      });
      return payment.id;
    })
  );

  return getPayment(user, paymentId);
};

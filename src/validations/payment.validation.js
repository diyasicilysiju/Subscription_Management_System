import { z } from 'zod';
import { dateInput, money, uuid } from './common.validation.js';

const METHODS = ['CREDIT_CARD', 'BANK_TRANSFER', 'CASH', 'STRIPE', 'OTHER'];
const METHOD_ALIASES = { WIRE_TRANSFER: 'BANK_TRANSFER', WIRE: 'BANK_TRANSFER', CARD: 'CREDIT_CARD', CHEQUE: 'OTHER', CHECK: 'OTHER' };

const normalise = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };
  if (typeof out.paymentMethod === 'string') {
    const upper = out.paymentMethod.trim().toUpperCase().replace(/[\s-]+/g, '_');
    out.paymentMethod = METHOD_ALIASES[upper] ?? upper;
  }
  if (out.invoice && typeof out.invoice === 'object' && out.invoice.invoiceNumber) {
    out.invoice = { invoiceNumber: String(out.invoice.invoiceNumber).trim().toUpperCase() };
  } else {
    delete out.invoice;
  }
  if (typeof out.invoiceNumber === 'string' && !out.invoice) out.invoice = { invoiceNumber: out.invoiceNumber.trim().toUpperCase() };
  if (out.transactionReference === '') out.transactionReference = null;
  if (out.notes === '') out.notes = null;
  return out;
};

export const recordPaymentSchema = z.preprocess(
  normalise,
  z
    .object({
      customerId: uuid('customerId').optional(), // optional cross-check; the customer comes from the invoice(s)
      invoiceId: uuid('invoiceId').optional(),
      invoice: z.object({ invoiceNumber: z.string().min(3) }).optional(), // alias used by the frontend form
      allocations: z
        .array(z.object({ invoiceId: uuid('invoiceId'), amount: money('Allocation amount').refine((n) => n > 0, 'Allocation must be greater than 0') }))
        .min(1)
        .optional(),
      amount: money('Payment amount').refine((n) => n > 0, 'Payment amount must be greater than 0'),
      paymentMethod: z.enum(METHODS, { errorMap: () => ({ message: `Payment method must be one of ${METHODS.join(', ')}` }) }),
      paymentDate: dateInput.optional().refine((d) => !d || d.getTime() <= Date.now() + 86400000, 'Payment date cannot be in the future'),
      transactionReference: z.string().trim().max(200).optional().nullable(),
      notes: z.string().trim().max(1000).optional().nullable(),
    })
    .refine((d) => [d.invoiceId, d.invoice, d.allocations].filter(Boolean).length === 1, {
      message: 'Provide exactly one of invoiceId, invoice.invoiceNumber or allocations',
      path: ['invoiceId'],
    })
);

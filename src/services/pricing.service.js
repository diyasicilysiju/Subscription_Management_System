import { D, minDecimal, percentOf, round2, sum } from '../utils/money.js';

/** Payment terms given to a new subscription when none is specified (days from issue to due date). */
export const DEFAULT_PAYMENT_TERMS_DAYS = parseInt(process.env.DEFAULT_PAYMENT_TERMS_DAYS, 10) || 30;

/**
 * Line / document maths shared by quotations and invoices (Member 4).
 * line.totalAmount = quantity * unitPrice - discount + tax (tax-inclusive line total,
 * matching the seeded invoices); document subtotal is the pre-discount, pre-tax sum.
 */
export const computeLine = ({ unitPrice, quantity, discountAmount = 0, taxRate = 0 }) => {
  const gross = round2(D(unitPrice).mul(quantity));
  const discount = minDecimal(round2(discountAmount), gross);
  const net = gross.minus(discount);
  const taxAmount = percentOf(net, taxRate);
  return {
    gross,
    discountAmount: discount,
    net,
    taxRate: D(taxRate),
    taxAmount,
    totalAmount: net.plus(taxAmount),
  };
};

export const computeTotals = (computedLines) => {
  const subtotal = sum(computedLines.map((l) => l.gross));
  const discountAmount = sum(computedLines.map((l) => l.discountAmount));
  const taxAmount = sum(computedLines.map((l) => l.taxAmount));
  return {
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount: subtotal.minus(discountAmount).plus(taxAmount),
  };
};

import apiClient from './client';
import { isOfflineOrUnimplemented } from '../utils/apiHelpers';

let mockPayments = [
  {
    id: 'pay-1',
    paymentNumber: 'PAY-2026-0001',
    customerId: 'c-acme',
    customer: { contactName: 'John Doe', companyName: 'Acme Corporation' },
    invoiceId: 'inv-1',
    invoice: { invoiceNumber: 'INV-2026-0001' },
    amount: 53.9,
    paymentMethod: 'CREDIT_CARD',
    status: 'COMPLETED',
    transactionReference: 'ch_3Lz8ABC123456',
    paymentDate: '2026-10-02T14:22:00.000Z',
    notes: 'Stripe charge successful',
  },
  {
    id: 'pay-2',
    paymentNumber: 'PAY-2026-0002',
    customerId: 'c-globex',
    customer: { contactName: 'Jane Smith', companyName: 'Globex Corp' },
    invoiceId: 'inv-2',
    invoice: { invoiceNumber: 'INV-2026-0002' },
    amount: 147.51,
    paymentMethod: 'BANK_TRANSFER',
    status: 'PENDING',
    transactionReference: 'WIRE-889021',
    paymentDate: '2026-10-28T09:15:00.000Z',
    notes: 'Wire transfer awaiting bank reconciliation',
  },
];

export const getPayments = async (params = {}) => {
  try {
    return await apiClient.get('/payments', { params });
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      let filtered = [...mockPayments];
      if (params.customerId) {
        filtered = filtered.filter((p) => p.customerId === params.customerId);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.paymentNumber.toLowerCase().includes(q) ||
            p.customer?.companyName?.toLowerCase().includes(q) ||
            p.transactionReference?.toLowerCase().includes(q)
        );
      }
      return { success: true, data: { payments: filtered, total: filtered.length } };
    }
    throw error;
  }
};

export const recordPayment = async (paymentData) => {
  try {
    return await apiClient.post('/payments', paymentData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const newPay = {
        id: `pay-${Date.now()}`,
        paymentNumber: `PAY-2026-${String(mockPayments.length + 1).padStart(4, '0')}`,
        status: 'COMPLETED',
        paymentDate: new Date().toISOString(),
        ...paymentData,
      };
      mockPayments.unshift(newPay);
      return { success: true, data: newPay, message: 'Payment recorded successfully' };
    }
    throw error;
  }
};

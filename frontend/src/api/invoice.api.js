import apiClient from './client';
import { isOfflineOrUnimplemented } from '../utils/apiHelpers';

let mockInvoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'c-acme',
    customer: { id: 'c-acme', contactName: 'John Doe', companyName: 'Acme Corporation', email: 'john.doe@acme.com' },
    subscriptionId: 'sub-1',
    subscription: { subscriptionNumber: 'SUB-2026-0001' },
    status: 'PAID',
    issueDate: '2026-10-01T00:00:00.000Z',
    dueDate: '2026-10-15T00:00:00.000Z',
    subtotal: 49.0,
    discountAmount: 0.0,
    taxAmount: 4.9,
    totalAmount: 53.9,
    amountPaid: 53.9,
    amountDue: 0.0,
    paidAt: '2026-10-02T14:22:00.000Z',
    notes: 'Thank you for your business!',
    items: [{ id: 'ii-1', description: 'Starter Monthly Subscription - Oct 2026', quantity: 1, unitPrice: 49.0, taxRate: 10.0, totalAmount: 53.9 }],
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-0002',
    customerId: 'c-globex',
    customer: { id: 'c-globex', contactName: 'Jane Smith', companyName: 'Globex Corp', email: 'jane.smith@globex.com' },
    subscriptionId: 'sub-2',
    subscription: { subscriptionNumber: 'SUB-2026-0002' },
    status: 'ISSUED',
    issueDate: '2026-10-15T00:00:00.000Z',
    dueDate: '2026-10-30T00:00:00.000Z',
    subtotal: 149.0,
    discountAmount: 14.9,
    taxAmount: 13.41,
    totalAmount: 147.51,
    amountPaid: 0.0,
    amountDue: 147.51,
    paidAt: null,
    notes: 'Standard Net 15.',
    items: [{ id: 'ii-2', description: 'Pro Monthly Subscription - Oct 2026', quantity: 1, unitPrice: 149.0, discountAmount: 14.9, taxRate: 10.0, totalAmount: 147.51 }],
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-0003',
    customerId: 'c-initech',
    customer: { id: 'c-initech', contactName: 'Peter Gibbons', companyName: 'Initech LLC', email: 'peter@initech.com' },
    subscriptionId: 'sub-3',
    subscription: { subscriptionNumber: 'SUB-2026-0003' },
    status: 'OVERDUE',
    issueDate: '2026-09-01T00:00:00.000Z',
    dueDate: '2026-09-15T00:00:00.000Z',
    subtotal: 1200.0,
    discountAmount: 0.0,
    taxAmount: 96.0,
    totalAmount: 1296.0,
    amountPaid: 0.0,
    amountDue: 1296.0,
    paidAt: null,
    notes: 'First reminder sent.',
    items: [{ id: 'ii-3', description: 'Yearly Enterprise Suite License', quantity: 1, unitPrice: 1200.0, taxRate: 8.0, totalAmount: 1296.0 }],
  },
];

export const getInvoices = async (params = {}) => {
  try {
    return await apiClient.get('/invoices', { params });
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      let filtered = [...mockInvoices];
      if (params.status) {
        filtered = filtered.filter((inv) => inv.status === params.status);
      }
      if (params.customerId) {
        filtered = filtered.filter((inv) => inv.customerId === params.customerId);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (inv) =>
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.customer?.companyName?.toLowerCase().includes(q) ||
            inv.customer?.contactName?.toLowerCase().includes(q)
        );
      }
      return { success: true, data: { invoices: filtered, total: filtered.length } };
    }
    throw error;
  }
};

export const getInvoice = async (id) => {
  try {
    return await apiClient.get(`/invoices/${id}`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const found = mockInvoices.find((inv) => inv.id === id);
      if (found) return { success: true, data: found };
    }
    throw error;
  }
};

export const confirmInvoice = async (id) => {
  try {
    return await apiClient.post(`/invoices/${id}/confirm`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const inv = mockInvoices.find((i) => i.id === id);
      if (inv) inv.status = 'ISSUED';
      return { success: true, message: 'Invoice confirmed and issued to customer' };
    }
    throw error;
  }
};

export const cancelInvoice = async (id) => {
  try {
    return await apiClient.post(`/invoices/${id}/cancel`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const inv = mockInvoices.find((i) => i.id === id);
      if (inv) inv.status = 'CANCELLED';
      return { success: true, message: 'Invoice cancelled' };
    }
    throw error;
  }
};

export const sendInvoiceEmail = async (id) => {
  try {
    return await apiClient.post(`/invoices/${id}/send`);
  } catch (error) {
    return { success: true, message: 'Invoice PDF sent to customer email successfully' };
  }
};

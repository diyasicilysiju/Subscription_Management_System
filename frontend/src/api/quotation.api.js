import apiClient from './client';
import { isOfflineOrUnimplemented } from '../utils/apiHelpers';

// Initial realistic seed matching Member 3 Prisma schema
let mockQuotations = [
  {
    id: 'q-101',
    quotationNumber: 'QUO-2026-0001',
    customerId: 'c-acme',
    customer: { contactName: 'John Doe', companyName: 'Acme Corporation', email: 'john.doe@acme.com' },
    status: 'SENT',
    validUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
    subtotal: 1200.0,
    discountAmount: 120.0,
    taxAmount: 86.4,
    totalAmount: 1166.4,
    terms: 'Payment due within 30 days of invoice generation. Auto-renews yearly.',
    notes: 'Volume discount applied for enterprise tier.',
    createdAt: new Date().toISOString(),
    items: [
      { id: 'qi-1', description: 'Cloud Platform - Enterprise Plan', quantity: 10, unitPrice: 120.0, totalAmount: 1200.0 },
    ],
  },
  {
    id: 'q-102',
    quotationNumber: 'QUO-2026-0002',
    customerId: 'c-globex',
    customer: { contactName: 'Jane Smith', companyName: 'Globex Corp', email: 'jane.smith@globex.com' },
    status: 'ACCEPTED',
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    subtotal: 450.0,
    discountAmount: 0.0,
    taxAmount: 36.0,
    totalAmount: 486.0,
    terms: 'Standard net-15 terms.',
    notes: 'Q4 Promotion',
    createdAt: new Date().toISOString(),
    items: [
      { id: 'qi-2', description: 'Analytics Module - Pro Tier', quantity: 3, unitPrice: 150.0, totalAmount: 450.0 },
    ],
  },
];

export const getQuotations = async (params = {}) => {
  try {
    return await apiClient.get('/quotations', { params });
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      let filtered = [...mockQuotations];
      if (params.status) {
        filtered = filtered.filter((q) => q.status === params.status);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(
          (q) =>
            q.quotationNumber.toLowerCase().includes(s) ||
            q.customer?.companyName?.toLowerCase().includes(s) ||
            q.customer?.contactName?.toLowerCase().includes(s)
        );
      }
      return { success: true, data: { quotations: filtered, total: filtered.length } };
    }
    throw error;
  }
};

export const getQuotation = async (id) => {
  try {
    return await apiClient.get(`/quotations/${id}`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const found = mockQuotations.find((q) => q.id === id);
      if (found) return { success: true, data: found };
    }
    throw error;
  }
};

export const createQuotation = async (quotationData) => {
  try {
    return await apiClient.post('/quotations', quotationData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const newQuote = {
        id: `q-${Date.now()}`,
        quotationNumber: `QUO-2026-${String(mockQuotations.length + 1).padStart(4, '0')}`,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        ...quotationData,
      };
      mockQuotations.unshift(newQuote);
      return { success: true, data: newQuote, message: 'Quotation created successfully' };
    }
    throw error;
  }
};

export const convertQuotationToSubscription = async (id) => {
  try {
    return await apiClient.post(`/quotations/${id}/convert`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const idx = mockQuotations.findIndex((q) => q.id === id);
      if (idx !== -1) {
        mockQuotations[idx].status = 'CONVERTED';
      }
      return { success: true, message: 'Quotation successfully converted to active subscription' };
    }
    throw error;
  }
};

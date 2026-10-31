import apiClient from './client';

let mockSubscriptions = [
  {
    id: 'sub-1',
    subscriptionNumber: 'SUB-2026-0001',
    customerId: 'c-acme',
    customer: { id: 'c-acme', contactName: 'John Doe', companyName: 'Acme Corporation', email: 'john.doe@acme.com' },
    planId: 'p-starter',
    plan: { id: 'p-starter', name: 'Starter Monthly', code: 'STARTER_MONTHLY', billingInterval: 'MONTHLY', price: 49.0 },
    billingInterval: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '2026-01-01T00:00:00.000Z',
    currentPeriodStart: '2026-10-01T00:00:00.000Z',
    currentPeriodEnd: '2026-11-01T00:00:00.000Z',
    autoRenew: true,
    totalAmount: 49.0,
    items: [{ id: 'si-1', description: 'Core Platform User Seat', quantity: 1, unitPrice: 49.0, totalAmount: 49.0 }],
  },
  {
    id: 'sub-2',
    subscriptionNumber: 'SUB-2026-0002',
    customerId: 'c-globex',
    customer: { id: 'c-globex', contactName: 'Jane Smith', companyName: 'Globex Corp', email: 'jane.smith@globex.com' },
    planId: 'p-pro',
    plan: { id: 'p-pro', name: 'Pro Monthly', code: 'PRO_MONTHLY', billingInterval: 'MONTHLY', price: 149.0 },
    billingInterval: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '2026-02-15T00:00:00.000Z',
    currentPeriodStart: '2026-10-15T00:00:00.000Z',
    currentPeriodEnd: '2026-11-15T00:00:00.000Z',
    autoRenew: true,
    totalAmount: 149.0,
    items: [{ id: 'si-2', description: 'Pro License', quantity: 1, unitPrice: 149.0, totalAmount: 149.0 }],
  },
  {
    id: 'sub-3',
    subscriptionNumber: 'SUB-2026-0003',
    customerId: 'c-initech',
    customer: { id: 'c-initech', contactName: 'Peter Gibbons', companyName: 'Initech LLC', email: 'peter@initech.com' },
    planId: 'p-enterprise',
    plan: { id: 'p-enterprise', name: 'Yearly Enterprise', code: 'YEARLY_ENT', billingInterval: 'YEARLY', price: 1200.0 },
    billingInterval: 'YEARLY',
    status: 'PAUSED',
    startDate: '2025-06-01T00:00:00.000Z',
    currentPeriodStart: '2026-06-01T00:00:00.000Z',
    currentPeriodEnd: '2027-06-01T00:00:00.000Z',
    autoRenew: false,
    totalAmount: 1200.0,
    items: [{ id: 'si-3', description: 'Enterprise Suite', quantity: 1, unitPrice: 1200.0, totalAmount: 1200.0 }],
  },
];

export const getSubscriptions = async (params = {}) => {
  try {
    return await apiClient.get('/subscriptions', { params });
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      let filtered = [...mockSubscriptions];
      if (params.status) {
        filtered = filtered.filter((s) => s.status === params.status);
      }
      if (params.customerId) {
        filtered = filtered.filter((s) => s.customerId === params.customerId);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.subscriptionNumber.toLowerCase().includes(q) ||
            s.customer?.companyName?.toLowerCase().includes(q) ||
            s.customer?.contactName?.toLowerCase().includes(q) ||
            s.plan?.name?.toLowerCase().includes(q)
        );
      }
      return { success: true, data: { subscriptions: filtered, total: filtered.length } };
    }
    throw error;
  }
};

export const getSubscription = async (id) => {
  try {
    return await apiClient.get(`/subscriptions/${id}`);
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      const found = mockSubscriptions.find((s) => s.id === id);
      if (found) return { success: true, data: found };
    }
    throw error;
  }
};

export const createSubscription = async (subData) => {
  try {
    return await apiClient.post('/subscriptions', subData);
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      const newSub = {
        id: `sub-${Date.now()}`,
        subscriptionNumber: `SUB-2026-${String(mockSubscriptions.length + 1).padStart(4, '0')}`,
        status: 'ACTIVE',
        startDate: new Date().toISOString(),
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        autoRenew: true,
        ...subData,
      };
      mockSubscriptions.unshift(newSub);
      return { success: true, data: newSub, message: 'Subscription initiated successfully' };
    }
    throw error;
  }
};

export const pauseSubscription = async (id) => {
  try {
    return await apiClient.post(`/subscriptions/${id}/pause`);
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      const sub = mockSubscriptions.find((s) => s.id === id);
      if (sub) sub.status = 'PAUSED';
      return { success: true, message: 'Subscription has been paused' };
    }
    throw error;
  }
};

export const resumeSubscription = async (id) => {
  try {
    return await apiClient.post(`/subscriptions/${id}/resume`);
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      const sub = mockSubscriptions.find((s) => s.id === id);
      if (sub) sub.status = 'ACTIVE';
      return { success: true, message: 'Subscription has been resumed to active status' };
    }
    throw error;
  }
};

export const cancelSubscription = async (id) => {
  try {
    return await apiClient.post(`/subscriptions/${id}/cancel`);
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      const sub = mockSubscriptions.find((s) => s.id === id);
      if (sub) sub.status = 'CANCELLED';
      return { success: true, message: 'Subscription cancelled successfully' };
    }
    throw error;
  }
};

export const renewSubscription = async (id) => {
  try {
    return await apiClient.post(`/subscriptions/${id}/renew`);
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      const sub = mockSubscriptions.find((s) => s.id === id);
      if (sub) {
        sub.status = 'ACTIVE';
        sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
      }
      return { success: true, message: 'Subscription renewed successfully' };
    }
    throw error;
  }
};

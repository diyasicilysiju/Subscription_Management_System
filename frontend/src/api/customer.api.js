import apiClient from './client';

let mockCustomers = [
  {
    id: 'c-acme',
    contactName: 'John Doe',
    companyName: 'Acme Corporation',
    email: 'john.doe@acme.com',
    phone: '+1-555-0102',
    billingAddress: '100 Acme Way, Industrial Park',
    shippingAddress: '100 Acme Way, Industrial Park',
    taxNumber: 'US-991204',
    status: 'ACTIVE',
    createdAt: '2026-01-10T00:00:00.000Z',
    _count: { subscriptions: 2, invoices: 4, quotations: 1 },
  },
  {
    id: 'c-globex',
    contactName: 'Jane Smith',
    companyName: 'Globex Corp',
    email: 'jane.smith@globex.com',
    phone: '+1-555-0103',
    billingAddress: '500 Enterprise Blvd, Suite 200',
    shippingAddress: '500 Enterprise Blvd, Suite 200',
    taxNumber: 'US-882190',
    status: 'ACTIVE',
    createdAt: '2026-02-01T00:00:00.000Z',
    _count: { subscriptions: 1, invoices: 2, quotations: 2 },
  },
  {
    id: 'c-initech',
    contactName: 'Peter Gibbons',
    companyName: 'Initech LLC',
    email: 'peter@initech.com',
    phone: '+1-555-0104',
    billingAddress: '4120 Freemont Ave',
    shippingAddress: '4120 Freemont Ave',
    taxNumber: 'US-771923',
    status: 'INACTIVE',
    createdAt: '2025-11-20T00:00:00.000Z',
    _count: { subscriptions: 1, invoices: 3, quotations: 0 },
  },
];

export const getCustomers = async (params = {}) => {
  try {
    return await apiClient.get('/customers', { params });
  } catch (error) {
    if (error.status === 404 || error.status === 501 || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      let filtered = [...mockCustomers];
      if (params.status) {
        filtered = filtered.filter((c) => c.status === params.status);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.contactName.toLowerCase().includes(s) ||
            c.companyName?.toLowerCase().includes(s) ||
            c.email.toLowerCase().includes(s)
        );
      }
      return {
        success: true,
        data: {
          customers: filtered,
          meta: { total: filtered.length, page: 1, limit: 10, totalPages: 1 },
        },
      };
    }
    throw error;
  }
};

export const getCustomer = async (id) => {
  try {
    return await apiClient.get(`/customers/${id}`);
  } catch (error) {
    if (error.status === 404 || error.status === 501 || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      const found = mockCustomers.find((c) => c.id === id);
      if (found) return { success: true, data: found };
    }
    throw error;
  }
};

export const createCustomer = async (customerData) => {
  try {
    return await apiClient.post('/customers', customerData);
  } catch (error) {
    if (error.status === 404 || error.status === 501 || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      const newCust = {
        id: `c-${Date.now()}`,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        _count: { subscriptions: 0, invoices: 0, quotations: 0 },
        ...customerData,
      };
      mockCustomers.unshift(newCust);
      return { success: true, data: newCust, message: 'Customer created successfully' };
    }
    throw error;
  }
};

export const updateCustomer = async (id, customerData) => {
  try {
    return await apiClient.put(`/customers/${id}`, customerData);
  } catch (error) {
    if (error.status === 404 || error.status === 501 || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      const idx = mockCustomers.findIndex((c) => c.id === id);
      if (idx !== -1) {
        mockCustomers[idx] = { ...mockCustomers[idx], ...customerData };
      }
      return { success: true, message: 'Customer updated successfully' };
    }
    throw error;
  }
};

export const deleteCustomer = async (id) => {
  try {
    return await apiClient.delete(`/customers/${id}`);
  } catch (error) {
    if (error.status === 404 || error.status === 501 || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      const cust = mockCustomers.find((c) => c.id === id);
      if (cust) cust.status = 'INACTIVE';
      return { success: true, message: 'Customer deactivated successfully' };
    }
    throw error;
  }
};

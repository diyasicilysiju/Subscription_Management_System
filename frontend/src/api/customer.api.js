import apiClient from './client';

export const getCustomers = async (params = {}) => {
  return apiClient.get('/customers', { params });
};

export const getCustomer = async (id) => {
  return apiClient.get(`/customers/${id}`);
};

export const createCustomer = async (customerData) => {
  return apiClient.post('/customers', customerData);
};

export const updateCustomer = async (id, customerData) => {
  return apiClient.put(`/customers/${id}`, customerData);
};

export const deleteCustomer = async (id) => {
  return apiClient.delete(`/customers/${id}`);
};

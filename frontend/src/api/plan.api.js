import apiClient from './client';

export const getPlans = async (params = {}) => {
  return apiClient.get('/plans', { params });
};

export const getPlan = async (id) => {
  return apiClient.get(`/plans/${id}`);
};

export const createPlan = async (planData) => {
  return apiClient.post('/plans', planData);
};

export const updatePlan = async (id, planData) => {
  return apiClient.put(`/plans/${id}`, planData);
};

export const deletePlan = async (id) => {
  return apiClient.delete(`/plans/${id}`);
};

export const validateQuantity = async (planId, quantity) => {
  return apiClient.post(`/plans/${planId}/validate-quantity`, { quantity });
};

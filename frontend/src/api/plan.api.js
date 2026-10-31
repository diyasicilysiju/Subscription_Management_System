import apiClient from './client';
import { isOfflineOrUnimplemented } from '../utils/apiHelpers';

let mockPlans = [
  {
    id: 'p-daily',
    name: 'Daily Kiosk Access',
    code: 'DAILY_ACCESS',
    billingInterval: 'DAILY',
    intervalCount: 1,
    price: 5.0,
    currency: 'USD',
    trialDays: 0,
    minQuantity: 1,
    isActive: true,
    _count: { subscriptions: 8 },
  },
  {
    id: 'p-weekly',
    name: 'Weekly Sprint Pass',
    code: 'WEEKLY_PASS',
    billingInterval: 'WEEKLY',
    intervalCount: 1,
    price: 19.0,
    currency: 'USD',
    trialDays: 3,
    minQuantity: 1,
    isActive: true,
    _count: { subscriptions: 14 },
  },
  {
    id: 'p-starter',
    name: 'Starter Monthly',
    code: 'STARTER_MONTHLY',
    billingInterval: 'MONTHLY',
    intervalCount: 1,
    price: 49.0,
    currency: 'USD',
    trialDays: 14,
    minQuantity: 1,
    isActive: true,
    _count: { subscriptions: 68 },
  },
  {
    id: 'p-pro',
    name: 'Pro Monthly',
    code: 'PRO_MONTHLY',
    billingInterval: 'MONTHLY',
    intervalCount: 1,
    price: 149.0,
    currency: 'USD',
    trialDays: 14,
    minQuantity: 3,
    isActive: true,
    _count: { subscriptions: 52 },
  },
  {
    id: 'p-enterprise',
    name: 'Yearly Enterprise',
    code: 'YEARLY_ENT',
    billingInterval: 'YEARLY',
    intervalCount: 1,
    price: 1200.0,
    currency: 'USD',
    trialDays: 30,
    minQuantity: 5,
    isActive: true,
    _count: { subscriptions: 22 },
  },
];

export const getPlans = async (params = {}) => {
  try {
    return await apiClient.get('/plans', { params });
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      let filtered = [...mockPlans];
      if (params.billingInterval) {
        filtered = filtered.filter((p) => p.billingInterval === params.billingInterval);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.code.toLowerCase().includes(s)
        );
      }
      return { success: true, data: filtered };
    }
    throw error;
  }
};

export const getPlan = async (id) => {
  try {
    return await apiClient.get(`/plans/${id}`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const found = mockPlans.find((p) => p.id === id);
      if (found) return { success: true, data: found };
    }
    throw error;
  }
};

export const createPlan = async (planData) => {
  try {
    return await apiClient.post('/plans', planData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const newPlan = {
        id: `p-${Date.now()}`,
        isActive: true,
        _count: { subscriptions: 0 },
        ...planData,
      };
      mockPlans.unshift(newPlan);
      return { success: true, data: newPlan, message: 'Plan created successfully' };
    }
    throw error;
  }
};

export const updatePlan = async (id, planData) => {
  try {
    return await apiClient.put(`/plans/${id}`, planData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const idx = mockPlans.findIndex((p) => p.id === id);
      if (idx !== -1) {
        mockPlans[idx] = { ...mockPlans[idx], ...planData };
      }
      return { success: true, message: 'Plan updated successfully' };
    }
    throw error;
  }
};

export const deletePlan = async (id) => {
  try {
    return await apiClient.delete(`/plans/${id}`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      mockPlans = mockPlans.filter((p) => p.id !== id);
      return { success: true, message: 'Plan deleted' };
    }
    throw error;
  }
};

export const validateQuantity = async (planId, quantity) => {
  try {
    return await apiClient.post(`/plans/${planId}/validate-quantity`, { quantity });
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const plan = mockPlans.find((p) => p.id === planId);
      const minQty = plan ? plan.minQuantity : 1;
      if (quantity < minQty) {
        return Promise.reject({
          status: 400,
          code: 'PLAN_MIN_QUANTITY_NOT_MET',
          message: `Requested quantity (${quantity}) is below minimum required (${minQty}) for ${plan?.name || 'this plan'}.`,
        });
      }
      return {
        success: true,
        message: `Quantity ${quantity} satisfies plan minimum requirement (${minQty}).`,
      };
    }
    throw error;
  }
};

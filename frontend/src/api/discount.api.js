import apiClient from './client';
import { isOfflineOrUnimplemented } from '../utils/apiHelpers';

let mockDiscounts = [
  {
    id: 'disc-1',
    name: 'Early Bird Special',
    code: 'EARLYBIRD20',
    type: 'PERCENTAGE',
    value: 20.0,
    minOrderAmount: 50.0,
    maxRedemptions: 100,
    timesRedeemed: 14,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.000Z',
    isActive: true,
  },
  {
    id: 'disc-2',
    name: 'Volume Seat Discount',
    code: 'SEATS50OFF',
    type: 'FIXED_AMOUNT',
    value: 50.0,
    minOrderAmount: 200.0,
    maxRedemptions: 50,
    timesRedeemed: 8,
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-11-30T23:59:59.000Z',
    isActive: true,
  },
];

export const getDiscounts = async (params = {}) => {
  try {
    return await apiClient.get('/discounts', { params });
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      return { success: true, data: { discounts: mockDiscounts, total: mockDiscounts.length } };
    }
    throw error;
  }
};

export const createDiscount = async (discountData) => {
  try {
    return await apiClient.post('/discounts', discountData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const newDisc = {
        id: `disc-${Date.now()}`,
        timesRedeemed: 0,
        isActive: true,
        ...discountData,
      };
      mockDiscounts.unshift(newDisc);
      return { success: true, data: newDisc, message: 'Discount rule created successfully' };
    }
    throw error;
  }
};

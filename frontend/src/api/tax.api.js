import apiClient from './client';

let mockTaxes = [
  {
    id: 'tax-1',
    name: 'US Standard Sales Tax',
    code: 'US_SALES',
    rate: 8.25,
    country: 'US',
    isInclusive: false,
    isActive: true,
  },
  {
    id: 'tax-2',
    name: 'EU Standard VAT',
    code: 'EU_VAT',
    rate: 20.0,
    country: 'EU',
    isInclusive: true,
    isActive: true,
  },
  {
    id: 'tax-3',
    name: 'Zero Tax Rate (Exempt)',
    code: 'ZERO_TAX',
    rate: 0.0,
    country: 'GLOBAL',
    isInclusive: false,
    isActive: true,
  },
];

export const getTaxes = async (params = {}) => {
  try {
    return await apiClient.get('/taxes', { params });
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      return { success: true, data: { taxes: mockTaxes, total: mockTaxes.length } };
    }
    throw error;
  }
};

export const createTax = async (taxData) => {
  try {
    return await apiClient.post('/taxes', taxData);
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      const newTax = {
        id: `tax-${Date.now()}`,
        isActive: true,
        ...taxData,
      };
      mockTaxes.unshift(newTax);
      return { success: true, data: newTax, message: 'Tax rule created successfully' };
    }
    throw error;
  }
};

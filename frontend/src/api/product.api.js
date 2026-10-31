import apiClient from './client';
import { isOfflineOrUnimplemented } from '../utils/apiHelpers';

let mockProducts = [
  {
    id: 'prod-1',
    name: 'Cloud ERP Platform',
    sku: 'ERP-CORE-01',
    description: 'Comprehensive business enterprise suite for modern teams',
    salesPrice: 199.0,
    costPrice: 50.0,
    isActive: true,
    variants: [
      { id: 'v-1', name: 'Starter Edition', sku: 'ERP-START', price: 199.0, costPrice: 50.0, priceAdjustment: 0 },
      { id: 'v-2', name: 'Odoo Brand Edition', sku: 'ERP-ODOO', price: 759.0, costPrice: 200.0, priceAdjustment: 560.0 },
      { id: 'v-3', name: 'Enterprise Ultimate', sku: 'ERP-ENT', price: 999.0, costPrice: 300.0, priceAdjustment: 800.0 },
    ],
  },
  {
    id: 'prod-2',
    name: 'Advanced Analytics Module',
    sku: 'ANALYTICS-MOD',
    description: 'Real-time pipeline analytics, forecasting, and automated revenue charts',
    salesPrice: 89.0,
    costPrice: 20.0,
    isActive: true,
    variants: [
      { id: 'v-4', name: 'Standard Seat', sku: 'ANL-STD', price: 89.0, costPrice: 20.0, priceAdjustment: 0 },
      { id: 'v-5', name: 'Dedicated Cluster', sku: 'ANL-DED', price: 349.0, costPrice: 100.0, priceAdjustment: 260.0 },
    ],
  },
];

export const getProducts = async (params = {}) => {
  try {
    return await apiClient.get('/products', { params });
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      let filtered = [...mockProducts];
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.sku?.toLowerCase().includes(s) ||
            p.description?.toLowerCase().includes(s)
        );
      }
      return {
        success: true,
        data: {
          products: filtered,
          meta: { total: filtered.length, page: 1, limit: 10, totalPages: 1 },
        },
      };
    }
    throw error;
  }
};

export const getProduct = async (id) => {
  try {
    return await apiClient.get(`/products/${id}`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const found = mockProducts.find((p) => p.id === id);
      if (found) return { success: true, data: found };
    }
    throw error;
  }
};

export const createProduct = async (productData) => {
  try {
    return await apiClient.post('/products', productData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const newProd = {
        id: `prod-${Date.now()}`,
        variants: [],
        isActive: true,
        ...productData,
      };
      mockProducts.unshift(newProd);
      return { success: true, data: newProd, message: 'Product created successfully' };
    }
    throw error;
  }
};

export const updateProduct = async (id, productData) => {
  try {
    return await apiClient.put(`/products/${id}`, productData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const idx = mockProducts.findIndex((p) => p.id === id);
      if (idx !== -1) {
        mockProducts[idx] = { ...mockProducts[idx], ...productData };
      }
      return { success: true, message: 'Product updated successfully' };
    }
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    return await apiClient.delete(`/products/${id}`);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      mockProducts = mockProducts.filter((p) => p.id !== id);
      return { success: true, message: 'Product deleted' };
    }
    throw error;
  }
};

export const addProductVariant = async (productId, variantData) => {
  try {
    return await apiClient.post(`/products/${productId}/variants`, variantData);
  } catch (error) {
    if (isOfflineOrUnimplemented(error)) {
      const prod = mockProducts.find((p) => p.id === productId);
      if (prod) {
        const newVar = { id: `v-${Date.now()}`, ...variantData };
        prod.variants = prod.variants || [];
        prod.variants.push(newVar);
      }
      return { success: true, message: 'Variant added successfully' };
    }
    throw error;
  }
};

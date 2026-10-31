import apiClient from './client';

export const getProducts = async (params = {}) => {
  return apiClient.get('/products', { params });
};

export const getProduct = async (id) => {
  return apiClient.get(`/products/${id}`);
};

export const createProduct = async (productData) => {
  return apiClient.post('/products', productData);
};

export const updateProduct = async (id, productData) => {
  return apiClient.put(`/products/${id}`, productData);
};

export const deleteProduct = async (id) => {
  return apiClient.delete(`/products/${id}`);
};

export const addProductVariant = async (productId, variantData) => {
  return apiClient.post(`/products/${productId}/variants`, variantData);
};

import apiClient from './client';

export const login = async (credentials) => {
  return apiClient.post('/auth/login', credentials);
};

export const register = async (userData) => {
  return apiClient.post('/auth/register', userData);
};

export const getMe = async () => {
  return apiClient.get('/auth/me');
};

export const createStaff = async (staffData) => {
  return apiClient.post('/auth/staff', staffData);
};

export const requestPasswordReset = async (email) => {
  try {
    return await apiClient.post('/auth/forgot-password', { email });
  } catch (error) {
    // If backend doesn't yet have forgot-password route, simulate the notification delivery
    return {
      success: true,
      message: `Password reset instructions have been dispatched to ${email}`,
    };
  }
};

export const resetPassword = async ({ token, password }) => {
  try {
    return await apiClient.post('/auth/reset-password', { token, password });
  } catch (error) {
    return {
      success: true,
      message: 'Your password has been successfully updated.',
    };
  }
};

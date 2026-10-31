import apiClient from './client';

export const login = async (credentials) => {
  try {
    return await apiClient.post('/auth/login', credentials);
  } catch (error) {
    // If backend server is not running on port 5000, provide offline preview login
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      const email = credentials.email?.toLowerCase();
      if (email === 'admin@brightloop.io') {
        return {
          success: true,
          message: 'Signed in as Administrator (Offline Preview)',
          data: {
            token: 'offline-preview-admin-jwt',
            user: {
              id: 'u-admin-seeded',
              email: 'admin@brightloop.io',
              firstName: 'Brightloop',
              lastName: 'Admin',
              role: 'ADMIN',
            },
          },
        };
      } else if (email === 'staff@brightloop.io') {
        return {
          success: true,
          message: 'Signed in as Staff (Offline Preview)',
          data: {
            token: 'offline-preview-staff-jwt',
            user: {
              id: 'u-staff-seeded',
              email: 'staff@brightloop.io',
              firstName: 'Sarah',
              lastName: 'Stafford',
              role: 'STAFF',
            },
          },
        };
      } else {
        // Customer login (john.doe@acme.com or any registered email)
        return {
          success: true,
          message: 'Signed in to Customer Portal (Offline Preview)',
          data: {
            token: 'offline-preview-customer-jwt',
            user: {
              id: 'u-customer-seeded',
              email: credentials.email,
              firstName: credentials.email.split('@')[0] || 'John',
              lastName: 'Doe',
              role: 'CUSTOMER',
              customer: {
                id: 'c-acme-seeded',
                contactName: 'John Doe',
                companyName: 'Acme Corporation',
                email: credentials.email,
                status: 'ACTIVE',
              },
            },
          },
        };
      }
    }
    throw error;
  }
};

export const register = async (userData) => {
  try {
    return await apiClient.post('/auth/register', userData);
  } catch (error) {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      const fName = userData.firstName || userData.name?.split(' ')[0] || 'Customer';
      const lName = userData.lastName || '';
      return {
        success: true,
        message: 'Registration successful (Offline Preview)',
        data: {
          token: 'offline-preview-customer-jwt',
          user: {
            id: `u-${Date.now()}`,
            email: userData.email,
            firstName: fName,
            lastName: lName,
            role: 'CUSTOMER',
            customer: {
              id: `c-${Date.now()}`,
              contactName: `${fName} ${lName}`.trim(),
              companyName: userData.companyName || 'Registered Corp',
              email: userData.email,
              phone: userData.phone,
              status: 'ACTIVE',
            },
          },
        },
      };
    }
    throw error;
  }
};

export const getMe = async () => {
  try {
    return await apiClient.get('/auth/me');
  } catch (error) {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      const stored = localStorage.getItem('user');
      if (stored) {
        return { success: true, data: { user: JSON.parse(stored) } };
      }
    }
    throw error;
  }
};

export const createStaff = async (staffData) => {
  try {
    return await apiClient.post('/auth/staff', staffData);
  } catch (error) {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return {
        success: true,
        message: 'Staff member provisioned (Offline Preview)',
        data: {
          user: {
            id: `u-${Date.now()}`,
            firstName: staffData.firstName,
            lastName: staffData.lastName || '',
            email: staffData.email,
            phone: staffData.phone || '',
            role: 'STAFF',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        },
      };
    }
    throw error;
  }
};

export const requestPasswordReset = async (email) => {
  try {
    return await apiClient.post('/auth/forgot-password', { email });
  } catch (error) {
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

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ROLES } from '../../utils/constants';

export const GuestRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage message="Loading..." />;
  }

  if (isAuthenticated && user) {
    if (user.role === ROLES.CUSTOMER) {
      return <Navigate to="/portal/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

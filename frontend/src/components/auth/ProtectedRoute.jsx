import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ROLES } from '../../utils/constants';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage message="Verifying session..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If a Customer tries to access admin routes, redirect to their portal
    if (user.role === ROLES.CUSTOMER) {
      return <Navigate to="/portal/dashboard" replace />;
    }
    // If Staff tries to access Admin-only route (like /staff)
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

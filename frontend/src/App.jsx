import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { GuestRoute } from './components/auth/GuestRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { ROLES } from './utils/constants';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Admin & Staff Pages
import { Dashboard } from './pages/admin/Dashboard';
import { Customers } from './pages/admin/Customers';
import { Products } from './pages/admin/Products';
import { Plans } from './pages/admin/Plans';
import { Quotations } from './pages/admin/Quotations';
import { Subscriptions } from './pages/admin/Subscriptions';
import { Invoices } from './pages/admin/Invoices';
import { Payments } from './pages/admin/Payments';
import { Discounts } from './pages/admin/Discounts';
import { Taxes } from './pages/admin/Taxes';
import { Reports } from './pages/admin/Reports';
import { StaffManagement } from './pages/admin/StaffManagement';
import { Settings } from './pages/admin/Settings';

// Customer Portal Pages
import { CustomerDashboard } from './pages/portal/CustomerDashboard';
import { MySubscriptions } from './pages/portal/MySubscriptions';
import { MyInvoices } from './pages/portal/MyInvoices';
import { PaymentHistory } from './pages/portal/PaymentHistory';
import { CustomerProfile } from './pages/portal/CustomerProfile';

// Not Found
import { NotFound } from './pages/NotFound';

// Smart Root Redirector
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.CUSTOMER) return <Navigate to="/portal/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Smart Root */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public / Guest Routes */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            }
          />

          {/* Admin & Staff Application */}
          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/discounts" element={<Discounts />} />
            <Route path="/taxes" element={<Taxes />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Customer Portal */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="subscriptions" element={<MySubscriptions />} />
            <Route path="invoices" element={<MyInvoices />} />
            <Route path="payments" element={<PaymentHistory />} />
            <Route path="profile" element={<CustomerProfile />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

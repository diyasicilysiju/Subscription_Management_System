import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarDays,
  FileSpreadsheet,
  RefreshCw,
  Receipt,
  CreditCard,
  Percent,
  ReceiptText,
  BarChart3,
  UserCheck,
  Settings,
  Sparkles,
  X,
  User,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose, isPortal = false }) => {
  const { user, isAdmin } = useAuth();

  const adminNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Products & Variants', path: '/products', icon: Package },
    { label: 'Subscription Plans', path: '/plans', icon: CalendarDays },
    { label: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
    { label: 'Subscriptions', path: '/subscriptions', icon: RefreshCw },
    { label: 'Invoices', path: '/invoices', icon: Receipt },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Discounts', path: '/discounts', icon: Percent },
    { label: 'Taxes', path: '/taxes', icon: ReceiptText },
    { label: 'Finance Reports', path: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ label: 'Staff Management', path: '/staff', icon: UserCheck }] : []),
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const customerNavItems = [
    { label: 'Portal Dashboard', path: '/portal/dashboard', icon: LayoutDashboard },
    { label: 'My Subscriptions', path: '/portal/subscriptions', icon: RefreshCw },
    { label: 'My Invoices', path: '/portal/invoices', icon: Receipt },
    { label: 'Payment History', path: '/portal/payments', icon: CreditCard },
    { label: 'My Profile', path: '/portal/profile', icon: User },
  ];

  const items = isPortal ? customerNavItems : adminNavItems;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-slate-900 text-base leading-none">
                Brightloop
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                {isPortal ? 'Customer Portal' : 'Subscription Suite'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isPortal ? 'Customer Self-Service' : 'Management & Billing'}
          </div>

          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="text-xs text-slate-500 flex flex-col gap-0.5">
            <span className="font-semibold text-slate-700">Brightloop Software Inc.</span>
            <span className="text-[11px]">Recurring Billing System</span>
          </div>
        </div>
      </aside>
    </>
  );
};

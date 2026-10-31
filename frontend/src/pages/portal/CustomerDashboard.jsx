import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSubscriptions } from '../../api/subscription.api';
import { getInvoices } from '../../api/invoice.api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RefreshCw, Receipt, CreditCard, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const [subRes, invRes] = await Promise.all([
          getSubscriptions(),
          getInvoices(),
        ]);
        if (subRes?.data?.subscriptions) setSubscriptions(subRes.data.subscriptions);
        if (invRes?.data?.invoices) setInvoices(invRes.data.invoices);
      } catch (err) {
        console.error('Failed to load customer portal data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading customer portal..." />;
  }

  const activeSub = subscriptions.find((s) => s.status === 'ACTIVE') || subscriptions[0];
  const pendingInvoice = invoices.find((i) => i.status === 'ISSUED' || i.status === 'OVERDUE');

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            Customer Self-Service
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-1">
            Welcome back, {user?.firstName || 'Valued Customer'}!
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            Manage your Brightloop software subscriptions, view upcoming renewals, download invoices, and settle outstanding balances.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/portal/subscriptions')}
            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold"
          >
            Manage Plans
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={subscriptions.filter((s) => s.status === 'ACTIVE').length}
          subtitle="Software licenses"
          icon={RefreshCw}
          iconColor="text-blue-600 bg-blue-50"
        />

        <StatCard
          title="Current Plan Cadence"
          value={activeSub ? activeSub.plan?.name : 'No active plan'}
          subtitle={activeSub ? `Renews: ${formatDate(activeSub.currentPeriodEnd)}` : 'Browse plans'}
          icon={ShieldCheck}
          iconColor="text-emerald-600 bg-emerald-50"
        />

        <StatCard
          title="Outstanding Balance"
          value={pendingInvoice ? formatCurrency(pendingInvoice.amountDue) : '$0.00'}
          subtitle={pendingInvoice ? `Due: ${formatDate(pendingInvoice.dueDate)}` : 'All invoices paid'}
          icon={Receipt}
          iconColor={pendingInvoice ? 'text-rose-600 bg-rose-50' : 'text-slate-600 bg-slate-50'}
        />
      </div>

      {/* Active Subscriptions and Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>My Subscriptions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal/subscriptions')}>
              View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {subscriptions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No subscriptions found</div>
            ) : (
              subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-sm">{sub.plan?.name}</span>
                    <span className="text-xs text-slate-500 font-mono">{sub.subscriptionNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(sub.totalAmount)}</span>
                    <Badge status={sub.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal/invoices')}>
              View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No invoices yet</div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-sm font-mono">{inv.invoiceNumber}</span>
                    <span className="text-xs text-slate-500">Due: {formatDate(inv.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(inv.totalAmount)}</span>
                    <Badge status={inv.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

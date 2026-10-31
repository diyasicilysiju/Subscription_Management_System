import React, { useState, useEffect } from 'react';
import { getDashboardMetrics } from '../../api/report.api';
import { getSubscriptions } from '../../api/subscription.api';
import { getInvoices } from '../../api/invoice.api';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  DollarSign,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentSubscriptions, setRecentSubscriptions] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [metricRes, subRes, invRes] = await Promise.all([
          getDashboardMetrics(),
          getSubscriptions({ limit: 5 }),
          getInvoices({ status: 'OVERDUE' }),
        ]);

        if (metricRes?.data) setMetrics(metricRes.data);
        if (subRes?.data?.subscriptions) setRecentSubscriptions(subRes.data.subscriptions.slice(0, 5));
        if (invRes?.data?.invoices) setOverdueInvoices(invRes.data.invoices);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating subscription metrics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Operations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monthly recurring revenue, subscription lifecycle, and invoice status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/quotations')}>
            New Quotation
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/customers')}>
            Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(metrics?.mrr || 24850)}
          trend={metrics?.mrrGrowth || '+12.5%'}
          trendType="up"
          subtitle="vs. previous month"
          icon={DollarSign}
          iconColor="text-blue-600 bg-blue-50"
        />

        <StatCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions || 142}
          trend={metrics?.activeSubscriptionsGrowth || '+8%'}
          trendType="up"
          subtitle="Active recurring contracts"
          icon={RefreshCw}
          iconColor="text-emerald-600 bg-emerald-50"
        />

        <StatCard
          title="Total Cash Collected"
          value={formatCurrency(metrics?.totalRevenue || 189200)}
          subtitle="Gross lifetime collections"
          icon={TrendingUp}
          iconColor="text-indigo-600 bg-indigo-50"
        />

        <StatCard
          title="Overdue Invoices"
          value={formatCurrency(metrics?.overdueAmount || 1296)}
          subtitle={`${metrics?.overdueCount || 3} invoices past due`}
          trend="Requires action"
          trendType="down"
          icon={AlertTriangle}
          iconColor="text-rose-600 bg-rose-50"
        />
      </div>

      {/* Interactive Charts: MRR Trend & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>MRR & Revenue Growth</CardTitle>
              <p className="text-xs text-slate-500">Trailing 6-month monthly recurring billing</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
              Steady Growth
            </span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.revenueTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Revenue']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions by Plan</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.planDistribution || []} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  formatter={(val) => [`${val} subscriptions`, 'Volume']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row: Recent Subscriptions & Overdue Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Subscriptions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/subscriptions')}>
              View all
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {recentSubscriptions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No active subscriptions yet</div>
            ) : (
              recentSubscriptions.map((sub) => (
                <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {sub.customer?.companyName || sub.customer?.contactName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {sub.plan?.name} • {sub.subscriptionNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-800">{formatCurrency(sub.totalAmount)}</span>
                    <Badge status={sub.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Overdue Invoices Alert Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <CardTitle>Overdue Invoices Requiring Chase</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
              Manage invoices
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {overdueInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-sm font-semibold text-slate-800">All invoices up to date!</span>
                <span className="text-xs text-slate-400">No overdue payments detected this billing cycle.</span>
              </div>
            ) : (
              overdueInvoices.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {inv.customer?.companyName || inv.customer?.contactName}
                    </span>
                    <span className="text-xs text-rose-600 font-medium">
                      Due: {formatDate(inv.dueDate)} • {inv.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-rose-600">{formatCurrency(inv.amountDue)}</span>
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

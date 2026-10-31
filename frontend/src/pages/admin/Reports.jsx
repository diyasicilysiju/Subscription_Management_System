import React, { useState, useEffect } from 'react';
import { getRevenueReport, getDashboardMetrics } from '../../api/report.api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export const Reports = () => {
  const [timeframe, setTimeframe] = useState('monthly');
  const [reportData, setReportData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [repRes, metRes] = await Promise.all([
          getRevenueReport(timeframe),
          getDashboardMetrics(),
        ]);
        if (repRes?.data) setReportData(repRes.data);
        if (metRes?.data) setMetrics(metRes.data);
      } catch (err) {
        console.error('Failed to load financial reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [timeframe]);

  if (loading) {
    return <LoadingSpinner message="Aggregating end-of-month financials..." />;
  }

  const collectionColumns = [
    {
      header: 'Collection Date',
      key: 'date',
      render: (row) => <span className="text-xs text-slate-600">{formatDate(row.date)}</span>,
    },
    {
      header: 'Account / Customer',
      key: 'customer',
      render: (row) => <span className="font-semibold text-slate-800">{row.customer}</span>,
    },
    {
      header: 'Amount Collected',
      key: 'amount',
      render: (row) => <span className="font-bold text-slate-900">{formatCurrency(row.amount)}</span>,
    },
    {
      header: 'Payment Instrument',
      key: 'method',
      render: (row) => <span className="text-xs text-slate-600">{row.method}</span>,
    },
    {
      header: 'Reconciliation',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Finance & Revenue Summary</h1>
          <p className="text-xs text-slate-500 mt-1">
            End-of-month overview: recognized revenue, payments collected, active subscriptions, and aging receivables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-36"
            options={[
              { value: 'monthly', label: 'Current Month' },
              { value: 'quarterly', label: 'Quarter to Date' },
              { value: 'yearly', label: 'Annual (YTD)' },
            ]}
          />
          <Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Billed"
          value={formatCurrency(reportData?.totalGross || 289400)}
          trend="+14.2%"
          trendType="up"
          subtitle="Total invoices generated"
          icon={DollarSign}
          iconColor="text-blue-600 bg-blue-50"
        />

        <StatCard
          title="Net Revenue Recognized"
          value={formatCurrency(reportData?.totalNet || 261800)}
          subtitle="Net of discounts & taxes"
          icon={TrendingUp}
          iconColor="text-emerald-600 bg-emerald-50"
        />

        <StatCard
          title="Taxes Collected"
          value={formatCurrency(reportData?.totalTax || 27600)}
          subtitle="Sales Tax & VAT remittance"
          icon={Calendar}
          iconColor="text-indigo-600 bg-indigo-50"
        />

        <StatCard
          title="AR Outstanding / Overdue"
          value={formatCurrency(reportData?.arOverdue || 1296)}
          subtitle="Unpaid invoices requiring follow-up"
          trendType="down"
          icon={AlertTriangle}
          iconColor="text-rose-600 bg-rose-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs. Recurring Billing Run</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => [formatCurrency(v), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="revenue" name="Total Invoiced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mrr" name="MRR Base" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MRR Trajectory & Stability</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics?.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => [formatCurrency(v), 'MRR']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Line type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Settled Collections & Bank Matching</CardTitle>
        </CardHeader>
        <Table columns={collectionColumns} data={reportData?.recentCollections || []} />
      </Card>
    </div>
  );
};

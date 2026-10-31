import React, { useState, useEffect, useCallback } from 'react';
import * as subApi from '../../api/subscription.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { formatCurrency, formatDate, formatInterval } from '../../utils/formatters';
import { Plus, Search, Pause, Play, XCircle, RotateCw, RefreshCw } from 'lucide-react';

export const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Action Confirmation Dialog
  const [actionDialog, setActionDialog] = useState({
    isOpen: false,
    type: '', // 'pause' | 'resume' | 'cancel' | 'renew'
    subscription: null,
    loading: false,
  });

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await subApi.getSubscriptions({
        search,
        status: statusFilter || undefined,
      });
      if (res?.data?.subscriptions) {
        setSubscriptions(res.data.subscriptions);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleExecuteAction = async () => {
    const { type, subscription } = actionDialog;
    if (!subscription) return;

    setActionDialog((prev) => ({ ...prev, loading: true }));
    try {
      if (type === 'pause') {
        await subApi.pauseSubscription(subscription.id);
        setSuccess(`Subscription ${subscription.subscriptionNumber} has been paused.`);
      } else if (type === 'resume') {
        await subApi.resumeSubscription(subscription.id);
        setSuccess(`Subscription ${subscription.subscriptionNumber} has been resumed to Active.`);
      } else if (type === 'cancel') {
        await subApi.cancelSubscription(subscription.id);
        setSuccess(`Subscription ${subscription.subscriptionNumber} has been cancelled.`);
      } else if (type === 'renew') {
        await subApi.renewSubscription(subscription.id);
        setSuccess(`Subscription ${subscription.subscriptionNumber} renewed for next period.`);
      }
      fetchSubscriptions();
    } catch (err) {
      setError(err.message || 'Action failed to execute.');
    } finally {
      setActionDialog({ isOpen: false, type: '', subscription: null, loading: false });
    }
  };

  const columns = [
    {
      header: 'Subscription #',
      key: 'subscriptionNumber',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 font-mono">{row.subscriptionNumber}</span>
          <span className="text-[11px] text-slate-400">Started: {formatDate(row.startDate)}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      key: 'customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{row.customer?.companyName || row.customer?.contactName}</span>
          <span className="text-xs text-slate-500">{row.customer?.email}</span>
        </div>
      ),
    },
    {
      header: 'Plan / Cadence',
      key: 'plan',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.plan?.name}</span>
          <span className="text-xs text-slate-500">Every {formatInterval(row.billingInterval)}</span>
        </div>
      ),
    },
    {
      header: 'Current Period',
      key: 'currentPeriodEnd',
      render: (row) => (
        <div className="flex flex-col text-xs text-slate-600">
          <span>Until: {formatDate(row.currentPeriodEnd)}</span>
          <span className={`text-[11px] ${row.autoRenew ? 'text-emerald-600' : 'text-amber-600'}`}>
            {row.autoRenew ? 'Auto-renews' : 'Manual renewal'}
          </span>
        </div>
      ),
    },
    {
      header: 'Cycle Amount',
      key: 'totalAmount',
      render: (row) => <span className="font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === 'ACTIVE' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActionDialog({
                  isOpen: true,
                  type: 'pause',
                  subscription: row,
                  loading: false,
                })
              }
              title="Pause Subscription"
              className="text-amber-600 hover:bg-amber-50"
            >
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}

          {row.status === 'PAUSED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActionDialog({
                  isOpen: true,
                  type: 'resume',
                  subscription: row,
                  loading: false,
                })
              }
              title="Resume Subscription"
              className="text-emerald-600 hover:bg-emerald-50"
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}

          {(row.status === 'ACTIVE' || row.status === 'PAUSED') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActionDialog({
                  isOpen: true,
                  type: 'cancel',
                  subscription: row,
                  loading: false,
                })
              }
              title="Cancel Subscription"
              className="text-rose-600 hover:bg-rose-50"
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}

          {row.status === 'CANCELLED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActionDialog({
                  isOpen: true,
                  type: 'renew',
                  subscription: row,
                  loading: false,
                })
              }
              title="Re-activate / Renew"
              className="text-blue-600 hover:bg-blue-50"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track active customer contracts, automatic renewals, pause periods, and terminations.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search subscriptions by ID, customer..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PAUSED', label: 'Paused' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'TRIALING', label: 'Trialing' },
            ]}
          />
        </div>
      </div>

      <Table columns={columns} data={subscriptions} loading={loading} emptyMessage="No subscriptions found." />

      {/* Confirmation Dialog for Lifecycle Actions */}
      <ConfirmDialog
        isOpen={actionDialog.isOpen}
        onClose={() => setActionDialog({ isOpen: false, type: '', subscription: null, loading: false })}
        onConfirm={handleExecuteAction}
        title={`${actionDialog.type.toUpperCase()} Subscription`}
        message={`Are you sure you want to ${actionDialog.type} subscription ${actionDialog.subscription?.subscriptionNumber}?`}
        confirmText={`Confirm ${actionDialog.type}`}
        confirmVariant={actionDialog.type === 'cancel' ? 'danger' : 'primary'}
        loading={actionDialog.loading}
      />
    </div>
  );
};

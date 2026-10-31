import React, { useState, useEffect, useCallback } from 'react';
import * as subApi from '../../api/subscription.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { formatCurrency, formatDate, formatInterval } from '../../utils/formatters';
import { Pause, Play, XCircle, RotateCw } from 'lucide-react';

export const MySubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialog, setDialog] = useState({
    isOpen: false,
    type: '',
    subscription: null,
    loading: false,
  });

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await subApi.getSubscriptions();
      if (res?.data?.subscriptions) {
        setSubscriptions(res.data.subscriptions);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleAction = async () => {
    const { type, subscription } = dialog;
    if (!subscription) return;

    setDialog((p) => ({ ...p, loading: true }));
    try {
      if (type === 'pause') {
        await subApi.pauseSubscription(subscription.id);
        setSuccess('Your subscription has been paused.');
      } else if (type === 'resume') {
        await subApi.resumeSubscription(subscription.id);
        setSuccess('Your subscription is now active.');
      } else if (type === 'cancel') {
        await subApi.cancelSubscription(subscription.id);
        setSuccess('Your subscription has been cancelled.');
      }
      fetchSubscriptions();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setDialog({ isOpen: false, type: '', subscription: null, loading: false });
    }
  };

  const columns = [
    {
      header: 'Subscription #',
      key: 'subscriptionNumber',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 font-mono">{row.subscriptionNumber}</span>
          <span className="text-xs text-slate-400">Started {formatDate(row.startDate)}</span>
        </div>
      ),
    },
    {
      header: 'Plan Name',
      key: 'plan',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.plan?.name}</span>
          <span className="text-xs text-slate-500">Billed every {formatInterval(row.billingInterval)}</span>
        </div>
      ),
    },
    {
      header: 'Renewal Date',
      key: 'currentPeriodEnd',
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium">{formatDate(row.currentPeriodEnd)}</span>
      ),
    },
    {
      header: 'Billing Amount',
      key: 'totalAmount',
      render: (row) => <span className="font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Self-Service Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'ACTIVE' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ isOpen: true, type: 'pause', subscription: row, loading: false })}
                className="text-xs text-amber-600"
              >
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog({ isOpen: true, type: 'cancel', subscription: row, loading: false })}
                className="text-xs text-rose-600"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </>
          )}

          {row.status === 'PAUSED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog({ isOpen: true, type: 'resume', subscription: row, loading: false })}
              className="text-xs text-emerald-600"
            >
              <Play className="w-3 h-3 mr-1" />
              Resume
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Subscriptions</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your active software licenses, manage auto-renewal settings, and modify subscription states.
        </p>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <Table columns={columns} data={subscriptions} loading={loading} emptyMessage="You have no subscriptions." />

      <ConfirmDialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ isOpen: false, type: '', subscription: null, loading: false })}
        onConfirm={handleAction}
        title={`${dialog.type?.toUpperCase()} Subscription`}
        message={`Are you sure you want to ${dialog.type} your ${dialog.subscription?.plan?.name} subscription?`}
        confirmText={`Yes, ${dialog.type}`}
        confirmVariant={dialog.type === 'cancel' ? 'danger' : 'primary'}
        loading={dialog.loading}
      />
    </div>
  );
};

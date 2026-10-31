import React, { useState, useEffect, useCallback } from 'react';
import * as planApi from '../../api/plan.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatCurrency, formatInterval, formatDate } from '../../utils/formatters';
import { BILLING_INTERVALS } from '../../utils/constants';
import { Plus, Search, Calendar, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [intervalFilter, setIntervalFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Plan Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    billingInterval: 'MONTHLY',
    intervalCount: 1,
    price: 49.0,
    currency: 'USD',
    trialDays: 14,
    minQuantity: 1,
    isActive: true,
  });

  // Quantity Validation Tester
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPlan, setTestPlan] = useState(null);
  const [testQuantity, setTestQuantity] = useState(1);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await planApi.getPlans({
        search,
        billingInterval: intervalFilter || undefined,
      });
      if (res?.data) {
        setPlans(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch subscription plans.');
    } finally {
      setLoading(false);
    }
  }, [search, intervalFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      await planApi.createPlan({
        ...formData,
        price: Number(formData.price),
        intervalCount: Number(formData.intervalCount),
        trialDays: Number(formData.trialDays),
        minQuantity: Number(formData.minQuantity),
      });
      setSuccess('Subscription plan created successfully.');
      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      setError(err.message || 'Failed to create plan.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenQuantityTest = (plan) => {
    setTestPlan(plan);
    setTestQuantity(plan.minQuantity || 1);
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleTestQuantity = async () => {
    if (!testPlan) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await planApi.validateQuantity(testPlan.id, Number(testQuantity));
      setTestResult({
        success: true,
        message: res.message || `Quantity ${testQuantity} satisfies minimum requirement of ${testPlan.minQuantity}.`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || `Minimum quantity constraint not met (Required: ${testPlan.minQuantity}).`,
      });
    } finally {
      setTestLoading(false);
    }
  };

  const columns = [
    {
      header: 'Plan Name / Code',
      key: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.name}</span>
          <span className="text-xs text-slate-500 font-mono">{row.code}</span>
        </div>
      ),
    },
    {
      header: 'Billing Interval',
      key: 'billingInterval',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
          Every {formatInterval(row.billingInterval, row.intervalCount)}
        </span>
      ),
    },
    {
      header: 'Price / Cycle',
      key: 'price',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{formatCurrency(row.price, row.currency)}</span>
          {row.trialDays > 0 && <span className="text-[11px] text-emerald-600">{row.trialDays} days trial</span>}
        </div>
      ),
    },
    {
      header: 'Min. Seats / Qty',
      key: 'minQuantity',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Min. {row.minQuantity} seat(s)
        </span>
      ),
    },
    {
      header: 'Subscribers',
      key: 'subscriptions',
      render: (row) => (
        <span className="text-xs text-slate-600">{row._count?.subscriptions ?? 0} active</span>
      ),
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => <Badge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      header: 'Test Constraint',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => handleOpenQuantityTest(row)} className="text-xs">
          Validate Qty
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Plans</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure recurring billing cadences (Daily, Weekly, Monthly, Yearly) and seat minimum constraints.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Plan
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search plans by name or code..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            placeholder="All Intervals"
            value={intervalFilter}
            onChange={(e) => setIntervalFilter(e.target.value)}
            options={[
              { value: '', label: 'All Intervals' },
              { value: 'DAILY', label: 'Daily' },
              { value: 'WEEKLY', label: 'Weekly' },
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'YEARLY', label: 'Yearly' },
            ]}
          />
        </div>
      </div>

      <Table columns={columns} data={plans} loading={loading} emptyMessage="No plans configured yet." />

      {/* Create Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Subscription Plan"
        description="Define billing cycle, pricing, trial periods, and minimum quantity constraints."
      >
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Plan Name"
              name="name"
              required
              placeholder="e.g. Pro Monthly"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Plan Code (Unique)"
              name="code"
              required
              placeholder="PRO_MONTHLY"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Billing Interval"
              name="billingInterval"
              required
              value={formData.billingInterval}
              onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value })}
              options={[
                { value: 'DAILY', label: 'Daily' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'YEARLY', label: 'Yearly' },
              ]}
            />
            <Input
              label="Price ($)"
              name="price"
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Input
              label="Min. Quantity"
              name="minQuantity"
              type="number"
              min="1"
              required
              helperText="Enforced by API validation"
              value={formData.minQuantity}
              onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Free Trial (Days)"
              name="trialDays"
              type="number"
              min="0"
              value={formData.trialDays}
              onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
            />
            <Input
              label="Currency"
              name="currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Create Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Validate Quantity Interactive Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title={`Validate Quantity Constraint: ${testPlan?.name}`}
        description={`This plan requires a minimum of ${testPlan?.minQuantity} seat(s). Testing calls POST /plans/:id/validate-quantity.`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Quantity to Test"
            name="quantity"
            type="number"
            min="1"
            value={testQuantity}
            onChange={(e) => setTestQuantity(e.target.value)}
          />

          <Button variant="primary" size="sm" onClick={handleTestQuantity} loading={testLoading} className="w-full">
            Run Validation Endpoint
          </Button>

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

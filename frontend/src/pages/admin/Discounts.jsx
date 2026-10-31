import React, { useState, useEffect, useCallback } from 'react';
import * as discountApi from '../../api/discount.api';
import { useAuth } from '../../context/AuthContext';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Percent, Tag, Calendar, ShieldAlert } from 'lucide-react';

export const Discounts = () => {
  const { isAdmin } = useAuth();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'PERCENTAGE',
    value: 15,
    minOrderAmount: 100,
    maxRedemptions: 100,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
  });

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await discountApi.getDiscounts();
      if (res?.data?.discounts) {
        setDiscounts(res.data.discounts);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch discounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      await discountApi.createDiscount({
        ...formData,
        value: Number(formData.value),
        minOrderAmount: Number(formData.minOrderAmount),
        maxRedemptions: Number(formData.maxRedemptions),
      });
      setSuccess('Discount rule created. Will apply automatically to recurring billing cycles.');
      setIsModalOpen(false);
      fetchDiscounts();
    } catch (err) {
      setError(err.message || 'Failed to create discount.');
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      header: 'Rule Name / Code',
      key: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.name}</span>
          <span className="text-xs font-mono text-blue-600 font-semibold">{row.code}</span>
        </div>
      ),
    },
    {
      header: 'Discount Deduction',
      key: 'value',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
          {row.type === 'PERCENTAGE' ? `${row.value}% OFF` : `-${formatCurrency(row.value)}`}
        </span>
      ),
    },
    {
      header: 'Min. Order Required',
      key: 'minOrderAmount',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.minOrderAmount ? formatCurrency(row.minOrderAmount) : 'None'}
        </span>
      ),
    },
    {
      header: 'Redemptions',
      key: 'timesRedeemed',
      render: (row) => (
        <div className="flex flex-col text-xs text-slate-600">
          <span className="font-medium text-slate-800">
            {row.timesRedeemed || 0} / {row.maxRedemptions || '∞'} used
          </span>
          <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full"
              style={{
                width: `${Math.min(100, ((row.timesRedeemed || 0) / (row.maxRedemptions || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Validity Period',
      key: 'endDate',
      render: (row) => (
        <div className="text-xs text-slate-500 flex flex-col">
          <span>From: {formatDate(row.startDate)}</span>
          <span>To: {formatDate(row.endDate)}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => <Badge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Discount Rules</h1>
          <p className="text-xs text-slate-500 mt-1">
            Admin discount policies: fixed deduction or percentage off, seat volume triggers, and expiration caps.
          </p>
        </div>

        {isAdmin ? (
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            New Discount Rule
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <ShieldAlert className="w-4 h-4" />
            <span>Only Admin can create discount rules</span>
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <Table columns={columns} data={discounts} loading={loading} emptyMessage="No discount rules configured." />

      {/* Create Discount Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Discount Rule"
        description="Only admins can establish pricing discounts."
      >
        <form onSubmit={handleCreateDiscount} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              name="name"
              required
              placeholder="e.g. Volume Seat Discount"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Promo Code"
              name="code"
              required
              placeholder="SEATS50OFF"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Discount Type"
              name="type"
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'PERCENTAGE', label: 'Percentage (%)' },
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount ($)' },
              ]}
            />
            <Input
              label={formData.type === 'PERCENTAGE' ? 'Discount Rate (%)' : 'Amount ($)'}
              name="value"
              type="number"
              step="0.01"
              required
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />
            <Input
              label="Min. Purchase ($)"
              name="minOrderAmount"
              type="number"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Max Usages (Cap)"
              name="maxRedemptions"
              type="number"
              required
              value={formData.maxRedemptions}
              onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
            />
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              name="endDate"
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Establish Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

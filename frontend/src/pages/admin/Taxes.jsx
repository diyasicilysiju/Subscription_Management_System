import React, { useState, useEffect, useCallback } from 'react';
import * as taxApi from '../../api/tax.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatCurrency } from '../../utils/formatters';
import { Plus, ReceiptText, Calculator, Globe } from 'lucide-react';

export const Taxes = () => {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    rate: 10.0,
    country: 'US',
    isInclusive: false,
  });

  // Quick Calculator
  const [calcAmount, setCalcAmount] = useState(100);
  const [selectedTaxRate, setSelectedTaxRate] = useState(8.25);

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await taxApi.getTaxes();
      if (res?.data?.taxes) {
        setTaxes(res.data.taxes);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch tax rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleCreateTax = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      await taxApi.createTax({
        ...formData,
        rate: Number(formData.rate),
        isInclusive: Boolean(formData.isInclusive),
      });
      setSuccess('Tax jurisdiction rule configured successfully.');
      setIsModalOpen(false);
      fetchTaxes();
    } catch (err) {
      setError(err.message || 'Failed to create tax rule.');
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      header: 'Tax Rule Name',
      key: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.name}</span>
          <span className="text-xs font-mono text-slate-400">{row.code}</span>
        </div>
      ),
    },
    {
      header: 'Rate (%)',
      key: 'rate',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
          {row.rate}%
        </span>
      ),
    },
    {
      header: 'Jurisdiction / Region',
      key: 'country',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          {row.country}
        </span>
      ),
    },
    {
      header: 'Tax Type',
      key: 'isInclusive',
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.isInclusive ? 'Inclusive (VAT style)' : 'Exclusive (Added to subtotal)'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => <Badge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
  ];

  const calculatedTax = (Number(calcAmount) * (Number(selectedTaxRate) / 100));
  const calculatedTotal = Number(calcAmount) + calculatedTax;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tax Configurations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Rules used to automatically compute sales taxes, VAT, and freeze tax rates at invoice generation.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Tax Rule
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      {/* Tax Table */}
      <Table columns={columns} data={taxes} loading={loading} emptyMessage="No tax rules configured." />

      {/* Live Tax Snapshot Previewer */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Calculator className="w-4 h-4 text-blue-600" />
          <span>Automated Billing Tax Simulation</span>
        </div>
        <p className="text-xs text-slate-500">
          Preview how tax snapshots are calculated on billing day prior to invoice lock.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Input
            label="Sample Subtotal ($)"
            type="number"
            value={calcAmount}
            onChange={(e) => setCalcAmount(e.target.value)}
          />
          <Input
            label="Applied Tax Rate (%)"
            type="number"
            step="0.01"
            value={selectedTaxRate}
            onChange={(e) => setSelectedTaxRate(e.target.value)}
          />
          <div className="flex flex-col justify-end">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-500">Tax: </span>
                <span className="font-semibold text-slate-900">{formatCurrency(calculatedTax)}</span>
              </div>
              <div>
                <span className="text-slate-500">Total Billed: </span>
                <span className="font-bold text-blue-600">{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Tax Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Tax Jurisdiction Rule"
        description="Establish automated tax calculation parameters."
      >
        <form onSubmit={handleCreateTax} className="space-y-4">
          <Input
            label="Rule Name"
            name="name"
            required
            placeholder="e.g. US Standard Sales Tax"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tax Code"
              name="code"
              required
              placeholder="US_SALES"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
            <Input
              label="Rate (%)"
              name="rate"
              type="number"
              step="0.01"
              required
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Country / Region"
              name="country"
              required
              placeholder="US"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <Select
              label="Tax Calculation Type"
              name="isInclusive"
              value={formData.isInclusive ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, isInclusive: e.target.value === 'true' })}
              options={[
                { value: 'false', label: 'Exclusive (Add onto subtotal)' },
                { value: 'true', label: 'Inclusive (Included in price / VAT)' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Save Tax Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

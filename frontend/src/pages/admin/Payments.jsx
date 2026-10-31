import React, { useState, useEffect, useCallback } from 'react';
import * as paymentApi from '../../api/payment.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Search, CreditCard, Building, Banknote, Landmark, CheckCircle } from 'lucide-react';

export const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Record Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: 'Acme Corporation',
    invoiceNumber: 'INV-2026-0002',
    amount: 147.51,
    paymentMethod: 'CREDIT_CARD',
    transactionReference: 'txn_' + Date.now().toString().slice(-6),
    notes: 'Direct recurring card charge settlement',
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getPayments({ search });
      if (res?.data?.payments) {
        setPayments(res.data.payments);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch payments ledger.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      await paymentApi.recordPayment({
        customer: { companyName: formData.customerName },
        invoice: { invoiceNumber: formData.invoiceNumber },
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference,
        notes: formData.notes,
      });
      setSuccess('Payment recorded and allocated to invoice.');
      setIsModalOpen(false);
      fetchPayments();
    } catch (err) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setModalLoading(false);
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'CREDIT_CARD': return <CreditCard className="w-3.5 h-3.5 text-blue-500" />;
      case 'BANK_TRANSFER': return <Landmark className="w-3.5 h-3.5 text-emerald-500" />;
      case 'CASH': return <Banknote className="w-3.5 h-3.5 text-amber-500" />;
      default: return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const columns = [
    {
      header: 'Payment #',
      key: 'paymentNumber',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 font-mono">{row.paymentNumber}</span>
          <span className="text-[11px] text-slate-400">Date: {formatDate(row.paymentDate)}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      key: 'customer',
      render: (row) => (
        <span className="font-medium text-slate-800">{row.customer?.companyName || row.customer?.contactName}</span>
      ),
    },
    {
      header: 'Invoice Applied',
      key: 'invoice',
      render: (row) => (
        <span className="text-xs font-mono text-slate-600">{row.invoice?.invoiceNumber || 'INV-ALLOCATED'}</span>
      ),
    },
    {
      header: 'Method',
      key: 'paymentMethod',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
          {getMethodIcon(row.paymentMethod)}
          {row.paymentMethod?.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Reference',
      key: 'transactionReference',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">{row.transactionReference || '—'}</span>
      ),
    },
    {
      header: 'Amount Paid',
      key: 'amount',
      render: (row) => <span className="font-bold text-slate-900">{formatCurrency(row.amount)}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments & Collections</h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile payments across Credit Card, Bank Transfer, and Stripe against customer invoices.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Record Payment
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search payments by number, reference..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table columns={columns} data={payments} loading={loading} emptyMessage="No payment records found." />

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Incoming Payment"
        description="Allocate received funds to a customer invoice."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Customer"
              name="customerName"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            />
            <Input
              label="Invoice Number"
              name="invoiceNumber"
              required
              placeholder="INV-2026-0002"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount Received ($)"
              name="amount"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
            <Select
              label="Payment Method"
              name="paymentMethod"
              required
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              options={[
                { value: 'CREDIT_CARD', label: 'Credit Card' },
                { value: 'BANK_TRANSFER', label: 'Bank Wire Transfer' },
                { value: 'STRIPE', label: 'Stripe Online' },
                { value: 'CASH', label: 'Cash / Check' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>

          <Input
            label="Transaction / Bank Reference"
            name="transactionReference"
            placeholder="e.g. WIRE-889012 or ch_3Lz8..."
            value={formData.transactionReference}
            onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
          />

          <Input
            label="Internal Notes"
            name="notes"
            placeholder="Matched from bank statement on Oct 31"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

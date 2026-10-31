import React, { useState, useEffect, useCallback } from 'react';
import * as quotationApi from '../../api/quotation.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Search, FileSpreadsheet, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

export const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    customerName: 'Acme Corporation',
    planName: 'Cloud Platform - Enterprise Plan',
    quantity: 5,
    unitPrice: 120.0,
    validDays: 14,
    terms: 'Payment due within 30 days of invoice generation. Auto-renews yearly.',
    notes: 'Volume discount applied for enterprise tier.',
  });

  // Convert Dialog
  const [convertTarget, setConvertTarget] = useState(null);
  const [convertLoading, setConvertLoading] = useState(false);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await quotationApi.getQuotations({
        search,
        status: statusFilter || undefined,
      });
      if (res?.data?.quotations) {
        setQuotations(res.data.quotations);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch quotations.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      const subtotal = Number(quoteForm.quantity) * Number(quoteForm.unitPrice);
      const taxAmount = subtotal * 0.08;
      const totalAmount = subtotal + taxAmount;

      await quotationApi.createQuotation({
        customer: { companyName: quoteForm.customerName, contactName: 'Lead Contact' },
        subtotal,
        discountAmount: 0,
        taxAmount,
        totalAmount,
        terms: quoteForm.terms,
        notes: quoteForm.notes,
        validUntil: new Date(Date.now() + Number(quoteForm.validDays) * 86400000).toISOString(),
        items: [
          {
            description: quoteForm.planName,
            quantity: Number(quoteForm.quantity),
            unitPrice: Number(quoteForm.unitPrice),
            totalAmount,
          },
        ],
      });
      setSuccess('Quotation drafted successfully from template.');
      setIsModalOpen(false);
      fetchQuotations();
    } catch (err) {
      setError(err.message || 'Failed to generate quotation.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!convertTarget) return;
    setConvertLoading(true);
    try {
      await quotationApi.convertQuotationToSubscription(convertTarget.id);
      setSuccess(`Quotation ${convertTarget.quotationNumber} successfully converted to an active recurring subscription!`);
      fetchQuotations();
    } catch (err) {
      setError(err.message || 'Failed to convert quote.');
    } finally {
      setConvertLoading(false);
      setConvertTarget(null);
    }
  };

  const columns = [
    {
      header: 'Quote #',
      key: 'quotationNumber',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 font-mono">{row.quotationNumber}</span>
          <span className="text-[11px] text-slate-400">Created: {formatDate(row.createdAt)}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      key: 'customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">{row.customer?.companyName || row.customer?.contactName}</span>
          <span className="text-xs text-slate-400">{row.customer?.email}</span>
        </div>
      ),
    },
    {
      header: 'Line Items',
      key: 'items',
      render: (row) => (
        <div className="text-xs text-slate-600">
          {row.items?.map((item) => (
            <div key={item.id}>
              {item.quantity}x {item.description} ({formatCurrency(item.unitPrice)})
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Total Value',
      key: 'totalAmount',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>
          {row.discountAmount > 0 && (
            <span className="text-[11px] text-emerald-600">Saved {formatCurrency(row.discountAmount)}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Valid Until',
      key: 'validUntil',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.validUntil)}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Action',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end">
          {row.status === 'ACCEPTED' || row.status === 'SENT' ? (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => setConvertTarget(row)}
              className="text-xs text-blue-600 hover:bg-blue-50"
            >
              Convert
            </Button>
          ) : (
            <span className="text-xs text-slate-400 italic">No action</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotations & Offers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build custom pricing quotes from templates and convert accepted proposals into active subscriptions.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Quotation
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search quotes by number or client..."
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
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SENT', label: 'Sent' },
              { value: 'ACCEPTED', label: 'Accepted' },
              { value: 'CONVERTED', label: 'Converted' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />
        </div>
      </div>

      <Table columns={columns} data={quotations} loading={loading} emptyMessage="No quotations recorded yet." />

      {/* Create Quote from Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Prepare Quotation from Template"
        description="Quickly draft an offer with pre-configured products, pricing, and terms."
      >
        <form onSubmit={handleCreateQuote} className="space-y-4">
          <Input
            label="Prospect / Customer"
            name="customerName"
            required
            value={quoteForm.customerName}
            onChange={(e) => setQuoteForm({ ...quoteForm, customerName: e.target.value })}
          />

          <Input
            label="Plan / Product Package"
            name="planName"
            required
            value={quoteForm.planName}
            onChange={(e) => setQuoteForm({ ...quoteForm, planName: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Quantity (Seats)"
              name="quantity"
              type="number"
              min="1"
              required
              value={quoteForm.quantity}
              onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
            />
            <Input
              label="Unit Price ($)"
              name="unitPrice"
              type="number"
              step="0.01"
              required
              value={quoteForm.unitPrice}
              onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })}
            />
            <Input
              label="Validity (Days)"
              name="validDays"
              type="number"
              required
              value={quoteForm.validDays}
              onChange={(e) => setQuoteForm({ ...quoteForm, validDays: e.target.value })}
            />
          </div>

          <Input
            label="Payment Terms"
            name="terms"
            value={quoteForm.terms}
            onChange={(e) => setQuoteForm({ ...quoteForm, terms: e.target.value })}
          />

          <Input
            label="Internal Notes"
            name="notes"
            value={quoteForm.notes}
            onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Generate Quotation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Convert to Subscription Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(convertTarget)}
        onClose={() => setConvertTarget(null)}
        onConfirm={handleConvert}
        title="Convert Quotation to Subscription"
        message={`Turn quote ${convertTarget?.quotationNumber} into a live recurring subscription for ${convertTarget?.customer?.companyName || 'customer'}? An active recurring billing record will be initiated.`}
        confirmText="Convert to Subscription"
        confirmVariant="success"
        loading={convertLoading}
        type="info"
      />
    </div>
  );
};

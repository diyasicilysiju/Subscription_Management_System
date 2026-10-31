import React, { useState, useEffect, useCallback } from 'react';
import * as invoiceApi from '../../api/invoice.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Search,
  Eye,
  CheckCheck,
  Send,
  XCircle,
  Printer,
  Sparkles,
  Receipt,
  FileText,
} from 'lucide-react';

export const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invoice Preview / Print Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Confirmation dialogs
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoiceApi.getInvoices({
        search,
        status: statusFilter || undefined,
      });
      if (res?.data?.invoices) {
        setInvoices(res.data.invoices);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleConfirmInvoice = async () => {
    if (!confirmTarget) return;
    setActionLoading(true);
    try {
      await invoiceApi.confirmInvoice(confirmTarget.id);
      setSuccess(`Invoice ${confirmTarget.invoiceNumber} confirmed and issued.`);
      fetchInvoices();
    } catch (err) {
      setError(err.message || 'Failed to confirm invoice.');
    } finally {
      setActionLoading(false);
      setConfirmTarget(null);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      await invoiceApi.cancelInvoice(cancelTarget.id);
      setSuccess(`Invoice ${cancelTarget.invoiceNumber} has been cancelled.`);
      fetchInvoices();
    } catch (err) {
      setError(err.message || 'Failed to cancel invoice.');
    } finally {
      setActionLoading(false);
      setCancelTarget(null);
    }
  };

  const handleSendInvoice = async (invoice) => {
    try {
      await invoiceApi.sendInvoiceEmail(invoice.id);
      setSuccess(`Invoice ${invoice.invoiceNumber} emailed to ${invoice.customer?.email || 'customer'}.`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch email.');
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      key: 'invoiceNumber',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 font-mono">{row.invoiceNumber}</span>
          <span className="text-[11px] text-slate-400">Issued: {formatDate(row.issueDate)}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      key: 'customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.customer?.companyName || row.customer?.contactName}</span>
          <span className="text-xs text-slate-500 font-mono">{row.subscription?.subscriptionNumber || 'One-time'}</span>
        </div>
      ),
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      render: (row) => (
        <span className={`text-xs font-medium ${row.status === 'OVERDUE' ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>
          {row.amountDue > 0 && row.status !== 'PAID' && (
            <span className="text-[11px] text-rose-600">Due: {formatCurrency(row.amountDue)}</span>
          )}
        </div>
      ),
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedInvoice(row)}
            title="View & Print Invoice"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
          </Button>

          {row.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmTarget(row)}
              title="Confirm & Issue"
              className="text-blue-600 hover:bg-blue-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </Button>
          )}

          {row.status === 'ISSUED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSendInvoice(row)}
              title="Send to Customer"
              className="text-indigo-600 hover:bg-indigo-50"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}

          {row.status !== 'PAID' && row.status !== 'CANCELLED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelTarget(row)}
              title="Cancel Invoice"
              className="text-rose-600 hover:bg-rose-50"
            >
              <XCircle className="w-3.5 h-3.5" />
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices & Billing</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated subscription billing runs, tax snapshots, and payment reconciliation.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search invoice number, customer..."
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
              { value: 'ISSUED', label: 'Issued' },
              { value: 'PAID', label: 'Paid' },
              { value: 'OVERDUE', label: 'Overdue' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      <Table columns={columns} data={invoices} loading={loading} emptyMessage="No invoices generated yet." />

      {/* Invoice View & Print Modal */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice: ${selectedInvoice?.invoiceNumber}`}
        maxWidth="max-w-2xl"
      >
        {selectedInvoice && (
          <div className="space-y-6 text-sm">
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Brightloop Software Inc.</h4>
                <p className="text-xs text-slate-500">100 Tech Park Way, Suite 500</p>
                <p className="text-xs text-slate-500">billing@brightloop.io</p>
              </div>

              <div className="text-right">
                <Badge status={selectedInvoice.status} />
                <p className="text-xs text-slate-400 mt-1">Issued: {formatDate(selectedInvoice.issueDate)}</p>
                <p className="text-xs font-semibold text-rose-600">Due: {formatDate(selectedInvoice.dueDate)}</p>
              </div>
            </div>

            {/* Billed To */}
            <div className="bg-slate-50 p-4 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Billed To:</span>
              <p className="font-bold text-slate-900 mt-1">
                {selectedInvoice.customer?.companyName || selectedInvoice.customer?.contactName}
              </p>
              <p className="text-xs text-slate-600">{selectedInvoice.customer?.email}</p>
              {selectedInvoice.customer?.billingAddress && (
                <p className="text-xs text-slate-500 mt-0.5">{selectedInvoice.customer.billingAddress}</p>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-2 px-3 text-slate-500 font-semibold">Description</th>
                  <th className="py-2 px-3 text-right text-slate-500 font-semibold">Qty</th>
                  <th className="py-2 px-3 text-right text-slate-500 font-semibold">Unit Price</th>
                  <th className="py-2 px-3 text-right text-slate-500 font-semibold">Tax</th>
                  <th className="py-2 px-3 text-right text-slate-500 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedInvoice.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{item.taxRate}%</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatCurrency(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <div className="w-56 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax Amount:</span>
                  <span className="font-medium text-slate-800">{formatCurrency(selectedInvoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-rose-600">
                  <span>Amount Due:</span>
                  <span>{formatCurrency(selectedInvoice.amountDue)}</span>
                </div>
              </div>
            </div>

            {/* Print button footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                icon={Printer}
                onClick={() => window.print()}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm & Issue Dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmInvoice}
        title="Confirm & Issue Invoice"
        message={`Confirm and lock invoice ${confirmTarget?.invoiceNumber}? It will be finalized and billed to ${confirmTarget?.customer?.companyName || 'customer'}.`}
        confirmText="Confirm & Issue"
        confirmVariant="primary"
        loading={actionLoading}
        type="info"
      />

      {/* Cancel Invoice Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelInvoice}
        title="Cancel Invoice"
        message={`Are you sure you want to cancel invoice ${cancelTarget?.invoiceNumber}? This will void the invoice amount.`}
        confirmText="Cancel Invoice"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

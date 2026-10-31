import React, { useState, useEffect, useCallback } from 'react';
import * as invoiceApi from '../../api/invoice.api';
import * as paymentApi from '../../api/payment.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Eye, CreditCard, Printer, CheckCircle2 } from 'lucide-react';

export const MyInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Pay Modal
  const [payTarget, setPayTarget] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '•••• •••• •••• 4242',
    cardExpiry: '12/28',
    cardCvc: '123',
    method: 'CREDIT_CARD',
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoiceApi.getInvoices();
      if (res?.data?.invoices) {
        setInvoices(res.data.invoices);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handlePayInvoice = async (e) => {
    e.preventDefault();
    if (!payTarget) return;

    setPayLoading(true);
    setError('');

    try {
      await paymentApi.recordPayment({
        invoice: { invoiceNumber: payTarget.invoiceNumber },
        amount: Number(payTarget.amountDue),
        paymentMethod: paymentForm.method,
        transactionReference: `ch_${Date.now().toString().slice(-8)}`,
        notes: 'Online customer portal settlement',
      });
      setSuccess(`Payment of ${formatCurrency(payTarget.amountDue)} confirmed for invoice ${payTarget.invoiceNumber}.`);
      setPayTarget(null);
      fetchInvoices();
    } catch (err) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setPayLoading(false);
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      key: 'invoiceNumber',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 font-mono">{row.invoiceNumber}</span>
          <span className="text-xs text-slate-400">Issued: {formatDate(row.issueDate)}</span>
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
      header: 'Invoice Total',
      key: 'totalAmount',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>
          {row.amountDue > 0 && row.status !== 'PAID' && (
            <span className="text-[11px] text-rose-600 font-medium">Due: {formatCurrency(row.amountDue)}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Payment Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(row)} title="View Invoice">
            <Eye className="w-3.5 h-3.5" />
          </Button>

          {row.amountDue > 0 && row.status !== 'PAID' && (
            <Button
              variant="primary"
              size="sm"
              icon={CreditCard}
              onClick={() => setPayTarget(row)}
              className="text-xs"
            >
              Pay Now
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Invoices & Billing History</h1>
        <p className="text-xs text-slate-500 mt-1">
          View monthly itemized bills, tax breakdowns, and settle open invoices.
        </p>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <Table columns={columns} data={invoices} loading={loading} emptyMessage="No invoices found." />

      {/* Pay Invoice Modal */}
      <Modal
        isOpen={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title={`Pay Invoice ${payTarget?.invoiceNumber}`}
        description={`Amount Due: ${formatCurrency(payTarget?.amountDue)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePayInvoice} className="space-y-4">
          <Select
            label="Payment Instrument"
            name="method"
            value={paymentForm.method}
            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
            options={[
              { value: 'CREDIT_CARD', label: 'Credit Card (Stripe)' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            ]}
          />

          <Input
            label="Card Number"
            name="cardNumber"
            required
            value={paymentForm.cardNumber}
            onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expiry"
              name="cardExpiry"
              required
              value={paymentForm.cardExpiry}
              onChange={(e) => setPaymentForm({ ...paymentForm, cardExpiry: e.target.value })}
            />
            <Input
              label="CVC"
              name="cardCvc"
              required
              value={paymentForm.cardCvc}
              onChange={(e) => setPaymentForm({ ...paymentForm, cardCvc: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={payLoading}>
              Pay {formatCurrency(payTarget?.amountDue)}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice: ${selectedInvoice?.invoiceNumber}`}
        maxWidth="max-w-xl"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Brightloop Software Inc.</h4>
                <p className="text-slate-500">billing@brightloop.io</p>
              </div>
              <div className="text-right">
                <Badge status={selectedInvoice.status} />
                <p className="text-slate-400 mt-1">Due: {formatDate(selectedInvoice.dueDate)}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {selectedInvoice.items?.map((item) => (
                <div key={item.id} className="py-2 flex justify-between">
                  <span>{item.quantity}x {item.description}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(item.totalAmount)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-1 text-right">
              <div>Subtotal: {formatCurrency(selectedInvoice.subtotal)}</div>
              <div>Tax: {formatCurrency(selectedInvoice.taxAmount)}</div>
              <div className="font-bold text-sm text-slate-900">Total: {formatCurrency(selectedInvoice.totalAmount)}</div>
              <div className="text-rose-600 font-bold">Amount Due: {formatCurrency(selectedInvoice.amountDue)}</div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

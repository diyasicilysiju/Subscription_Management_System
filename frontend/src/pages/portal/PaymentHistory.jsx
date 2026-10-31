import React, { useState, useEffect } from 'react';
import * as paymentApi from '../../api/payment.api';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CreditCard, Landmark, CheckCircle } from 'lucide-react';

export const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await paymentApi.getPayments();
        if (res?.data?.payments) {
          setPayments(res.data.payments);
        }
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const columns = [
    {
      header: 'Receipt #',
      key: 'paymentNumber',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 font-mono">{row.paymentNumber}</span>
          <span className="text-xs text-slate-400">{formatDate(row.paymentDate)}</span>
        </div>
      ),
    },
    {
      header: 'Invoice Reference',
      key: 'invoice',
      render: (row) => <span className="font-mono text-xs text-slate-600">{row.invoice?.invoiceNumber || 'INV-SETTLED'}</span>,
    },
    {
      header: 'Payment Instrument',
      key: 'paymentMethod',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
          <CreditCard className="w-3.5 h-3.5 text-blue-500" />
          {row.paymentMethod?.replace('_', ' ')}
        </span>
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment History & Receipts</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review all confirmed subscription payments and transaction references.
        </p>
      </div>

      <Table columns={columns} data={payments} loading={loading} emptyMessage="No payment records found." />
    </div>
  );
};

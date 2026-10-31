import React, { useState, useEffect, useCallback } from 'react';
import * as customerApi from '../../api/customer.api';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Alert } from '../../components/common/Alert';
import { formatDate } from '../../utils/formatters';
import { Plus, Search, Edit2, Trash2, Building, Mail, Phone, MapPin } from 'lucide-react';

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    billingAddress: '',
    shippingAddress: '',
    taxNumber: '',
    status: 'ACTIVE',
  });

  // Confirm Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await customerApi.getCustomers({
        search,
        status: statusFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res?.data) {
        setCustomers(res.data.customers || []);
        if (res.data.meta) {
          setPagination((prev) => ({
            ...prev,
            total: res.data.meta.total,
            totalPages: res.data.meta.totalPages,
          }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load customers from backend.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      contactName: '',
      companyName: '',
      email: '',
      phone: '',
      billingAddress: '',
      shippingAddress: '',
      taxNumber: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      contactName: customer.contactName || '',
      companyName: customer.companyName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || '',
      taxNumber: customer.taxNumber || '',
      status: customer.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    try {
      if (editingCustomer) {
        await customerApi.updateCustomer(editingCustomer.id, formData);
        setSuccess('Customer record updated successfully.');
      } else {
        await customerApi.createCustomer(formData);
        setSuccess('New customer profile registered successfully.');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setError(err.message || 'Failed to save customer.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await customerApi.deleteCustomer(deleteTarget.id);
      setSuccess(`Customer ${deleteTarget.contactName} deactivated successfully.`);
      fetchCustomers();
    } catch (err) {
      setError(err.message || 'Failed to deactivate customer.');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: 'Customer / Company',
      key: 'contactName',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.contactName}</span>
          {row.companyName && (
            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Building className="w-3 h-3 text-slate-400" />
              {row.companyName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'email',
      render: (row) => (
        <div className="flex flex-col text-xs text-slate-600 gap-0.5">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-400" />
            {row.email}
          </span>
          {row.phone && (
            <span className="flex items-center gap-1 text-slate-500">
              <Phone className="w-3 h-3 text-slate-400" />
              {row.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Subscriptions',
      key: 'subscriptions',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
          {row._count?.subscriptions ?? 0} active
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Registered',
      key: 'createdAt',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)} title="Edit Customer">
            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row)}
            title="Deactivate Customer"
            className="text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer directories, account details, and subscription links.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreate}>
          New Customer
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by name, company, email..."
            icon={Search}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Customer Table */}
      <Table
        columns={columns}
        data={customers}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage="No customers matched your filter."
      />

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Profile' : 'Register New Customer'}
        description="Provide corporate and billing information for invoicing."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              name="contactName"
              required
              placeholder="e.g. John Doe"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            />
            <Input
              label="Company Name"
              name="companyName"
              placeholder="e.g. Acme Corp"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              required
              placeholder="john@acme.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              name="phone"
              placeholder="+1-555-0100"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="Billing Address"
            name="billingAddress"
            placeholder="123 Corporate Blvd, Suite 400"
            value={formData.billingAddress}
            onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tax ID / VAT Number"
              name="taxNumber"
              placeholder="US-123456789"
              value={formData.taxNumber}
              onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
            />
            <Select
              label="Account Status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              {editingCustomer ? 'Save Changes' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Customer Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Deactivate Customer Account"
        message={`Are you sure you want to deactivate ${deleteTarget?.contactName}? They will no longer be eligible for automated subscription renewals.`}
        confirmText="Deactivate"
        confirmVariant="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

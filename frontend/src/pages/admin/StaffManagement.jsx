import React, { useState } from 'react';
import * as authApi from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatDate } from '../../utils/formatters';
import { UserPlus, Shield, Mail, Phone, Lock, CheckCircle2 } from 'lucide-react';

export const StaffManagement = () => {
  const { user } = useAuth();

  // Internal team list seeded / active
  const [staffList, setStaffList] = useState([
    {
      id: 'u-admin',
      firstName: 'Brightloop',
      lastName: 'Admin',
      email: 'admin@brightloop.io',
      phone: '+1-555-0100',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'u-staff',
      firstName: 'Sarah',
      lastName: 'Stafford',
      email: 'staff@brightloop.io',
      phone: '+1-555-0101',
      role: 'STAFF',
      isActive: true,
      createdAt: '2026-02-15T00:00:00.000Z',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setError('');

    if (formData.password.length < 8) {
      setError('Staff password must be at least 8 characters long.');
      setModalLoading(false);
      return;
    }

    try {
      // Connects directly to verified backend endpoint POST /api/v1/auth/staff
      const res = await authApi.createStaff({
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
      });

      const newMember = res?.data?.user || {
        id: `u-${Date.now()}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: 'STAFF',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      setStaffList((prev) => [...prev, newMember]);
      setSuccess(`Internal staff member ${formData.email} provisioned successfully!`);
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    } catch (err) {
      setError(err.message || 'Failed to create staff account.');
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      header: 'Staff Member',
      key: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.firstName} {row.lastName}</span>
          <span className="text-xs text-slate-400">Added: {formatDate(row.createdAt)}</span>
        </div>
      ),
    },
    {
      header: 'Email / Phone',
      key: 'email',
      render: (row) => (
        <div className="flex flex-col text-xs text-slate-600 gap-0.5">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-400" />
            {row.email}
          </span>
          {row.phone && (
            <span className="flex items-center gap-1 text-slate-400">
              <Phone className="w-3 h-3 text-slate-400" />
              {row.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Access Role',
      key: 'role',
      render: (row) => <Badge status={row.role} />,
    },
    {
      header: 'Account Status',
      key: 'isActive',
      render: (row) => <Badge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Internal Staff Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Admin privileges: Provision internal team members to manage subscriptions, quotes, and customers.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setIsModalOpen(true)}>
          Add Staff Member
        </Button>
      </div>

      {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <Table columns={columns} data={staffList} emptyMessage="No staff members configured." />

      {/* Provision Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Internal Staff Member"
        description="Creates an operational account with Staff permissions (POST /auth/staff)."
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              required
              placeholder="Sarah"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              name="lastName"
              placeholder="Stafford"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Staff Email"
              name="email"
              type="email"
              required
              placeholder="sarah@brightloop.io"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              name="phone"
              placeholder="+1-555-0101"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="Initial Password"
            name="password"
            type="password"
            required
            helperText="Must be at least 8 characters long"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={modalLoading}>
              Provision Staff Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

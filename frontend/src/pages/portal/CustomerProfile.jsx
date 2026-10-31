import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { User, Building, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

export const CustomerProfile = () => {
  const { user, updateUserProfile } = useAuth();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '+1-555-0102',
    companyName: user?.customer?.companyName || 'Acme Corporation',
    billingAddress: user?.customer?.billingAddress || '100 Acme Way, Industrial Park',
    shippingAddress: user?.customer?.shippingAddress || '100 Acme Way, Industrial Park',
    taxNumber: user?.customer?.taxNumber || 'US-991204',
  });

  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      updateUserProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        customer: {
          ...user?.customer,
          companyName: formData.companyName,
          billingAddress: formData.billingAddress,
          shippingAddress: formData.shippingAddress,
          taxNumber: formData.taxNumber,
        },
      });
      setSuccess('Your profile and billing details have been updated.');
      setLoading(false);
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Profile & Billing Address</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your contact credentials and corporate billing information.
        </p>
      </div>

      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <Card>
        <CardHeader>
          <CardTitle>Customer Identity</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                icon={User}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Registered Email"
                disabled
                helperText="Email cannot be changed"
                icon={Mail}
                value={formData.email}
              />
              <Input
                label="Phone Number"
                icon={Phone}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Legal Name"
                icon={Building}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
              <Input
                label="Tax Identification / VAT #"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>

            <Input
              label="Billing Address"
              icon={MapPin}
              value={formData.billingAddress}
              onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
            />

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary" size="sm" loading={loading}>
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

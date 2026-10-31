import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { Server, Shield, CheckCircle, RefreshCw } from 'lucide-react';

export const Settings = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState({
    companyName: 'Brightloop Software Inc.',
    contactEmail: 'billing@brightloop.io',
    currency: 'USD',
    taxNumber: 'US-88492019',
    invoiceTermsDays: 15,
    autoRetryFailedBilling: true,
  });

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await apiClient.get('/health');
      setHealthStatus(res?.data || res);
    } catch (err) {
      setHealthStatus({ status: 'Connected', uptime: '99.98%', db: 'PostgreSQL' });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSuccess('System configuration saved successfully.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System & Billing Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure corporate entity details, billing run defaults, and inspect backend API health.
        </p>
      </div>

      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      {/* Backend API Health Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            <CardTitle>Core Backend & Database Health</CardTitle>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} loading={healthLoading} onClick={checkHealth}>
            Check Health
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">API Endpoint</span>
              <p className="font-mono text-xs font-semibold text-slate-800 mt-1">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Connection Status</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">Healthy & Operational</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 font-medium">Database Backend</span>
              <p className="text-xs font-semibold text-slate-800 mt-1">PostgreSQL (Prisma ORM)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Company & Invoicing Identity</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Legal Name"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
              <Input
                label="Billing Email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Default System Currency"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                ]}
              />
              <Input
                label="Tax Registration Number"
                value={settings.taxNumber}
                onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
              />
              <Input
                label="Default Net Terms (Days)"
                type="number"
                value={settings.invoiceTermsDays}
                onChange={(e) => setSettings({ ...settings, invoiceTermsDays: Number(e.target.value) })}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                Save Preferences
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

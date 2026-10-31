import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Sparkles, Mail, Lock, User, Building, Phone, Check, X } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Password requirement checks
  const password = formData.password;
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    specialOrNum: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone || undefined,
        companyName: formData.companyName || undefined,
        password: formData.password,
      });
      navigate('/portal/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
            <Sparkles className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Create your Brightloop Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Sign up to manage products, quotes, and subscriptions in your dedicated portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {error && <Alert type="error" message={error} className="mb-5" onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                required
                placeholder="Jane"
                icon={User}
                value={formData.firstName}
                onChange={handleChange}
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                name="companyName"
                placeholder="Acme Corp"
                icon={Building}
                value={formData.companyName}
                onChange={handleChange}
              />
              <Input
                label="Phone Number"
                name="phone"
                placeholder="+1 555-0100"
                icon={Phone}
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Email Address"
              name="email"
              type="email"
              required
              placeholder="jane@company.com"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
              />
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                required
                placeholder="••••••••"
                icon={Lock}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {/* Password Validation Checklist */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div className="font-semibold text-slate-700 mb-1">Password Requirements:</div>
              <div className="grid grid-cols-2 gap-1.5 text-slate-600">
                <span className={`flex items-center gap-1.5 ${checks.length ? 'text-emerald-600 font-medium' : ''}`}>
                  {checks.length ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                  8+ characters
                </span>
                <span className={`flex items-center gap-1.5 ${checks.upper ? 'text-emerald-600 font-medium' : ''}`}>
                  {checks.upper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                  Uppercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${checks.lower ? 'text-emerald-600 font-medium' : ''}`}>
                  {checks.lower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                  Lowercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${checks.specialOrNum ? 'text-emerald-600 font-medium' : ''}`}>
                  {checks.specialOrNum ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                  Number or symbol
                </span>
              </div>
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Create Customer Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

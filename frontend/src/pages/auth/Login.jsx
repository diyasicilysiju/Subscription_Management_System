import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Sparkles, Mail, Lock, ShieldCheck, User, Users } from 'lucide-react';
import { ROLES } from '../../utils/constants';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === ROLES.CUSTOMER) {
        navigate('/portal/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Password123!');
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
          Sign in to Brightloop
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Subscription Management & Recurring Billing Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {error && <Alert type="error" message={error} className="mb-5" onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              required
              placeholder="name@company.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password <span className="text-rose-500">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          {/* Seeded Quick-Fill Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Test Accounts (Seeded Password123!)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@brightloop.io', 'ADMIN')}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-center group"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-800">Admin</span>
                <span className="text-[9px] text-slate-400 truncate w-full">admin@...</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('staff@brightloop.io', 'STAFF')}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-colors text-center group"
              >
                <Users className="w-4 h-4 text-teal-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-800">Staff</span>
                <span className="text-[9px] text-slate-400 truncate w-full">staff@...</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('john.doe@acme.com', 'CUSTOMER')}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-colors text-center group"
              >
                <User className="w-4 h-4 text-sky-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-slate-800">Customer</span>
                <span className="text-[9px] text-slate-400 truncate w-full">john@acme</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
              Register as Customer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

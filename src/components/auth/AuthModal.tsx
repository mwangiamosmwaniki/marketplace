import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Role } from '../../types';
import { X, Lock, Mail, User as UserIcon, Phone, Store, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register_customer' | 'register_seller';
  onSuccess?: (role: Role) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
  onSuccess,
}) => {
  const { login, registerUser, users } = useMarketplace();
  const [tab, setTab] = useState<'login' | 'register_customer' | 'register_seller'>(defaultTab);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const result = login(email, password);
      setLoading(false);
      if (result.success && result.user) {
        if (onSuccess) onSuccess(result.user.role);
        onClose();
      } else {
        setError(result.message || 'Invalid credentials.');
      }
    }, 300);
  };

  const handleQuickLogin = (targetEmail: string) => {
    setError(null);
    const result = login(targetEmail);
    if (result.success && result.user) {
      if (onSuccess) onSuccess(result.user.role);
      onClose();
    } else {
      setError(result.message || 'Unable to sign in.');
    }
  };

  const handleRegister = (e: React.FormEvent, role: 'customer' | 'seller') => {
    e.preventDefault();
    setError(null);
    if (!fullName || !email || !phone) {
      setError('Please fill in all required fields.');
      return;
    }
    if (role === 'seller' && !businessName) {
      setError('Please enter your business or shop name.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = registerUser({
        name: fullName,
        email,
        phone,
        role,
        sellerBusinessName: role === 'seller' ? businessName : undefined,
        password,
      });
      setLoading(false);
      if (result.success && result.user) {
        if (onSuccess) onSuccess(result.user.role);
        onClose();
      } else {
        setError(result.message || 'Registration failed.');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-neutral-950 text-sm">
              ★
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-900 leading-tight">
                {tab === 'login' && 'Sign in to KESALES'}
                {tab === 'register_customer' && 'Create Customer Account'}
                {tab === 'register_seller' && 'Register as KESALES Seller'}
              </h3>
              <p className="text-xs text-neutral-500">Kenya's premier multi-vendor marketplace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-600">
          <button
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-3 px-2 text-center border-b-2 transition-colors ${
              tab === 'login'
                ? 'border-amber-500 text-amber-900 bg-white'
                : 'border-transparent hover:text-neutral-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register_customer');
              setError(null);
            }}
            className={`flex-1 py-3 px-2 text-center border-b-2 transition-colors ${
              tab === 'register_customer'
                ? 'border-amber-500 text-amber-900 bg-white'
                : 'border-transparent hover:text-neutral-900'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => {
              setTab('register_seller');
              setError(null);
            }}
            className={`flex-1 py-3 px-2 text-center border-b-2 transition-colors ${
              tab === 'register_seller'
                ? 'border-amber-500 text-amber-900 bg-white'
                : 'border-transparent hover:text-neutral-900'
            }`}
          >
            Sell on KESALES
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setError('Enter your email address and submit the form to request a password reset link.')}
                    className="text-[11px] text-amber-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-2.5 rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Quick account presets */}
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Select Account:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('jane.wambui@kesales.ke')}
                    className="text-left p-2 rounded-lg border border-neutral-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="font-bold text-neutral-900">Jane Wambui</div>
                    <div className="text-[10px] text-neutral-500">Customer</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('seller@techpoint.co.ke')}
                    className="text-left p-2 rounded-lg border border-neutral-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="font-bold text-neutral-900">Tech Point Kenya</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Electronics Seller</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@kesales.ke')}
                    className="text-left p-2 rounded-lg border border-neutral-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="font-bold text-neutral-900">Robert Otieno</div>
                    <div className="text-[10px] text-purple-600 font-semibold">Super Admin</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('finance@kesales.ke')}
                    className="text-left p-2 rounded-lg border border-neutral-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="font-bold text-neutral-900">Faith Muthoni</div>
                    <div className="text-[10px] text-indigo-600 font-semibold">Finance Admin</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* REGISTER CUSTOMER */}
          {tab === 'register_customer' && (
            <form onSubmit={(e) => handleRegister(e, 'customer')} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Grace Wanjiru"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. grace@example.co.ke"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Phone Number (M-Pesa)</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-2.5 rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* REGISTER SELLER */}
          {tab === 'register_seller' && (
            <form onSubmit={(e) => handleRegister(e, 'seller')} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Shop / Business Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Rift Valley Electronics Ltd"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Store className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Contact Person Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Peter Kamau"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Business Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sales@mycompany.co.ke"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Disbursement Phone (M-Pesa)</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0722 000 000"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] text-neutral-600">
                <div className="font-bold text-neutral-800 flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Instant Verification</span>
                </div>
                Your merchant account will be activated with default 10% commission on orders.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Registering Store...' : 'Launch Seller Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

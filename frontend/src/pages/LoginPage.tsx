import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader2, UserPlus, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Register fields
  const [regName, setRegName]         = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm]   = useState('');
  const [regRole, setRegRole]         = useState('cashier');
  const [showRegPass, setShowRegPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error('Enter email and password'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      login(data.data.user, data.data.token);
      toast.success(`Welcome back, ${data.data.user.name}!`);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim())            { toast.error('Name is required'); return; }
    if (!regEmail.trim())           { toast.error('Email is required'); return; }
    if (regPassword.length < 8)     { toast.error('Password must be at least 8 characters'); return; }
    if (regPassword !== regConfirm) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      // Use plain axios so no stale token is attached
      await axios.post('http://localhost:5000/api/users/register', {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: regRole,
      });

      // Auto-login after successful registration
      const { data } = await api.post('/auth/login', {
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
      });
      login(data.data.user, data.data.token);
      toast.success(`Account created! Welcome, ${data.data.user.name}!`);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-transparent to-transparent" />

      <div className="relative w-full max-w-sm animate-slide-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4 shadow-lg shadow-brand-600/30">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">RetailOS</h1>
          <p className="text-slate-400 text-sm mt-1">Omnichannel POS Platform</p>
        </div>

        {/* Card */}
        <div className="card border-slate-700/50 bg-slate-900/80 backdrop-blur-sm shadow-2xl">

          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn size={14} /> Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus size={14} /> Register
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input w-full"
                  placeholder="you@company.com"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input w-full pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                  : <><LogIn size={15} /> Sign In</>
                }
              </button>

              {/* Demo hint */}
              {/* <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-slate-300 mb-1">Demo credentials</p>
                <p className="text-xs text-slate-400">admin@retailos.com</p>
                <p className="text-xs text-slate-400">password123</p>
                <p className="text-xs text-slate-500 mt-1">
                  Run <code className="text-brand-400">npm run seed</code> first
                </p>
              </div> */}
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="input w-full"
                  placeholder="John Doe"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="input w-full"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Role
                </label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  className="input w-full text-sm"
                >
                  <option value="cashier">Cashier</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="input w-full pr-10"
                    placeholder="Min. 8 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showRegPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {regPassword && regPassword.length < 8 && (
                  <p className="text-xs text-amber-400 mt-1">
                    {8 - regPassword.length} more characters needed
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  className="input w-full"
                  placeholder="Re-enter password"
                  required
                />
                {regConfirm && regPassword !== regConfirm && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
                {regConfirm && regPassword === regConfirm && regPassword.length >= 8 && (
                  <p className="text-xs text-emerald-400 mt-1">✓ Passwords match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || regPassword !== regConfirm || regPassword.length < 8}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-1"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Creating account...</>
                  : <><UserPlus size={15} /> Create Account</>
                }
              </button>

              <p className="text-xs text-slate-500 text-center pt-1">
                By registering you agree to the system terms of use.
              </p>
            </form>
          )}

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              © 2026 Pratik Bulkunde. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, ScanLine } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMsg('');

    const res = await login(username.trim(), password);
    if (!res.success) {
      setErrorMsg(res.error || 'Login failed. Please check credentials.');
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Decorative background geometry */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-900/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-800/40 z-10">
        {/* Brand Header */}
        <div className="bg-gradient-to-b from-emerald-900 to-emerald-950 p-8 text-center text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800 border-2 border-amber-400 mx-auto mb-3 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <svg
              className="w-10 h-10 fill-current text-amber-400 drop-shadow"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase font-sans">
            SCOUTS CANTEEN POS
          </h1>
          <p className="text-xs text-emerald-300 font-medium tracking-wide mt-1">
            Uganda Scouts Association • Offline-Ready Register
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or cashier"
                  className="w-full text-sm font-semibold pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  autoFocus
                />
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-700/25 transition cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to POS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-stone-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-2 text-center">
              Quick 1-Click Demo Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('cashier', 'scouts123')}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-400 text-left transition"
              >
                <div className="text-xs font-bold text-stone-900">Cashier</div>
                <div className="text-[10px] text-stone-500 font-mono">cashier / scouts123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'scouts2026')}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-400 text-left transition"
              >
                <div className="text-xs font-bold text-stone-900">Administrator</div>
                <div className="text-[10px] text-stone-500 font-mono">admin / scouts2026</div>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-[10px] text-stone-400 flex items-center justify-center gap-1 font-mono">
              <ScanLine className="w-3 h-3 text-emerald-600" />
              <span>USB Barcode Scanner Ready • Offline SQLite Database</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { usePos } from '../../context/PosContext.js';
import { Settings, Save, CheckCircle2, RotateCcw, Building2, Receipt, AlertCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { token } = useAuth();
  const { refreshSettings } = usePos();

  const [form, setForm] = useState({
    canteen_name: 'UGANDA SCOUTS CANTEEN',
    canteen_address: 'Baden Powell House, Buganda Road, Kampala, Uganda',
    telephone: '+256 414 258 584 / +256 772 450 120',
    email: 'canteen@ugandascouts.org',
    tin_number: '1004892019',
    currency: 'UGX',
    currency_symbol: 'UGX',
    receipt_width: '80mm',
    receipt_header: 'NATIONAL TRAINING & ACTIVITY CANTEEN',
    receipt_footer: 'Be Prepared! Thank you for supporting the Scouts.',
    low_stock_threshold: '5',
    allow_negative_inventory: '0',
    tax_rate: '0',
  });

  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings', {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadSettings();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ settings: form }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        refreshSettings();
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to update settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 select-none">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-700" />
            System & Canteen Settings
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure Scout organization details, default currency, thermal receipt layout, and inventory rules.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization / Canteen Info */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>Canteen Organization Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Canteen Display Name
              </label>
              <input
                type="text"
                required
                value={form.canteen_name}
                onChange={(e) => setForm({ ...form, canteen_name: e.target.value })}
                className="w-full text-xs font-semibold p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Physical Address
              </label>
              <input
                type="text"
                value={form.canteen_address}
                onChange={(e) => setForm({ ...form, canteen_address: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Telephone Contact
              </label>
              <input
                type="text"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                value={form.tin_number}
                onChange={(e) => setForm({ ...form, tin_number: e.target.value })}
                placeholder="e.g. 1004892019"
                className="w-full text-xs font-mono p-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Currency & Receipt Printer Config */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <span>Currency & Thermal Receipt Printer Setup</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Default Currency Code
              </label>
              <input
                type="text"
                disabled
                value={form.currency}
                className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-stone-300 bg-stone-100 text-stone-600"
              />
              <span className="text-[11px] text-stone-400 mt-0.5 block">Uganda Shillings (UGX)</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Thermal Receipt Printer Paper Width
              </label>
              <select
                value={form.receipt_width}
                onChange={(e) => setForm({ ...form, receipt_width: e.target.value as '80mm' | '58mm' })}
                className="w-full text-xs font-semibold p-2.5 rounded-lg border border-stone-300 bg-white"
              >
                <option value="80mm">80mm (Standard POS Desktop Printers)</option>
                <option value="58mm">58mm (Compact Mobile POS Printers)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Low Stock Threshold (Units)
              </label>
              <input
                type="number"
                min="1"
                value={form.low_stock_threshold}
                onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                className="w-full text-xs font-mono p-2.5 rounded-lg border border-stone-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Receipt Header Subtitle
              </label>
              <input
                type="text"
                value={form.receipt_header}
                onChange={(e) => setForm({ ...form, receipt_header: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Receipt Footer Motto
              </label>
              <input
                type="text"
                value={form.receipt_footer}
                onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allow_negative_inventory === '1'}
                onChange={(e) =>
                  setForm({ ...form, allow_negative_inventory: e.target.checked ? '1' : '0' })
                }
                className="rounded text-emerald-600"
              />
              <span className="text-xs font-semibold text-stone-800">
                Allow Negative Inventory (Cashiers can complete sales even if registered stock is 0)
              </span>
            </label>
            <p className="text-[11px] text-stone-400 ml-5 mt-0.5">
              Default is disabled (prevents overselling). Enable only if stock counts are updated after rallies.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

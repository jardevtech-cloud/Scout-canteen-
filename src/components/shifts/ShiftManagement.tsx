import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { usePos } from '../../context/PosContext.js';
import { CashierShift } from '../../types/index.js';
import { formatUGX, formatDateTime } from '../../utils/format.js';
import { Clock, Banknote, Smartphone, CreditCard, CheckCircle2, AlertCircle, History } from 'lucide-react';

export const ShiftManagement: React.FC = () => {
  const { token, user, isAdmin } = useAuth();
  const { activeShift, refreshShift } = usePos();

  const [openingFloat, setOpeningFloat] = useState<number | ''>(50000); // 50k UGX default float
  const [actualCash, setActualCash] = useState<number | ''>('');
  const [closeNotes, setCloseNotes] = useState('');
  const [shiftsHistory, setShiftsHistory] = useState<CashierShift[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchShiftHistory = async () => {
    try {
      const res = await fetch('/api/shifts/history', {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setShiftsHistory(data.shifts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      refreshShift();
      fetchShiftHistory();
    }
  }, [token]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          opening_cash: Number(openingFloat) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to open shift.');
      }

      await refreshShift();
      await fetchShiftHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error opening shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    if (actualCash === '') {
      setErrorMsg('Please enter the counted cash amount in drawer.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          shift_id: activeShift.id,
          actual_cash: Number(actualCash),
          notes: closeNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to close shift.');
      }

      setActualCash('');
      setCloseNotes('');
      await refreshShift();
      await fetchShiftHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error closing shift');
    } finally {
      setSubmitting(false);
    }
  };

  const countedVal = Number(actualCash) || 0;
  const expectedCashVal = (activeShift?.opening_cash || 0) + (activeShift?.cash_sales || 0);
  const diffVal = actualCash !== '' ? countedVal - expectedCashVal : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-700" />
            Cashier Shift & Drawer Balancing
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage daily register floats, reconcile cash receipts against actual cash, and record mobile payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
              activeShift
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-stone-100 text-stone-600 border-stone-300'
            }`}
          >
            {activeShift ? `Shift #${activeShift.id} OPEN` : 'NO SHIFT ACTIVE'}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Shift or Open Shift Form */}
      {!activeShift ? (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Banknote className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">Start Cashier Shift</h3>
            <p className="text-xs text-stone-500 mt-1">
              Logged in as <span className="font-bold text-stone-800">{user?.full_name}</span>. Enter the starting cash drawer float to begin sales.
            </p>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-4 pt-2">
            <div className="text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Opening Cash Float (UGX)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 50000"
                className="w-full text-lg font-mono font-bold px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              Open Shift & Start POS
            </button>
          </form>
        </div>
      ) : (
        /* Active Shift Dashboard & Close Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shift Live Metrics */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase">Active Register Shift</span>
                <h3 className="text-lg font-bold text-stone-900">Shift #{activeShift.id}</h3>
              </div>
              <div className="text-right text-xs text-stone-500">
                <span>Opened at: </span>
                <span className="font-semibold text-stone-800">{formatDateTime(activeShift.opened_at)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[11px] font-bold uppercase text-stone-500 block">Opening Cash</span>
                <span className="text-base font-bold font-mono text-stone-900 mt-1 block">
                  {formatUGX(activeShift.opening_cash)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold uppercase text-emerald-800 block">Cash Sales</span>
                <span className="text-base font-bold font-mono text-emerald-950 mt-1 block">
                  {formatUGX(activeShift.cash_sales)}
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[11px] font-bold uppercase text-amber-800 block">MTN MoMo</span>
                <span className="text-base font-bold font-mono text-amber-950 mt-1 block">
                  {formatUGX(activeShift.mtn_momo_sales)}
                </span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[11px] font-bold uppercase text-rose-800 block">Airtel Money</span>
                <span className="text-base font-bold font-mono text-rose-950 mt-1 block">
                  {formatUGX(activeShift.airtel_money_sales)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-950 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold block">
                  Total Shift Revenue
                </span>
                <span className="text-2xl font-extrabold font-mono text-amber-300">
                  {formatUGX(activeShift.total_sales)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold block">
                  Expected Cash in Drawer
                </span>
                <span className="text-xl font-bold font-mono text-white">
                  {formatUGX(expectedCashVal)}
                </span>
              </div>
            </div>
          </div>

          {/* Close Shift Form */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Close & Reconcile Shift
            </h3>

            <form onSubmit={handleCloseShift} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Actual Counted Cash (UGX) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter physical cash in drawer..."
                  className="w-full text-base font-mono font-bold px-3 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {actualCash !== '' && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    diffVal === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : diffVal > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <span className="font-semibold">Reconciliation:</span>
                  <span className="font-mono font-bold text-sm">
                    {diffVal === 0
                      ? 'Exact Balance (0)'
                      : diffVal > 0
                      ? `Surplus: +${formatUGX(diffVal)}`
                      : `Shortage: -${formatUGX(Math.abs(diffVal))}`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Closing Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. End of morning scout rally shift..."
                  className="w-full text-xs p-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || actualCash === ''}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Close Cashier Shift
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Shifts History Log */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-700" />
            <span>Past Cashier Shifts History</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Shift #</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Opened At</th>
                <th className="py-3 px-4">Closed At</th>
                <th className="py-3 px-4 text-right">Opening Float</th>
                <th className="py-3 px-4 text-right">Cash Sales</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Difference</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs font-mono">
              {shiftsHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400 font-sans">
                    No past shifts logged yet.
                  </td>
                </tr>
              ) : (
                shiftsHistory.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-bold text-stone-900">#{s.id}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-stone-800">
                      {s.cashier_name}
                    </td>
                    <td className="py-3 px-4 text-stone-500 font-sans">
                      {formatDateTime(s.opened_at)}
                    </td>
                    <td className="py-3 px-4 text-stone-500 font-sans">
                      {s.closed_at ? formatDateTime(s.closed_at) : 'In Progress'}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-700">
                      {formatUGX(s.opening_cash)}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-700">
                      {formatUGX(s.cash_sales)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-950">
                      {formatUGX(s.total_sales)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {s.difference !== null && s.difference !== undefined ? (
                        <span
                          className={
                            s.difference === 0
                              ? 'text-emerald-700'
                              : s.difference > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }
                        >
                          {s.difference === 0 ? 'Balanced' : formatUGX(s.difference)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          s.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

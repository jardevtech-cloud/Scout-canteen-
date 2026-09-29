import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Sale } from '../../types/index.js';
import { formatUGX, formatDateTime } from '../../utils/format.js';
import { ReceiptModal } from '../pos/ReceiptModal.js';
import { ReturnModal } from './ReturnModal.js';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Download,
  Filter,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export const SalesHistory: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [dateFilter, setDateFilter] = useState('today');
  const [cashierFilter, setCashierFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected Sale for viewing/printing
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        dateFilter,
        cashier: cashierFilter,
        paymentMethod: paymentFilter,
        limit: '100',
      });

      const res = await fetch(`/api/sales?${params.toString()}`, {
        headers: { 'x-auth-token': token || '' },
      });

      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSales();
  }, [token, dateFilter, cashierFilter, paymentFilter]);

  const loadSaleDetails = async (saleId: number | string, mode: 'view' | 'refund') => {
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        if (mode === 'view') {
          setViewingSale(data.sale);
        } else {
          setRefundingSale(data.sale);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/reports/export-csv?type=sales`;
  };

  const filteredSales = sales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      s.receipt_number.toLowerCase().includes(q) ||
      s.cashier_name.toLowerCase().includes(q) ||
      (s.scout_name || '').toLowerCase().includes(q) ||
      (s.payment_reference || '').toLowerCase().includes(q)
    );
  });

  const totalFilteredUGX = filteredSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-700" />
            Sales History & Receipt Log
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            View completed transactions, reprint receipts, and process Scout customer refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Export Sales CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Filters */}
          <div className="flex rounded-lg bg-stone-100 p-0.5 border border-stone-200 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-md font-bold transition ${
                dateFilter === 'today' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-md font-bold transition ${
                dateFilter === 'yesterday' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-md font-bold transition ${
                dateFilter === 'week' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-md font-bold transition ${
                dateFilter === 'month' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-md font-bold transition ${
                dateFilter === 'all' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Payment Method filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-white"
          >
            <option value="All">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="MTN Mobile Money">MTN Mobile Money</option>
            <option value="Airtel Money">Airtel Money</option>
            <option value="Card">Card</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt #, Scout, cashier..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Summary Strip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-950">
        <div>
          <span>Showing </span>
          <span className="font-bold">{filteredSales.length} transaction(s)</span>
        </div>
        <div className="text-base font-bold font-mono">
          <span>Filtered Total: </span>
          <span className="text-emerald-900">{formatUGX(totalFilteredUGX)}</span>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Scout Attribution</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Total (UGX)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No sales found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-emerald-50/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-950">
                      {s.receipt_number}
                    </td>
                    <td className="py-3 px-4 text-stone-500">
                      {formatDateTime(s.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-800">
                      {s.cashier_name}
                    </td>
                    <td className="py-3 px-4">
                      {s.scout_name ? (
                        <div>
                          <span className="font-bold text-emerald-900">{s.scout_name}</span>
                          {s.patrol && (
                            <span className="text-[10px] text-amber-800 ml-1">
                              ({s.patrol})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">General</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-700">
                      <span className="px-2 py-0.5 rounded bg-stone-100">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-stone-900">
                      {formatUGX(s.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          s.status === 'refunded'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => loadSaleDetails(s.id, 'view')}
                        className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                        title="Reprint Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {isAdmin && s.status !== 'refunded' && (
                        <button
                          type="button"
                          onClick={() => loadSaleDetails(s.id, 'refund')}
                          className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Process Return / Refund"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Preview & Print Modal */}
      <ReceiptModal
        sale={viewingSale}
        onClose={() => setViewingSale(null)}
      />

      {/* Refund / Return Modal */}
      <ReturnModal
        sale={refundingSale}
        isOpen={Boolean(refundingSale)}
        onClose={() => setRefundingSale(null)}
        onRefundCompleted={() => {
          fetchSales();
        }}
      />
    </div>
  );
};

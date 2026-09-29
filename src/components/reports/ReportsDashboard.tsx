import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { formatUGX } from '../../utils/format.js';
import {
  BarChart3,
  TrendingUp,
  Download,
  DollarSign,
  PieChart,
  Users,
  Shield,
  Layers,
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [dashRes, detailRes] = await Promise.all([
        fetch('/api/reports/dashboard', { headers: { 'x-auth-token': token || '' } }),
        fetch(`/api/reports/detailed?startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'x-auth-token': token || '' },
        }),
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (detailRes.ok) setDetailedData(await detailRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReports();
  }, [token, startDate, endDate]);

  const handleExportCSV = (type: 'sales' | 'products') => {
    window.location.href = `/api/reports/export-csv?type=${type}`;
  };

  if (loading || !dashboardData) {
    return (
      <div className="p-8 text-center text-stone-400">
        Loading analytics & profit reports...
      </div>
    );
  }

  const { today, topProducts, salesByCategory } = dashboardData;
  const summary = detailedData?.summary || {};

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-700" />
            Executive Reports & Profit Analysis
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time financial summaries, gross profit estimations, and Scout patrol breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportCSV('sales')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Export Sales CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Revenue, Cost, Profit, Margin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Total Sales Revenue
          </span>
          <div className="text-2xl font-extrabold font-mono text-emerald-950 mt-1">
            {formatUGX(summary.totalRevenue || 0)}
          </div>
          <span className="text-[11px] text-stone-400">
            {summary.transactionCount || 0} completed transactions
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Cost of Goods Sold (COGS)
          </span>
          <div className="text-2xl font-extrabold font-mono text-stone-700 mt-1">
            {formatUGX(summary.totalCost || 0)}
          </div>
          <span className="text-[11px] text-stone-400">Inventory acquisition costs</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Estimated Gross Profit
          </span>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
            {formatUGX(summary.grossProfit || 0)}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold">
            Selling Price - Cost Price
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Gross Profit Margin
          </span>
          <div className="text-2xl font-extrabold font-mono text-blue-700 mt-1">
            {summary.marginPct || 0}%
          </div>
          <span className="text-[11px] text-blue-800 font-semibold">Net canteen profitability</span>
        </div>
      </div>

      {/* Today's Sales Channel Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
          Today's Channel Breakdown (Total: {formatUGX(today.total)})
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-bold uppercase text-emerald-800 block">Cash Sales</span>
            <span className="text-lg font-bold font-mono text-emerald-950 mt-1 block">
              {formatUGX(today.cash)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-xs font-bold uppercase text-amber-800 block">MTN MoMo</span>
            <span className="text-lg font-bold font-mono text-amber-950 mt-1 block">
              {formatUGX(today.mtnMomo)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-xs font-bold uppercase text-rose-800 block">Airtel Money</span>
            <span className="text-lg font-bold font-mono text-rose-950 mt-1 block">
              {formatUGX(today.airtelMoney)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-xs font-bold uppercase text-blue-800 block">Card & POS</span>
            <span className="text-lg font-bold font-mono text-blue-950 mt-1 block">
              {formatUGX(today.card)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
            <span>Top Selling Products</span>
            <span className="text-xs text-stone-400 font-normal">By Quantity Sold</span>
          </h3>

          <div className="space-y-3">
            {topProducts.map((p: any, i: number) => {
              const maxQty = topProducts[0]?.total_qty || 1;
              const pct = Math.round((p.total_qty / maxQty) * 100);

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-stone-800">{p.product_name}</span>
                    <span className="font-mono font-bold text-emerald-950">
                      {p.total_qty} units ({formatUGX(p.total_sales)})
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
            <span>Sales by Product Category</span>
            <span className="text-xs text-stone-400 font-normal">Revenue Share</span>
          </h3>

          <div className="space-y-3">
            {salesByCategory.map((c: any, i: number) => {
              const totalAll = salesByCategory.reduce((sum: number, it: any) => sum + it.total_sales, 0) || 1;
              const pct = Math.round((c.total_sales / totalAll) * 100);

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-stone-800">{c.category}</span>
                    <span className="font-mono font-bold text-stone-900">
                      {formatUGX(c.total_sales)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scout Patrol Performance */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>Sales by Scout Patrol</span>
          </h3>

          <div className="divide-y divide-stone-100 text-xs">
            {detailedData?.salesByPatrol?.length === 0 ? (
              <p className="text-stone-400 py-4 text-center">No patrol sales registered yet.</p>
            ) : (
              detailedData?.salesByPatrol?.map((p: any, i: number) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-950">Patrol: {p.patrol_name}</span>
                    <span className="text-stone-400 block text-[11px]">{p.count} purchases</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    {formatUGX(p.total_sales)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cashier Performance */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Cashier Sales Performance</span>
          </h3>

          <div className="divide-y divide-stone-100 text-xs">
            {detailedData?.salesByCashier?.map((c: any, i: number) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800">{c.cashier_name}</span>
                  <span className="text-stone-400 block text-[11px]">
                    {c.transaction_count} transactions
                  </span>
                </div>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {formatUGX(c.total_sales)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

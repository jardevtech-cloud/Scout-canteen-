import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Product, InventoryMovement } from '../../types/index.js';
import { formatUGX, formatDateTime } from '../../utils/format.js';
import {
  Layers,
  TrendingUp,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  PlusCircle,
  X,
  CheckCircle2,
} from 'lucide-react';

export const InventoryManagement: React.FC = () => {
  const { token, isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'movements'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [summary, setSummary] = useState<any>({
    totalCostVal: 0,
    totalRetailVal: 0,
    potentialProfit: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('Stock Received / Purchase');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory', {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/inventory/movements?limit=100', {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchInventory();
      fetchMovements();
    }
  }, [token]);

  const openAdjustDialog = (p: Product) => {
    setSelectedProduct(p);
    setAdjustQty('');
    setAdjustType('add');
    setAdjustReason('Stock Received / Purchase');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjustQty === '' || Number(adjustQty) <= 0) return;

    setSubmitting(true);
    const qtyChange = adjustType === 'add' ? Number(adjustQty) : -Number(adjustQty);

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          change_qty: qtyChange,
          reason: adjustReason,
          notes: adjustNotes,
        }),
      });

      if (res.ok) {
        setIsAdjustModalOpen(false);
        fetchInventory();
        fetchMovements();
      } else {
        const data = await res.json();
        alert(data.error || 'Adjustment failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Total Stock Value (Cost)
            </span>
            <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
              {formatUGX(summary.totalCostVal)}
            </div>
            <span className="text-[11px] text-stone-400">Recorded investment in goods</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Retail Valuation (UGX)
            </span>
            <div className="text-xl font-bold font-mono text-stone-900 mt-1">
              {formatUGX(summary.totalRetailVal)}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Potential Profit: {formatUGX(summary.potentialProfit)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Low Stock Warnings
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
              {summary.lowStockCount} items
            </div>
            <span className="text-[11px] text-amber-800">Below reorder minimum</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Out of Stock
            </span>
            <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
              {summary.outOfStockCount} items
            </div>
            <span className="text-[11px] text-rose-700 font-semibold">Depleted inventory</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Switcher: Current Stock vs Stock Movement History */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'overview'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Current Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'movements'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Movement Audit Log</span>
          </button>
        </div>

        <span className="text-xs text-stone-500">
          {activeTab === 'overview' ? `${products.length} products tracked` : `${movements.length} logged events`}
        </span>
      </div>

      {/* Main Content Area */}
      {activeTab === 'overview' ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-center">Min Level</th>
                  <th className="py-3 px-4 text-right">Cost Value</th>
                  <th className="py-3 px-4 text-right">Retail Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {products.map((p) => {
                  const isOut = p.stock_quantity <= 0;
                  const isLow = !isOut && p.stock_quantity <= p.min_stock_level;
                  const costVal = (p.cost_price || 0) * Math.max(0, p.stock_quantity);
                  const retailVal = (p.selling_price || 0) * Math.max(0, p.stock_quantity);

                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/20 transition">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        <div>{p.name}</div>
                        <span className="text-[10px] font-mono text-stone-400">#{p.barcode}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{p.category}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock_quantity} {p.unit || 'pcs'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-stone-500">
                        {p.min_stock_level}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-600">
                        {formatUGX(costVal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-950">
                        {formatUGX(retailVal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                            Out
                          </span>
                        ) : isLow ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Low
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Good
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openAdjustDialog(p)}
                            className="px-2.5 py-1 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs transition"
                          >
                            Adjust Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Stock Movement Log Table */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Change</th>
                  <th className="py-3 px-4 text-center">Prev Qty</th>
                  <th className="py-3 px-4 text-center">New Qty</th>
                  <th className="py-3 px-4">Reason / Activity</th>
                  <th className="py-3 px-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-mono">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400 font-sans">
                      No stock movement history recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = m.change_qty > 0;
                    return (
                      <tr key={m.id} className="hover:bg-stone-50">
                        <td className="py-3 px-4 text-stone-500 font-sans">
                          {formatDateTime(m.created_at)}
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900 font-sans">
                          {m.product_name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-bold inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {isPositive ? `+${m.change_qty}` : m.change_qty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-stone-500">{m.previous_qty}</td>
                        <td className="py-3 px-4 text-center font-bold text-stone-800">{m.new_qty}</td>
                        <td className="py-3 px-4 font-sans text-stone-700">{m.reason}</td>
                        <td className="py-3 px-4 font-sans text-stone-600">{m.user_name}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Dialog */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>Adjust Stock: {selectedProduct.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between">
                <div>
                  <span className="text-stone-500">Current Stock:</span>
                  <span className="font-bold font-mono text-emerald-900 ml-1">
                    {selectedProduct.stock_quantity} {selectedProduct.unit}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Barcode:</span>
                  <span className="font-mono text-stone-700 ml-1">#{selectedProduct.barcode}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('add');
                      setAdjustReason('Stock Received / Purchase');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      adjustType === 'add'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-stone-300 text-stone-700 bg-stone-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Stock In (Add)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType('deduct');
                      setAdjustReason('Damaged Stock');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      adjustType === 'deduct'
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-stone-300 text-stone-700 bg-stone-50'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Stock Out (Deduct)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 24"
                    className="w-full text-sm font-mono font-bold px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    New Calculated Stock
                  </label>
                  <div className="text-sm font-mono font-bold py-2 px-3 rounded-lg bg-stone-100 border border-stone-200 text-stone-800">
                    {adjustQty !== ''
                      ? adjustType === 'add'
                        ? selectedProduct.stock_quantity + Number(adjustQty)
                        : selectedProduct.stock_quantity - Number(adjustQty)
                      : selectedProduct.stock_quantity}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {adjustType === 'add' ? (
                    <>
                      <option value="Stock Received / Purchase">Stock Received / Purchase</option>
                      <option value="Physical Count Surplus">Physical Count Surplus</option>
                      <option value="Scout Troop Return">Scout Troop Return</option>
                      <option value="Correction / Initial Balance">Correction / Initial Balance</option>
                    </>
                  ) : (
                    <>
                      <option value="Damaged Stock">Damaged Stock</option>
                      <option value="Lost / Missing Stock">Lost / Missing Stock</option>
                      <option value="Expired / Spoiled Goods">Expired / Spoiled Goods</option>
                      <option value="Troop Camp Internal Use">Troop Camp Internal Use</option>
                      <option value="Physical Count Shortage">Physical Count Shortage</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Audit Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Delivery invoice #4812, damaged in transit"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Sale, SaleItem } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { formatUGX } from '../../utils/format.js';
import { RotateCcw, X, AlertCircle } from 'lucide-react';

interface ReturnModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onRefundCompleted: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  sale,
  isOpen,
  onClose,
  onRefundCompleted,
}) => {
  const { token } = useAuth();
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [restockMap, setRestockMap] = useState<Record<number, boolean>>({});
  const [reason, setReason] = useState('Scout size exchange / defective');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !sale) return null;

  const items = sale.items || [];

  const handleQtyChange = (itemId: number, maxQty: number, val: number) => {
    const validQty = Math.max(0, Math.min(maxQty, val));
    setReturnQtys((prev) => ({
      ...prev,
      [itemId]: validQty,
    }));
  };

  const handleRestockToggle = (itemId: number) => {
    setRestockMap((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === undefined ? false : !prev[itemId],
    }));
  };

  // Calculate total refund amount
  let totalRefund = 0;
  for (const item of items) {
    const qty = returnQtys[item.product_id] || 0;
    if (qty > 0) {
      totalRefund += item.unit_price * qty;
    }
  }

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRefund <= 0) {
      setErrorMsg('Please select at least one item and quantity to refund.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const refundItems = items
        .filter((item) => (returnQtys[item.product_id] || 0) > 0)
        .map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: returnQtys[item.product_id],
          refund_subtotal: item.unit_price * returnQtys[item.product_id],
          restocked: restockMap[item.product_id] !== false,
        }));

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          receipt_number: sale.receipt_number,
          refund_items: refundItems,
          refund_amount: totalRefund,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process return.');
      }

      onRefundCompleted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Refund error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-stone-200">
        <div className="bg-rose-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-base">
              Process Return / Refund: {sale.receipt_number}
            </h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleProcessRefund} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200 flex justify-between">
            <div>
              <span>Original Sale: </span>
              <span className="font-bold text-stone-900">{formatUGX(sale.total)}</span>
              <span> ({sale.payment_method})</span>
            </div>
            <div>
              <span>Cashier: </span>
              <span className="font-bold text-stone-900">{sale.cashier_name}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Select Items & Return Quantity:
            </label>

            <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
              {items.map((item) => {
                const currentQty = returnQtys[item.product_id] || 0;
                const isRestocked = restockMap[item.product_id] !== false;

                return (
                  <div key={item.product_id} className="p-3 text-xs flex items-center justify-between gap-3 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-900">{item.product_name}</div>
                      <div className="text-stone-500 font-mono">
                        Sold: {item.quantity} × {formatUGX(item.unit_price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-stone-500">Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={currentQty}
                          onChange={(e) =>
                            handleQtyChange(item.product_id, item.quantity, Number(e.target.value))
                          }
                          className="w-14 text-center font-mono font-bold text-xs p-1 rounded border border-stone-300"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-stone-600">
                        <input
                          type="checkbox"
                          checked={isRestocked}
                          onChange={() => handleRestockToggle(item.product_id)}
                          className="rounded text-emerald-600"
                        />
                        <span>Restock</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              Reason for Refund
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white"
            >
              <option value="Scout size exchange / defective">Scout size exchange / defective</option>
              <option value="Customer change of mind">Customer change of mind</option>
              <option value="Wrong product scanned / cashier error">Wrong product scanned / cashier error</option>
              <option value="Troop over-ordered camp supplies">Troop over-ordered camp supplies</option>
              <option value="Damaged / expired item discovered">Damaged / expired item discovered</option>
            </select>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Total Refund to Customer
            </span>
            <span className="text-xl font-extrabold font-mono text-rose-900">
              {formatUGX(totalRefund)}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || totalRefund <= 0}
              className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Confirm Refund
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

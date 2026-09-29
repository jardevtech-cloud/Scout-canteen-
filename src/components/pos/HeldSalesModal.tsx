import React from 'react';
import { usePos } from '../../context/PosContext.js';
import { formatUGX, formatDateTime } from '../../utils/format.js';
import { Clock, Trash2, ArrowUpRight, X } from 'lucide-react';
import { HeldSale } from '../../types/index.js';

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeldSalesModal: React.FC<HeldSalesModalProps> = ({ isOpen, onClose }) => {
  const { heldSales, retrieveHeldSale, fetchHeldSales } = usePos();

  if (!isOpen) return null;

  const handleRetrieve = async (held: HeldSale) => {
    await retrieveHeldSale(held);
    onClose();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Discard this held sale?')) return;
    try {
      const token = localStorage.getItem('scouts_pos_token');
      await fetch(`/api/held-sales/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token || '' },
      });
      fetchHeldSales();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
        <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Held Sales ({heldSales.length})</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
          {heldSales.length === 0 ? (
            <div className="text-center py-10 text-stone-500">
              <Clock className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="font-semibold">No held sales found</p>
              <p className="text-xs text-stone-400 mt-1">
                You can hold an in-progress cart anytime by pressing F3.
              </p>
            </div>
          ) : (
            heldSales.map((held) => (
              <div
                key={held.id}
                onClick={() => handleRetrieve(held)}
                className="group p-4 rounded-xl border border-stone-200 hover:border-emerald-600 bg-stone-50 hover:bg-emerald-50/50 transition cursor-pointer flex items-center justify-between shadow-xs"
              >
                <div>
                  <h4 className="font-bold text-stone-900 group-hover:text-emerald-900 flex items-center gap-1.5 text-sm">
                    <span>{held.reference_name}</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
                  </h4>
                  <div className="text-xs text-stone-500 mt-0.5 space-x-2">
                    <span>{held.cart.length} item(s)</span>
                    <span>•</span>
                    <span>Held: {formatDateTime(held.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-stone-500 block">Total Due</span>
                    <span className="font-bold font-mono text-emerald-900">
                      {formatUGX(held.total_amount)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(held.id, e)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Discard Held Sale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-stone-100 border-t border-stone-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-sm transition"
          >
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};

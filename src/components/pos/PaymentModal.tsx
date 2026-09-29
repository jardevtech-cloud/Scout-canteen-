import React, { useState } from 'react';
import { usePos } from '../../context/PosContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { formatUGX, playSound } from '../../utils/format.js';
import { Banknote, Smartphone, CreditCard, CheckCircle2, X, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoutData?: {
    scout_name?: string;
    scout_id?: string;
    patrol?: string;
    unit_section?: string;
    school_group?: string;
  };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, scoutData }) => {
  const { cart, subtotal, discount, total, clearCart, activeShift, setCompletedSale } = usePos();
  const { token, user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'MTN Mobile Money' | 'Airtel Money' | 'Card' | 'Other'>('Cash');
  const [amountPaid, setAmountPaid] = useState<number>(total);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update amountPaid when total changes
  React.useEffect(() => {
    setAmountPaid(total);
  }, [total]);

  if (!isOpen) return null;

  const change = Math.max(0, amountPaid - total);
  const isShort = paymentMethod === 'Cash' && amountPaid < total;

  // Quick cash note buttons for Uganda Shillings (UGX)
  const cashNotes = [1000, 2000, 5000, 10000, 20000, 50000];

  const handleQuickCash = (note: number) => {
    playSound('click');
    setAmountPaid((prev) => (prev >= total ? note : prev + note));
  };

  const handleExactCash = () => {
    playSound('click');
    setAmountPaid(total);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setErrorMsg('Cart is empty.');
      return;
    }

    if (isShort) {
      setErrorMsg(`Amount paid (${formatUGX(amountPaid)}) is less than total due (${formatUGX(total)}).`);
      playSound('error');
      return;
    }

    if ((paymentMethod === 'MTN Mobile Money' || paymentMethod === 'Airtel Money') && !paymentReference.trim()) {
      setErrorMsg(`Please enter the Mobile Money transaction reference number.`);
      playSound('error');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    // Generate client idempotency key to prevent double checkout
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          subtotal: item.subtotal,
        })),
        subtotal,
        discount,
        total,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'Cash' ? amountPaid : total,
        change_amount: paymentMethod === 'Cash' ? change : 0,
        payment_reference: paymentReference.trim(),
        notes: notes.trim(),
        scout_name: scoutData?.scout_name,
        scout_id: scoutData?.scout_id,
        patrol: scoutData?.patrol,
        unit_section: scoutData?.unit_section,
        school_group: scoutData?.school_group,
        shift_id: activeShift?.id,
        idempotency_key: idempotencyKey,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete sale.');
      }

      playSound('success');
      clearCart();
      setCompletedSale(data.sale);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing error.');
      playSound('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Banknote className="w-6 h-6 text-amber-400" />
              Complete Payment
            </h2>
            <p className="text-xs text-emerald-300">
              Cashier: {user?.full_name} • {cart.length} item(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Due Big Display */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Total Amount Payable
            </span>
            <div className="text-3xl font-extrabold text-emerald-950 font-mono tracking-tight mt-0.5">
              {formatUGX(total)}
            </div>
            {discount > 0 && (
              <span className="text-xs text-emerald-700">
                (Includes {formatUGX(discount)} discount)
              </span>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition ${
                  paymentMethod === 'Cash'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('MTN Mobile Money')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition ${
                  paymentMethod === 'MTN Mobile Money'
                    ? 'border-amber-500 bg-amber-500 text-amber-950 shadow-md'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-1" />
                <span>MTN MoMo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Airtel Money')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition ${
                  paymentMethod === 'Airtel Money'
                    ? 'border-rose-600 bg-rose-600 text-white shadow-md'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-1" />
                <span>Airtel Money</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Card')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition ${
                  paymentMethod === 'Card'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span>Card</span>
              </button>
            </div>
          </div>

          {/* Cash Payment Details */}
          {paymentMethod === 'Cash' && (
            <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Cash Tendered (UGX)
                </label>
                <button
                  type="button"
                  onClick={handleExactCash}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Exact Amount ({formatUGX(total)})
                </button>
              </div>

              <input
                type="number"
                min="0"
                step="500"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full text-2xl font-bold font-mono px-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                placeholder="Enter cash given..."
                autoFocus
              />

              {/* Quick UGX Note Denomination Buttons */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
                  Uganda Shillings Quick Cash Notes:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {cashNotes.map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => handleQuickCash(note)}
                      className="py-1.5 px-2 bg-white hover:bg-emerald-100 hover:text-emerald-900 border border-stone-300 hover:border-emerald-500 rounded text-xs font-mono font-bold transition shadow-xs"
                    >
                      +{note.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Calculator */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 font-medium">Customer Change</span>
                  <div
                    className={`text-xl font-bold font-mono ${
                      isShort ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {isShort ? `Short by ${formatUGX(total - amountPaid)}` : formatUGX(change)}
                  </div>
                </div>
                {amountPaid >= total && (
                  <div className="text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Change Ready</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Money / Card Reference Input */}
          {(paymentMethod === 'MTN Mobile Money' ||
            paymentMethod === 'Airtel Money' ||
            paymentMethod === 'Card') && (
            <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                {paymentMethod === 'Card' ? 'Card Transaction / Approval Code' : `${paymentMethod} Transaction ID / Ref`}
                <span className="text-rose-500 font-bold ml-1">*</span>
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={
                  paymentMethod === 'Card'
                    ? 'e.g. APPR-948123'
                    : 'e.g. 1928374652 / MP-UG892'
                }
                className="w-full text-base font-mono px-3.5 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                autoFocus
              />
              <p className="text-xs text-stone-500">
                Please verify transaction confirmation message on customer device before completing.
              </p>
            </div>
          )}

          {/* Scout Attribution Summary (if specified) */}
          {scoutData?.scout_name && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <span className="font-bold">Scout: </span>
                <span>{scoutData.scout_name}</span>
                {scoutData.patrol && <span> • Patrol: {scoutData.patrol}</span>}
              </div>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                Scout Sale
              </span>
            </div>
          )}

          {/* Optional Order Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              Sale Note / Receipt Remark (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Camp troop bulk purchase..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-200 transition text-sm"
          >
            Cancel (ESC)
          </button>

          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={submitting || isShort}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-emerald-700/20 transition cursor-pointer"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Complete Sale (UGX {total.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

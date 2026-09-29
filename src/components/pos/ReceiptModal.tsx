import React, { useState } from 'react';
import { Sale } from '../../types/index.js';
import { usePos } from '../../context/PosContext.js';
import { formatUGX, formatDateTime } from '../../utils/format.js';
import { Printer, Download, X, Copy, Check } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings } = usePos();
  const [receiptWidth, setReceiptWidth] = useState<'80mm' | '58mm'>(
    settings?.receipt_width === '58mm' ? '58mm' : '80mm'
  );
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPlainTextReceipt = () => {
    const divider = '='.repeat(receiptWidth === '58mm' ? 32 : 42);
    const subdivider = '-'.repeat(receiptWidth === '58mm' ? 32 : 42);

    let text = '';
    text += `${settings?.canteen_name || 'UGANDA SCOUTS CANTEEN'}\n`;
    text += `${settings?.canteen_address || 'Baden Powell House, Kampala'}\n`;
    text += `Tel: ${settings?.telephone || '+256 414 258 584'}\n`;
    if (settings?.tin_number) text += `TIN: ${settings.tin_number}\n`;
    text += `${divider}\n`;
    text += `RECEIPT: ${sale.receipt_number}\n`;
    text += `DATE: ${formatDateTime(sale.created_at)}\n`;
    text += `CASHIER: ${sale.cashier_name}\n`;
    if (sale.scout_name) {
      text += `SCOUT: ${sale.scout_name}${sale.patrol ? ` (${sale.patrol})` : ''}\n`;
    }
    text += `${subdivider}\n`;
    text += `ITEM                    QTY   PRICE   TOTAL\n`;
    text += `${subdivider}\n`;

    if (sale.items) {
      for (const item of sale.items) {
        const name = item.product_name.padEnd(20).substring(0, 20);
        const qty = String(item.quantity).padStart(3);
        const price = String(item.unit_price).padStart(7);
        const sub = String(item.subtotal).padStart(8);
        text += `${name} ${qty} ${price} ${sub}\n`;
      }
    }

    text += `${divider}\n`;
    text += `SUBTOTAL:     ${formatUGX(sale.subtotal)}\n`;
    if (sale.discount > 0) {
      text += `DISCOUNT:    -${formatUGX(sale.discount)}\n`;
    }
    text += `TOTAL:        ${formatUGX(sale.total)}\n`;
    text += `PAYMENT:      ${sale.payment_method}\n`;
    text += `TENDERED:     ${formatUGX(sale.amount_paid)}\n`;
    text += `CHANGE:       ${formatUGX(sale.change_amount)}\n`;
    if (sale.payment_reference) {
      text += `REF/AUTH:     ${sale.payment_reference}\n`;
    }
    text += `${divider}\n`;
    text += `${settings?.receipt_footer || 'Thank you for supporting the Scouts! Be Prepared.'}\n`;

    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPlainTextReceipt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getPlainTextReceipt();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${sale.receipt_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      {/* Container */}
      <div className="bg-stone-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-700 flex flex-col max-h-[95vh]">
        {/* Controls Bar (Not Printed) */}
        <div className="bg-stone-800 px-4 py-3 flex items-center justify-between border-b border-stone-700 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-stone-300">Format:</span>
            <div className="flex rounded-lg bg-stone-700 p-0.5 border border-stone-600">
              <button
                type="button"
                onClick={() => setReceiptWidth('80mm')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  receiptWidth === '80mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setReceiptWidth('58mm')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  receiptWidth === '58mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                58mm Thermal
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition"
              title="Copy Receipt Text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition"
              title="Download Receipt File"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center bg-stone-950/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Real Thermal Paper Canvas */}
          <div
            id="printable-receipt"
            className={`bg-white text-black p-5 shadow-xl font-mono text-xs leading-tight border border-stone-200 print:border-none print:shadow-none print:m-0 print:p-0 ${
              receiptWidth === '58mm' ? 'w-[280px]' : 'w-[360px]'
            }`}
          >
            {/* Logo & Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-400">
              {/* Scout Emblem */}
              <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-emerald-900 text-amber-400 flex items-center justify-center font-bold text-lg border border-emerald-950">
                ⚜
              </div>
              <h2 className="font-bold text-sm tracking-wider uppercase">
                {settings?.canteen_name || 'UGANDA SCOUTS CANTEEN'}
              </h2>
              <p className="text-[11px] text-stone-600 mt-0.5">
                {settings?.canteen_address || 'Baden Powell House, Buganda Road, Kampala'}
              </p>
              <p className="text-[10px] text-stone-600">
                Tel: {settings?.telephone || '+256 414 258 584'}
              </p>
              {settings?.tin_number && (
                <p className="text-[10px] text-stone-600">TIN: {settings.tin_number}</p>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-stone-400">
              <div className="flex justify-between">
                <span className="font-bold">RECEIPT #:</span>
                <span className="font-bold">{sale.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span>{formatDateTime(sale.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{sale.cashier_name}</span>
              </div>
              {sale.scout_name && (
                <div className="flex justify-between font-semibold text-emerald-900 bg-stone-100 px-1 py-0.5 rounded">
                  <span>SCOUT MEMBER:</span>
                  <span>
                    {sale.scout_name} {sale.patrol ? `(${sale.patrol})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-stone-400">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-stone-300 text-stone-600 text-left">
                    <th className="pb-1">ITEM</th>
                    <th className="pb-1 text-center">QTY</th>
                    <th className="pb-1 text-right">PRICE</th>
                    <th className="pb-1 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sale.items &&
                    sale.items.map((item, idx) => (
                      <tr key={idx} className="py-1">
                        <td className="py-1 pr-1 font-sans text-xs">
                          {item.product_name}
                        </td>
                        <td className="py-1 text-center font-bold">{item.quantity}</td>
                        <td className="py-1 text-right">{item.unit_price.toLocaleString()}</td>
                        <td className="py-1 text-right font-bold">
                          {item.subtotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="py-3 space-y-1 text-xs border-b border-dashed border-stone-400">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatUGX(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-stone-700">
                  <span>DISCOUNT:</span>
                  <span>-{formatUGX(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-stone-200">
                <span>TOTAL DUE:</span>
                <span>{formatUGX(sale.total)}</span>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-stone-400">
              <div className="flex justify-between">
                <span>PAYMENT METHOD:</span>
                <span className="font-bold uppercase">{sale.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>AMOUNT TENDERED:</span>
                <span>{formatUGX(sale.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>CHANGE RETURNED:</span>
                <span>{formatUGX(sale.change_amount)}</span>
              </div>
              {sale.payment_reference && (
                <div className="flex justify-between text-[10px] text-stone-600">
                  <span>REF / TRANS ID:</span>
                  <span>{sale.payment_reference}</span>
                </div>
              )}
            </div>

            {/* Receipt Footer */}
            <div className="pt-4 pb-2 text-center text-[10px] space-y-1">
              <p className="font-bold uppercase text-stone-800">
                {settings?.receipt_footer || 'Thank you for supporting the Scouts! Be Prepared.'}
              </p>
              <p className="text-stone-500">Uganda Scouts Association • Goods once sold can be exchanged with receipt</p>
              <div className="text-[9px] text-stone-400 pt-2 font-mono">
                Powered by Scouts Canteen POS System
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Not Printed) */}
        <div className="bg-stone-800 p-4 border-t border-stone-700 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-600 text-stone-300 hover:text-white hover:bg-stone-700 font-semibold text-sm transition"
          >
            Close / New Sale (F1)
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

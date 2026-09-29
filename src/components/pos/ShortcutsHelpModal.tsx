import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', desc: 'Start New Sale / Clear Current Cart', tag: 'Global' },
    { key: 'F2', desc: 'Focus USB Barcode Scanner Input', tag: 'Fast Scan' },
    { key: 'F3', desc: 'Hold Current In-Progress Sale', tag: 'Queue' },
    { key: 'F4', desc: 'Retrieve Held Sale', tag: 'Queue' },
    { key: 'F5', desc: 'Open Payment / Checkout Modal', tag: 'Checkout' },
    { key: 'Ctrl + Enter', desc: 'Quick Complete Sale', tag: 'Checkout' },
    { key: 'ESC', desc: 'Close Open Dialogs / Cancel Action', tag: 'Cancel' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
        <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">POS Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-stone-500 mb-2">
            The Scouts Canteen POS is fully optimized for continuous, high-speed cashier operation with zero mouse usage.
          </p>

          <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between p-3 text-sm">
                <span className="text-stone-700 font-medium">{s.desc}</span>
                <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-white text-emerald-900 border border-stone-300 rounded shadow-xs">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <span className="font-bold">Tip:</span>
            <span>
              Standard USB barcode scanners automatically send the barcode followed by an Enter keystroke. The POS catches this instantly!
            </span>
          </div>
        </div>

        <div className="p-4 bg-stone-100 border-t border-stone-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition"
          >
            Got it (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};

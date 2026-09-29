import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Product } from '../../types/index.js';
import { formatUGX } from '../../utils/format.js';
import { Barcode, Printer, X } from 'lucide-react';

interface BarcodeGeneratorModalProps {
  products: Product[];
  initialProduct?: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  products,
  initialProduct,
  isOpen,
  onClose,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number | ''>(
    initialProduct?.id || (products.length > 0 ? products[0].id : '')
  );
  const [labelQuantity, setLabelQuantity] = useState<number>(6);
  const [customBarcode, setCustomBarcode] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const svgRef = useRef<SVGSVGElement | null>(null);

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
      setCustomBarcode(initialProduct.barcode);
      setCustomName(initialProduct.name);
      setCustomPrice(initialProduct.selling_price);
    } else if (selectedProduct) {
      setCustomBarcode(selectedProduct.barcode);
      setCustomName(selectedProduct.name);
      setCustomPrice(selectedProduct.selling_price);
    }
  }, [initialProduct, selectedProductId]);

  useEffect(() => {
    if (customBarcode && svgRef.current) {
      try {
        JsBarcode(svgRef.current, customBarcode, {
          format: 'CODE128',
          lineColor: '#000',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          font: 'monospace',
          margin: 5,
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [customBarcode]);

  if (!isOpen) return null;

  const handlePrintLabels = () => {
    window.print();
  };

  const generateRandomScoutBarcode = () => {
    const randomCode = '600' + Math.floor(1000 + Math.random() * 9000);
    setCustomBarcode(randomCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white print:hidden">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Printable Barcode Label Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Controls (Hidden when printing) */}
        <div className="p-6 border-b border-stone-200 space-y-4 print:hidden bg-stone-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Select Product
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.barcode}) - {formatUGX(p.selling_price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Barcode (Code 128)
                </label>
                <button
                  type="button"
                  onClick={generateRandomScoutBarcode}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold"
                >
                  Generate New
                </button>
              </div>
              <input
                type="text"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                placeholder="e.g. 6001099"
                className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Label Title / Product Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Number of Labels to Print
              </label>
              <input
                type="number"
                min="1"
                max="48"
                value={labelQuantity}
                onChange={(e) => setLabelQuantity(Math.min(48, Math.max(1, Number(e.target.value))))}
                className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Printable Label Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-100 print:bg-white print:p-0">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 print:hidden">
            Print Sheet Preview ({labelQuantity} labels):
          </div>

          <div
            id="printable-barcodes"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-4 bg-white p-4 rounded-xl shadow-xs print:shadow-none print:p-0"
          >
            {Array.from({ length: labelQuantity }).map((_, index) => (
              <div
                key={index}
                className="p-3 border border-stone-300 rounded-lg text-center flex flex-col items-center justify-between bg-white print:border-stone-400 print:rounded-none"
              >
                <div className="text-[11px] font-bold text-emerald-950 uppercase truncate max-w-full">
                  UGANDA SCOUTS CANTEEN
                </div>
                <div className="text-xs font-semibold text-stone-800 line-clamp-1 mt-0.5">
                  {customName}
                </div>
                <div className="my-1 w-full flex justify-center overflow-hidden">
                  <svg
                    ref={index === 0 ? svgRef : undefined}
                    id={`barcode-svg-${index}`}
                    className="max-w-full h-auto"
                  />
                </div>
                <div className="text-xs font-bold font-mono text-emerald-900 mt-0.5">
                  {customPrice !== '' ? formatUGX(Number(customPrice)) : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions (Hidden when printing) */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition"
          >
            Close
          </button>

          <button
            onClick={handlePrintLabels}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print {labelQuantity} Barcode Labels</span>
          </button>
        </div>
      </div>
    </div>
  );
};

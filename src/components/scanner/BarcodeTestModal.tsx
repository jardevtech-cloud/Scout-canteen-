import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Product } from '../../types/index.js';
import { formatUGX, playSound } from '../../utils/format.js';
import { Barcode, ScanLine, CheckCircle2, AlertCircle, Volume2, RotateCcw } from 'lucide-react';

export const BarcodeTestModal: React.FC = () => {
  const { token } = useAuth();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string>('None');
  const [lastScanDurationMs, setLastScanDurationMs] = useState<number | null>(null);
  const [charCount, setCharCount] = useState<number>(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'found' | 'not-found' | 'searching'>('idle');
  const [history, setHistory] = useState<Array<{ barcode: string; time: string; product?: string; status: string }>>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const keyTimesRef = useRef<number[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    keyTimesRef.current.push(performance.now());

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;

      // Calculate scanner speed: USB scanners usually send all chars within 20-100ms
      let durationMs = 0;
      if (keyTimesRef.current.length > 1) {
        durationMs = Math.round(
          keyTimesRef.current[keyTimesRef.current.length - 1] - keyTimesRef.current[0]
        );
      }
      keyTimesRef.current = [];

      lookupBarcode(code, durationMs);
      setBarcodeInput('');
    }
  };

  const lookupBarcode = async (code: string, durationMs?: number) => {
    setLastScanned(code);
    setCharCount(code.length);
    if (durationMs !== undefined) setLastScanDurationMs(durationMs);
    setLookupStatus('searching');

    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`, {
        headers: { 'x-auth-token': token || '' },
      });

      const nowStr = new Date().toLocaleTimeString();

      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        setLookupStatus('found');
        playSound('scan');
        setHistory((prev) => [
          { barcode: code, time: nowStr, product: data.product.name, status: 'Found' },
          ...prev.slice(0, 19),
        ]);
      } else {
        setProduct(null);
        setLookupStatus('not-found');
        playSound('error');
        setHistory((prev) => [
          { barcode: code, time: nowStr, status: 'Not In Database' },
          ...prev.slice(0, 19),
        ]);
      }
    } catch {
      setLookupStatus('not-found');
      playSound('error');
    }
  };

  const resetTest = () => {
    setBarcodeInput('');
    setLastScanned('None');
    setLastScanDurationMs(null);
    setCharCount(0);
    setProduct(null);
    setLookupStatus('idle');
    keyTimesRef.current = [];
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 select-none">
      {/* Header Banner */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 border border-emerald-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Barcode className="w-7 h-7 text-amber-400" />
            <h2 className="text-2xl font-bold">Hardware Barcode Scanner Diagnostic Mode</h2>
          </div>
          <p className="text-sm text-emerald-200 mt-1">
            Test any standard USB HID Barcode Scanner, handheld gun, or keyboard emulation scanner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900 border border-emerald-500 text-xs font-bold text-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SCANNER STATUS: READY</span>
          </div>

          <button
            onClick={() => playSound('scan')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-xs font-medium text-white transition border border-emerald-600"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Beep</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Scanner Input Box & Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-emerald-700" />
                Live Scanner Stream Input
              </label>
              <button
                onClick={resetTest}
                className="text-xs text-stone-500 hover:text-emerald-700 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Diagnostic</span>
              </button>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan any barcode now with your USB scanner or type manually and press Enter..."
                className="w-full text-lg font-mono font-bold px-4 py-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50/20 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 transition"
                autoFocus
              />
              <span className="absolute right-3 top-3.5 px-2 py-1 bg-emerald-800 text-emerald-100 rounded text-xs font-mono font-semibold">
                READY
              </span>
            </div>

            <p className="text-xs text-stone-500">
              When the USB scanner is pointed at a barcode, it triggers automatic character transmission followed by an Enter key.
            </p>
          </div>

          {/* Diagnostic Metrics Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Last Scanned Barcode
              </span>
              <span className="text-lg font-extrabold font-mono text-emerald-950 mt-1 block truncate">
                {lastScanned}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Characters Detected
              </span>
              <span className="text-lg font-extrabold font-mono text-stone-800 mt-1 block">
                {charCount} digits/chars
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Hardware Input Speed
              </span>
              <span className="text-lg font-extrabold font-mono text-stone-800 mt-1 block">
                {lastScanDurationMs !== null ? `${lastScanDurationMs} ms` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Scanned Product Match Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">
              Database Lookup Result
            </h3>

            {lookupStatus === 'searching' && (
              <div className="p-6 text-center text-stone-500">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Searching product database...</span>
              </div>
            )}

            {lookupStatus === 'found' && product && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-emerald-950 truncate">
                      {product.name}
                    </h4>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      {product.category}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 mt-1 space-x-3 font-mono">
                    <span>Barcode: {product.barcode}</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-900">
                      Price: {formatUGX(product.selling_price)}
                    </span>
                    <span>•</span>
                    <span>Stock: {product.stock_quantity} {product.unit || 'pcs'}</span>
                  </div>
                </div>
              </div>
            )}

            {lookupStatus === 'not-found' && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    Product Not Found in Database
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Barcode <code className="font-mono font-bold bg-amber-200/60 px-1 py-0.5 rounded">{lastScanned}</code> is not registered. Go to Products tab to add it.
                  </p>
                </div>
              </div>
            )}

            {lookupStatus === 'idle' && (
              <div className="p-6 text-center text-stone-400 text-sm">
                No scan performed yet. Scan a product barcode or enter a sample barcode (e.g. <code className="font-mono font-bold text-stone-600">6001001</code>) above.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scan Event Log */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3 flex flex-col h-[520px]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
            <span>Scan Log History</span>
            <span className="text-xs font-normal text-stone-500">
              {history.length} scans
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 text-xs">
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-stone-400">
                Log is empty
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-stone-800">{h.barcode}</div>
                    <div className="text-[11px] text-stone-500 truncate max-w-[180px]">
                      {h.product || h.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        h.status === 'Found'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {h.status}
                    </span>
                    <span className="block text-[10px] text-stone-400 mt-0.5">{h.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

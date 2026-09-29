import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { usePos } from '../../context/PosContext.js';
import { Product, Category, ScoutMember } from '../../types/index.js';
import { formatUGX, playSound } from '../../utils/format.js';
import { PaymentModal } from './PaymentModal.js';
import { ReceiptModal } from './ReceiptModal.js';
import { HeldSalesModal } from './HeldSalesModal.js';
import { ShortcutsHelpModal } from './ShortcutsHelpModal.js';
import {
  ScanLine,
  Search,
  Plus,
  Minus,
  Trash2,
  Tag,
  Clock,
  ArrowRight,
  AlertTriangle,
  X,
  CreditCard,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface PosSalesScreenProps {
  onNavigateToProducts?: () => void;
}

export const PosSalesScreen: React.FC<PosSalesScreenProps> = ({ onNavigateToProducts }) => {
  const { token, isAdmin } = useAuth();
  const {
    cart,
    subtotal,
    discount,
    total,
    addToCart,
    updateQuantity,
    removeItem,
    setCartDiscount,
    clearCart,
    scannerReady,
    setScannerReady,
    handleBarcodeScanned,
    barcodeInputRef,
    focusScanner,
    holdCurrentSale,
    heldSales,
    completedSale,
    setCompletedSale,
    shortcutsOpen,
    setShortcutsOpen,
  } = usePos();

  // Local component state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInputValue, setBarcodeInputValue] = useState<string>('');
  const [isScanningProcessing, setIsScanningProcessing] = useState<boolean>(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [holdRefName, setHoldRefName] = useState('');
  const [isHoldDialogPrompt, setIsHoldDialogPrompt] = useState(false);

  // Scout Attribution
  const [scouts, setScouts] = useState<ScoutMember[]>([]);
  const [selectedScout, setSelectedScout] = useState<ScoutMember | null>(null);
  const [customScoutName, setCustomScoutName] = useState('');
  const [customPatrol, setCustomPatrol] = useState('');
  const [showScoutDrawer, setShowScoutDrawer] = useState(false);

  // Loading products & categories
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const [prodRes, catRes, scoutRes] = await Promise.all([
          fetch('/api/products?active=true', { headers: { 'x-auth-token': token } }),
          fetch('/api/categories', { headers: { 'x-auth-token': token } }),
          fetch('/api/scouts', { headers: { 'x-auth-token': token } }),
        ]);

        if (prodRes.ok) {
          const pData = await prodRes.json();
          setProducts(pData.products || []);
        }
        if (catRes.ok) {
          const cData = await catRes.json();
          setCategories(cData.categories || []);
        }
        if (scoutRes.ok) {
          const sData = await scoutRes.json();
          setScouts(sData.scouts || []);
        }
      } catch (err) {
        console.error('Failed to load POS catalog:', err);
      }
    };

    loadData();
  }, [token]);

  // Autofocus scanner input on mount & periodically if idle
  useEffect(() => {
    focusScanner();
    const interval = setInterval(() => {
      // If no active modals or input focuses, keep scanner active
      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'SELECT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !isPaymentOpen &&
        !completedSale &&
        !isHeldModalOpen
      ) {
        focusScanner();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [focusScanner, isPaymentOpen, completedSale, isHeldModalOpen]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // F1: Clear Cart / New Sale
      if (e.key === 'F1') {
        e.preventDefault();
        if (cart.length > 0) {
          if (confirm('Start new sale and clear active cart?')) {
            clearCart();
          }
        }
        focusScanner();
      }
      // F2: Focus scanner
      else if (e.key === 'F2') {
        e.preventDefault();
        focusScanner();
      }
      // F3: Hold Sale
      else if (e.key === 'F3') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsHoldDialogPrompt(true);
        }
      }
      // F4: Retrieve Held Sale
      else if (e.key === 'F4') {
        e.preventDefault();
        setIsHeldModalOpen(true);
      }
      // F5: Payment
      else if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsPaymentOpen(true);
        }
      }
      // Ctrl + Enter: Quick checkout
      else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsPaymentOpen(true);
        }
      }
      // ESC: Close dialogs
      else if (e.key === 'Escape') {
        if (notFoundBarcode) setNotFoundBarcode(null);
        if (isHoldDialogPrompt) setIsHoldDialogPrompt(false);
        if (isPaymentOpen) setIsPaymentOpen(false);
        if (isHeldModalOpen) setIsHeldModalOpen(false);
        if (completedSale) setCompletedSale(null);
        focusScanner();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, clearCart, focusScanner, notFoundBarcode, isHoldDialogPrompt, isPaymentOpen, isHeldModalOpen, completedSale, setCompletedSale]);

  // Handle barcode submission (from USB HID scanner or manual entry)
  const onBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInputValue.trim();
    if (!code) return;

    setIsScanningProcessing(true);
    setBarcodeInputValue('');

    const result = await handleBarcodeScanned(code);
    setIsScanningProcessing(false);

    if (!result.success) {
      setNotFoundBarcode(code);
    }

    // Always refocus scanner input immediately
    setTimeout(() => {
      focusScanner();
    }, 50);
  };

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchBarcode = p.barcode.toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      return matchName || matchBarcode || matchDesc;
    }
    return true;
  });

  const handleHoldConfirm = async () => {
    await holdCurrentSale(holdRefName);
    setHoldRefName('');
    setIsHoldDialogPrompt(false);
    focusScanner();
  };

  const handleScoutSelect = (memberId: string) => {
    if (!memberId) {
      setSelectedScout(null);
      return;
    }
    const s = scouts.find((sc) => String(sc.id) === memberId);
    if (s) {
      setSelectedScout(s);
      setCustomScoutName(s.full_name);
      setCustomPatrol(s.patrol || '');
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-84px)] overflow-hidden bg-stone-100 select-none">
      {/* ------------------------------------------------------------- */}
      {/* LEFT/MAIN AREA: BARCODE SCANNER, SEARCH, CATEGORIES, PRODUCT GRID */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-stone-200 overflow-hidden bg-stone-50">
        {/* Top Scanner & Search Header */}
        <div className="p-3 bg-white border-b border-stone-200 shadow-xs space-y-2">
          {/* Barcode Scanner Input Row */}
          <div className="flex items-center gap-2">
            <form onSubmit={onBarcodeSubmit} className="flex-1 relative flex items-center">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInputValue}
                onChange={(e) => setBarcodeInputValue(e.target.value)}
                onFocus={() => setScannerReady(true)}
                placeholder="Scan product barcode with USB scanner or enter barcode digits..."
                className="w-full text-base font-mono font-bold pl-10 pr-24 py-2.5 rounded-xl border-2 border-emerald-600 bg-emerald-50/20 focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20 shadow-xs transition"
              />
              <ScanLine className="w-5 h-5 text-emerald-700 absolute left-3 pointer-events-none" />

              <div className="absolute right-2 flex items-center gap-1.5">
                {isScanningProcessing && (
                  <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-1" />
                )}
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-800 text-emerald-100">
                  SCAN (F2)
                </span>
              </div>
            </form>

            {/* Product Search Input */}
            <div className="relative w-56 sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name..."
                className="w-full text-sm pl-9 pr-8 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 pb-0.5">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/80'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/80'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-stone-400">
              <Search className="w-10 h-10 mb-2 text-stone-300" />
              <p className="font-semibold text-stone-600">No products found</p>
              <p className="text-xs text-stone-400 mt-1">
                Try scanning a barcode or adjusting search filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_quantity <= 0;
                const isLowStock = !isOutOfStock && p.stock_quantity <= p.min_stock_level;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isOutOfStock) {
                        addToCart(p, 1);
                        focusScanner();
                      }
                    }}
                    className={`group relative bg-white rounded-xl border p-3 flex flex-col justify-between transition shadow-xs hover:shadow-md cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-60 border-stone-200 bg-stone-50 cursor-not-allowed'
                        : 'border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/20 active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      {/* Category & Stock Badges */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 truncate">
                          {p.category}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Low: {p.stock_quantity}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                            Stock: {p.stock_quantity}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h3 className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-emerald-950">
                        {p.name}
                      </h3>

                      {/* Barcode Display */}
                      <span className="text-[10px] font-mono text-stone-400 block mt-1">
                        #{p.barcode}
                      </span>
                    </div>

                    {/* Price and Add button */}
                    <div className="pt-3 mt-2 border-t border-stone-100 flex items-center justify-between">
                      <div className="font-mono font-extrabold text-sm sm:text-base text-emerald-900">
                        {formatUGX(p.selling_price)}
                      </div>

                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                          isOutOfStock
                            ? 'bg-stone-200 text-stone-400'
                            : 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT AREA: CURRENT CART, QUANTITIES, TOTALS, CHECKOUT */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full lg:w-[420px] xl:w-[460px] bg-white flex flex-col h-full shadow-lg border-l border-stone-200">
        {/* Cart Header */}
        <div className="p-3.5 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base tracking-tight">Current Sale Cart</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-emerald-950">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            {heldSales.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHeldModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-800 text-amber-300 hover:bg-emerald-700 transition"
                title="View Held Sales (F4)"
              >
                Resume ({heldSales.length})
              </button>
            )}

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-stone-400 hover:text-rose-400 p-1 rounded-lg transition"
                title="Clear Cart (F1)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scout Member Attribution Row (Expandable) */}
        <div className="px-3.5 py-2 bg-emerald-900/40 border-b border-emerald-900/60 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-stone-200">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">
              {customScoutName ? (
                <>
                  Scout: <span className="font-bold text-white">{customScoutName}</span>
                  {customPatrol && <span className="text-amber-300"> ({customPatrol})</span>}
                </>
              ) : (
                'General / Walk-in Customer'
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowScoutDrawer(!showScoutDrawer)}
            className="text-[11px] text-amber-300 hover:underline font-semibold"
          >
            {showScoutDrawer ? 'Hide' : customScoutName ? 'Change' : '+ Assign Scout'}
          </button>
        </div>

        {/* Scout Assignment Drawer */}
        {showScoutDrawer && (
          <div className="p-3 bg-emerald-950/20 border-b border-emerald-200 text-xs space-y-2">
            <div className="flex gap-2">
              <select
                value={selectedScout?.id || ''}
                onChange={(e) => handleScoutSelect(e.target.value)}
                className="flex-1 text-xs p-1.5 rounded border border-stone-300 bg-white"
              >
                <option value="">-- Choose Registered Scout --</option>
                {scouts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.patrol || 'No Patrol'}) - {s.member_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customScoutName}
                onChange={(e) => setCustomScoutName(e.target.value)}
                placeholder="Or custom scout name..."
                className="text-xs p-1.5 rounded border border-stone-300 bg-white"
              />
              <input
                type="text"
                value={customPatrol}
                onChange={(e) => setCustomPatrol(e.target.value)}
                placeholder="Patrol (e.g. Eagle, Lion)..."
                className="text-xs p-1.5 rounded border border-stone-300 bg-white"
              />
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 py-12">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                <ScanLine className="w-6 h-6 text-stone-400" />
              </div>
              <p className="font-semibold text-stone-600">Cart is empty</p>
              <p className="text-xs text-stone-400 mt-1 text-center max-w-[220px]">
                Scan product barcode with the USB scanner or click products on the left.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-400 transition flex items-center justify-between gap-2 shadow-2xs"
              >
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-stone-900 text-xs truncate">
                    {item.product.name}
                  </h4>
                  <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                    {formatUGX(item.unit_price)} × {item.quantity}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="p-1 hover:bg-stone-100 rounded text-stone-600 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.product.id, Math.max(1, Number(e.target.value)))
                    }
                    className="w-9 text-center font-mono font-bold text-xs focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="p-1 hover:bg-stone-100 rounded text-stone-600 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right w-20">
                  <span className="font-mono font-bold text-xs text-emerald-950 block">
                    {formatUGX(item.subtotal)}
                  </span>
                </div>

                {/* Remove Item */}
                <button
                  type="button"
                  onClick={() => removeItem(item.product.id)}
                  className="p-1 text-stone-400 hover:text-rose-600 transition"
                  title="Remove from cart"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Financial Summary & Checkout Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 space-y-3">
          {/* Subtotal & Discount rows */}
          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-stone-900">{formatUGX(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <span>Authorized Discount</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono text-stone-400">UGX</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setCartDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 text-right text-xs font-mono font-bold px-2 py-0.5 rounded border border-stone-300 bg-white"
                />
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-stone-300 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  Total Due
                </span>
                <span className="text-2xl font-extrabold text-emerald-950 font-mono tracking-tight">
                  {formatUGX(total)}
                </span>
              </div>

              {/* Hold Sale Button */}
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsHoldDialogPrompt(true)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 hover:border-amber-500 bg-white text-stone-700 hover:text-amber-800 text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                  title="Hold Sale (F3)"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Hold (F3)</span>
                </button>
              )}
            </div>
          </div>

          {/* Complete Sale Action Button */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setIsPaymentOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base shadow-lg shadow-emerald-700/20 transition cursor-pointer"
          >
            <CreditCard className="w-5 h-5" />
            <span>PAY / COMPLETE SALE (F5)</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRODUCT NOT FOUND BANNER / MODAL */}
      {/* ------------------------------------------------------------- */}
      {notFoundBarcode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-amber-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Product Not Found</h3>
            <p className="text-sm text-stone-600 mt-1">
              No product is registered with barcode:
            </p>
            <div className="my-3 py-2 px-3 bg-stone-100 rounded-lg font-mono font-bold text-emerald-950 text-base">
              {notFoundBarcode}
            </div>

            <div className="flex flex-col gap-2 mt-4">
              {isAdmin && onNavigateToProducts && (
                <button
                  type="button"
                  onClick={() => {
                    setNotFoundBarcode(null);
                    onNavigateToProducts();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition"
                >
                  Register New Product with this Barcode
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setNotFoundBarcode(null);
                  focusScanner();
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition"
              >
                Scan Again / Cancel (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HOLD SALE PROMPT MODAL */}
      {/* ------------------------------------------------------------- */}
      {isHoldDialogPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-2">Hold Current Sale</h3>
            <p className="text-xs text-stone-500 mb-3">
              Enter a reference note or customer/Scout name to identify this held cart later.
            </p>
            <input
              type="text"
              value={holdRefName}
              onChange={(e) => setHoldRefName(e.target.value)}
              placeholder="e.g. Scout Patrol Leader / Grace"
              className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsHoldDialogPrompt(false)}
                className="px-3 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHoldConfirm}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PAYMENT MODAL */}
      {/* ------------------------------------------------------------- */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          focusScanner();
        }}
        scoutData={{
          scout_name: customScoutName || selectedScout?.full_name,
          scout_id: selectedScout?.member_number,
          patrol: customPatrol || selectedScout?.patrol,
          unit_section: selectedScout?.unit_section,
          school_group: selectedScout?.group_name,
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* RECEIPT MODAL (UPON SALE COMPLETION) */}
      {/* ------------------------------------------------------------- */}
      <ReceiptModal
        sale={completedSale}
        onClose={() => {
          setCompletedSale(null);
          focusScanner();
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* HELD SALES RETRIEVE MODAL */}
      {/* ------------------------------------------------------------- */}
      <HeldSalesModal
        isOpen={isHeldModalOpen}
        onClose={() => {
          setIsHeldModalOpen(false);
          focusScanner();
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* SHORTCUTS CHEAT SHEET */}
      {/* ------------------------------------------------------------- */}
      <ShortcutsHelpModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
};

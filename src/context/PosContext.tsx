import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, CartItem, CashierShift, HeldSale, Sale, SystemSettings } from '../types/index.js';
import { useAuth } from './AuthContext.js';
import { playSound } from '../utils/format.js';

interface PosContextType {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  cartItemCount: number;
  addToCart: (product: Product, qty?: number) => boolean;
  updateQuantity: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  setCartDiscount: (discountVal: number) => void;
  clearCart: () => void;
  
  // Scanner state & controls
  scannerReady: boolean;
  setScannerReady: (ready: boolean) => void;
  lastScannedBarcode: string;
  notFoundBarcode: string | null;
  setNotFoundBarcode: (code: string | null) => void;
  handleBarcodeScanned: (rawBarcode: string) => Promise<{ success: boolean; product?: Product; error?: string }>;
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  focusScanner: () => void;

  // Shifts
  activeShift: CashierShift | null;
  shiftLoading: boolean;
  refreshShift: () => Promise<void>;

  // Held Sales
  heldSales: HeldSale[];
  fetchHeldSales: () => Promise<void>;
  holdCurrentSale: (refName: string) => Promise<boolean>;
  retrieveHeldSale: (held: HeldSale) => Promise<void>;

  // Settings
  settings: SystemSettings | null;
  refreshSettings: () => Promise<void>;

  // Sale Receipt Modal
  completedSale: Sale | null;
  setCompletedSale: (sale: Sale | null) => void;

  // Shortcuts modal
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('scouts_pos_active_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [discount, setDiscount] = useState<number>(0);
  const [scannerReady, setScannerReady] = useState(true);
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Focus scanner helper
  const focusScanner = useCallback(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
      setScannerReady(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('scouts_pos_active_cart', JSON.stringify(cart));
  }, [cart]);

  // Fetch settings
  const refreshSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-auth-token': token },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings as SystemSettings);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, [token]);

  // Fetch active shift
  const refreshShift = useCallback(async () => {
    if (!token) {
      setActiveShift(null);
      setShiftLoading(false);
      return;
    }
    setShiftLoading(true);
    try {
      const res = await fetch('/api/shifts/current', {
        headers: { 'x-auth-token': token },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.shift || null);
      }
    } catch (e) {
      console.error('Failed to load shift:', e);
    } finally {
      setShiftLoading(false);
    }
  }, [token]);

  // Fetch held sales
  const fetchHeldSales = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/held-sales', {
        headers: { 'x-auth-token': token },
      });
      if (res.ok) {
        const data = await res.json();
        setHeldSales(data.heldSales || []);
      }
    } catch (e) {
      console.error('Failed to fetch held sales:', e);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshSettings();
      refreshShift();
      fetchHeldSales();
    }
  }, [token, refreshSettings, refreshShift, fetchHeldSales]);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = Math.max(0, subtotal - discount);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add product to cart
  const addToCart = useCallback((product: Product, quantity = 1): boolean => {
    const allowNegative = settings?.allow_negative_inventory === '1';

    let success = false;
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);

      if (existingIndex > -1) {
        const currentItem = prev[existingIndex];
        const newQty = currentItem.quantity + quantity;

        if (!allowNegative && newQty > product.stock_quantity) {
          playSound('error');
          alert(`Cannot add more "${product.name}". Only ${product.stock_quantity} available in stock.`);
          return prev;
        }

        const updated = [...prev];
        const itemSubtotal = (currentItem.unit_price * newQty) - currentItem.discount;
        updated[existingIndex] = {
          ...currentItem,
          quantity: newQty,
          subtotal: Math.max(0, itemSubtotal),
        };
        playSound('scan');
        success = true;
        return updated;
      } else {
        if (!allowNegative && quantity > product.stock_quantity) {
          playSound('error');
          alert(`Cannot add "${product.name}". Only ${product.stock_quantity} available in stock.`);
          return prev;
        }

        const itemSubtotal = (product.selling_price * quantity);
        playSound('scan');
        success = true;
        return [
          ...prev,
          {
            product,
            quantity,
            unit_price: product.selling_price,
            discount: 0,
            subtotal: itemSubtotal,
          },
        ];
      }
    });

    return success;
  }, [settings]);

  // Update item quantity
  const updateQuantity = useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }

    const allowNegative = settings?.allow_negative_inventory === '1';

    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.id === productId) {
          if (!allowNegative && qty > item.product.stock_quantity) {
            playSound('error');
            alert(`Stock limit reached for "${item.product.name}". Max available is ${item.product.stock_quantity}.`);
            return item;
          }
          const sub = (item.unit_price * qty) - item.discount;
          return {
            ...item,
            quantity: qty,
            subtotal: Math.max(0, sub),
          };
        }
        return item;
      });
    });
  }, [settings]);

  // Remove item
  const removeItem = useCallback((productId: number) => {
    playSound('click');
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const setCartDiscount = useCallback((discountVal: number) => {
    setDiscount(Math.max(0, discountVal));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount(0);
    playSound('click');
  }, []);

  // Handle scanned barcode (from USB scanner or keyboard input)
  const handleBarcodeScanned = useCallback(async (rawBarcode: string) => {
    const cleanBarcode = rawBarcode.trim();
    if (!cleanBarcode || !token) return { success: false, error: 'Empty barcode' };

    setLastScannedBarcode(cleanBarcode);

    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(cleanBarcode)}`, {
        headers: { 'x-auth-token': token },
      });

      if (res.ok) {
        const data = await res.json();
        const prod: Product = data.product;
        const added = addToCart(prod, 1);
        setNotFoundBarcode(null);
        return { success: added, product: prod };
      } else {
        playSound('error');
        setNotFoundBarcode(cleanBarcode);
        return { success: false, error: 'Product not found' };
      }
    } catch (err: any) {
      playSound('error');
      return { success: false, error: err.message };
    }
  }, [token, addToCart]);

  // Hold current sale
  const holdCurrentSale = useCallback(async (refName: string): Promise<boolean> => {
    if (cart.length === 0 || !token) return false;
    try {
      const res = await fetch('/api/held-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          reference_name: refName || `Sale by ${user?.username} (${cart.length} items)`,
          cart,
          total_amount: total,
        }),
      });

      if (res.ok) {
        clearCart();
        fetchHeldSales();
        playSound('success');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [cart, token, total, user, clearCart, fetchHeldSales]);

  // Retrieve held sale
  const retrieveHeldSale = useCallback(async (held: HeldSale) => {
    if (!token) return;
    setCart(held.cart);
    try {
      await fetch(`/api/held-sales/${held.id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token },
      });
      fetchHeldSales();
      playSound('click');
    } catch (e) {
      console.error(e);
    }
  }, [token, fetchHeldSales]);

  return (
    <PosContext.Provider
      value={{
        cart,
        subtotal,
        discount,
        total,
        cartItemCount,
        addToCart,
        updateQuantity,
        removeItem,
        setCartDiscount,
        clearCart,
        scannerReady,
        setScannerReady,
        lastScannedBarcode,
        notFoundBarcode,
        setNotFoundBarcode,
        handleBarcodeScanned,
        barcodeInputRef,
        focusScanner,
        activeShift,
        shiftLoading,
        refreshShift,
        heldSales,
        fetchHeldSales,
        holdCurrentSale,
        retrieveHeldSale,
        settings,
        refreshSettings,
        completedSale,
        setCompletedSale,
        shortcutsOpen,
        setShortcutsOpen,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) throw new Error('usePos must be used within a PosProvider');
  return context;
};

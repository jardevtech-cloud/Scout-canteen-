import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { usePos } from '../context/PosContext.js';
import {
  ShoppingCart,
  Package,
  Layers,
  Receipt,
  Clock,
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  Database,
  Barcode,
  Keyboard,
  LogOut,
  ScanLine,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, isAdmin } = useAuth();
  const { scannerReady, focusScanner, activeShift, setShortcutsOpen, heldSales } = usePos();

  return (
    <header className="bg-emerald-950 text-white border-b border-emerald-800 shadow-md sticky top-0 z-40 select-none">
      {/* Top Brand Bar */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-emerald-900/60 bg-emerald-950">
        <div className="flex items-center gap-3">
          {/* Scout Fleur-de-lis Emblem */}
          <div className="w-10 h-10 rounded-lg bg-emerald-800 border border-emerald-600 flex items-center justify-center shadow-inner text-amber-300 font-bold text-xl">
            <svg
              className="w-6 h-6 fill-current text-amber-400 drop-shadow"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white uppercase flex items-center gap-1.5 font-sans">
                SCOUTS CANTEEN POS
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-800 text-amber-300 border border-emerald-700">
                UGANDA
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 -mt-0.5">
              Uganda Scouts Association • National Canteen
            </p>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="flex items-center gap-3">
          {/* Scanner Status Button */}
          <button
            onClick={focusScanner}
            title="Click to refocus USB Barcode Scanner (F2)"
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all border ${
              scannerReady
                ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500 hover:bg-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-600 hover:bg-amber-900 animate-pulse'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                scannerReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <ScanLine className="w-3.5 h-3.5" />
            <span>{scannerReady ? 'SCANNER READY' : 'CLICK TO FOCUS SCANNER'}</span>
          </button>

          {/* Shift Status */}
          <div
            onClick={() => setActiveTab('shifts')}
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              activeShift
                ? 'bg-emerald-900/50 border-emerald-700 text-emerald-200 hover:bg-emerald-800'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {activeShift ? `Shift #${activeShift.id} (Open)` : 'No Open Shift'}
            </span>
          </div>

          {/* Held Sales indicator */}
          {heldSales.length > 0 && (
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40"
            >
              <span>{heldSales.length} Held</span>
            </button>
          )}
        </div>

        {/* User Profile & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Shortcuts Help Button */}
          <button
            onClick={() => setShortcutsOpen(true)}
            className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800/80 rounded-lg transition"
            title="Keyboard Shortcuts Cheat Sheet"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* User info */}
          <div className="text-right leading-tight">
            <div className="text-xs font-semibold text-white">{user?.full_name}</div>
            <div className="text-[11px] text-amber-300/90 capitalize flex items-center justify-end gap-1">
              <span>{user?.role}</span>
              {isAdmin && <ShieldCheck className="w-3 h-3 text-amber-400 inline" />}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-stone-300 hover:text-rose-400 hover:bg-emerald-900 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto scrollbar-none bg-emerald-900/90 text-sm">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
            activeTab === 'pos'
              ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
              : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS Checkout</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
            activeTab === 'products'
              ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
              : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
            activeTab === 'inventory'
              ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
              : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Inventory & Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
            activeTab === 'sales'
              ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
              : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sales & Receipts</span>
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
            activeTab === 'shifts'
              ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
              : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cashier Shifts</span>
        </button>

        <button
          onClick={() => setActiveTab('scouts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
            activeTab === 'scouts'
              ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
              : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Scouts & Patrols</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner-test')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
            activeTab === 'scanner-test'
              ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
              : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Scanner Test Mode</span>
        </button>

        {isAdmin && (
          <>
            <div className="w-px h-5 bg-emerald-800 mx-1" />

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'reports'
                  ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports & Profits</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'users'
                  ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Users & Audits</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'backup'
                  ? 'bg-amber-500 text-emerald-950 font-bold shadow-sm'
                  : 'text-emerald-100 hover:bg-emerald-800/80 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Backup/Restore</span>
            </button>
          </>
        )}
      </nav>
    </header>
  );
};

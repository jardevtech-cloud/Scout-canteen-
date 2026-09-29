import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { PosProvider } from './context/PosContext.js';
import { LoginView } from './components/auth/LoginView.js';
import { Navbar } from './components/Navbar.js';
import { PosSalesScreen } from './components/pos/PosSalesScreen.js';
import { ProductManagement } from './components/products/ProductManagement.js';
import { InventoryManagement } from './components/inventory/InventoryManagement.js';
import { SalesHistory } from './components/sales/SalesHistory.js';
import { ShiftManagement } from './components/shifts/ShiftManagement.js';
import { ReportsDashboard } from './components/reports/ReportsDashboard.js';
import { ScoutDirectory } from './components/scouts/ScoutDirectory.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { UserManagement } from './components/admin/UserManagement.js';
import { BackupRestore } from './components/backup/BackupRestore.js';
import { BarcodeTestModal } from './components/scanner/BarcodeTestModal.js';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('pos');

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold uppercase tracking-wider">SCOUTS CANTEEN POS</h2>
        <p className="text-xs text-emerald-300 mt-1">Starting offline database & scanner driver...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'pos' && <PosSalesScreen onNavigateToProducts={() => setActiveTab('products')} />}
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'sales' && <SalesHistory />}
        {activeTab === 'shifts' && <ShiftManagement />}
        {activeTab === 'reports' && <ReportsDashboard />}
        {activeTab === 'scouts' && <ScoutDirectory />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'backup' && <BackupRestore />}
        {activeTab === 'scanner-test' && (
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
            <BarcodeTestModal />
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PosProvider>
        <MainApp />
      </PosProvider>
    </AuthProvider>
  );
}

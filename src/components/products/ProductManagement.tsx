import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Product, Category } from '../../types/index.js';
import { formatUGX } from '../../utils/format.js';
import { BarcodeGeneratorModal } from './BarcodeGeneratorModal.js';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  Upload,
  Download,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';

export const ProductManagement: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCostPrice, setFormCostPrice] = useState<number | ''>('');
  const [formSellingPrice, setFormSellingPrice] = useState<number | ''>('');
  const [formStockQty, setFormStockQty] = useState<number | ''>('');
  const [formMinStock, setFormMinStock] = useState<number | ''>(5);
  const [formSupplier, setFormSupplier] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formError, setFormError] = useState('');

  // Barcode generator modal
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products?active=false', { headers: { 'x-auth-token': token || '' } }),
        fetch('/api/categories', { headers: { 'x-auth-token': token || '' } }),
      ]);
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.products || []);
      }
      if (catRes.ok) {
        const cData = await catRes.json();
        setCategories(cData.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProducts();
  }, [token]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormBarcode('600' + Math.floor(1000 + Math.random() * 9000));
    setFormName('');
    setFormCategory(categories[0]?.name || 'Snacks');
    setFormDescription('');
    setFormCostPrice('');
    setFormSellingPrice('');
    setFormStockQty(20);
    setFormMinStock(5);
    setFormSupplier('');
    setFormUnit('pcs');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormBarcode(p.barcode);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormDescription(p.description || '');
    setFormCostPrice(p.cost_price);
    setFormSellingPrice(p.selling_price);
    setFormStockQty(p.stock_quantity);
    setFormMinStock(p.min_stock_level);
    setFormSupplier(p.supplier || '');
    setFormUnit(p.unit || 'pcs');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBarcode.trim() || !formName.trim() || formSellingPrice === '') {
      setFormError('Barcode, Name, and Selling Price are required.');
      return;
    }

    try {
      const payload = {
        barcode: formBarcode.trim(),
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim(),
        cost_price: Number(formCostPrice) || 0,
        selling_price: Number(formSellingPrice) || 0,
        stock_quantity: Number(formStockQty) || 0,
        min_stock_level: Number(formMinStock) || 5,
        supplier: formSupplier.trim(),
        unit: formUnit,
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save product.');
        return;
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Network error.');
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Are you sure you want to deactivate or remove "${p.name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token || '' },
      });
      const data = await res.json();
      if (res.ok) {
        fetchProducts();
      } else {
        alert(data.error || 'Could not delete product.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/reports/export-csv?type=products`;
  };

  const filteredProducts = products.filter((p) => {
    if (selectedCat !== 'All' && p.category !== selectedCat) return false;
    if (stockFilter === 'low' && (p.stock_quantity > p.min_stock_level || p.stock_quantity <= 0)) return false;
    if (stockFilter === 'out' && p.stock_quantity > 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-700" />
            Product Catalog & Pricing
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage canteen goods, prices in Uganda Shillings (UGX), barcode labels, and stock thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setBarcodeProduct(products[0] || null);
              setBarcodeModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition"
          >
            <Barcode className="w-4 h-4 text-emerald-700" />
            <span>Generate Barcodes</span>
          </button>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, barcode, or category..."
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs font-medium px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="All">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">All Stock Statuses</option>
            <option value="low">Low Stock (Alert)</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No products matched your criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.stock_quantity <= 0;
                  const isLow = !isOut && p.stock_quantity <= p.min_stock_level;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-emerald-50/30 transition ${
                        p.is_active === 0 ? 'opacity-50 bg-stone-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {p.barcode}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">
                        <div>{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-stone-400 font-normal line-clamp-1">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-600">
                        {formatUGX(p.cost_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-950">
                        {formatUGX(p.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock_quantity} {p.unit || 'pcs'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.is_active === 0 ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-600">
                            Inactive
                          </span>
                        ) : isOut ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBarcodeProduct(p);
                            setBarcodeModalOpen(true);
                          }}
                          className="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                          title="Print Barcode Label"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete or Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
            <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>{editingProduct ? 'Edit Product' : 'Add New Product'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Barcode Digits *
                  </label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="e.g. 6001001"
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rwenzori Mineral Water 500ml"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Cost Price (UGX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 800"
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Selling Price (UGX) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 1500"
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Min Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="pcs">pcs</option>
                    <option value="bottle">bottle</option>
                    <option value="pack">pack</option>
                    <option value="pair">pair</option>
                    <option value="set">set</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Supplier / Vendor
                </label>
                <input
                  type="text"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  placeholder="e.g. Uganda Scouts HQ Supplies"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Item details, size, or material..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Generator Modal */}
      <BarcodeGeneratorModal
        products={products}
        initialProduct={barcodeProduct}
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
      />
    </div>
  );
};

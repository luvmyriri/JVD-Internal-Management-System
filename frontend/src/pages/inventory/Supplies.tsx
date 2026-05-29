import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuPackage, LuPlus, LuSearch, LuSettings, LuTriangleAlert, LuX, LuLoaderCircle, LuArrowDownToLine
} from 'react-icons/lu';
import { inventoryApi } from '../../api/inventory';
import { Pagination } from '../../components/ui';
import type { InventoryItem, InventoryItemFormData } from '../../types/inventory';

// ── Add/Edit Item Modal ──────────────────────────────────────────────────────
interface ItemModalProps {
  item?: InventoryItem;
  mode?: 'create' | 'edit' | 'view';
  onClose: () => void;
}

function ItemModal({ item, mode = 'create', onClose }: ItemModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<InventoryItemFormData>>(
    item ? {
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      reorder_level: item.reorder_level,
      unit: item.unit,
      unit_cost: item.unit_cost,
    } : {
      quantity: 0, reorder_level: 5, unit: 'pcs', unit_cost: 0
    }
  );

  const mutation = useMutation({
    mutationFn: () => item ? inventoryApi.update(item.id, form) : inventoryApi.create(form as InventoryItemFormData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); onClose(); },
  });

  const formatNumber = (val: string) => val.replace(/\D/g, '');
  const formatCost = (val: string) => val.replace(/[^0-9.]/g, '');

  const field = (label: string, key: keyof InventoryItemFormData, type = 'text', placeholder = '', customOnChange?: (val: string) => void) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => {
          if (customOnChange) customOnChange(e.target.value);
          else setForm(p => ({ ...p, [key]: e.target.value }));
        }}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${mode === 'view' ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-900'}`}
        disabled={mode === 'view'}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {mode === 'create' ? 'Add Supply Item' : mode === 'edit' ? 'Edit Supply Item' : 'View Supply Item'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {mode === 'create' ? 'Register a new consumable or spare part.' : mode === 'edit' ? 'Update stock quantity and details.' : 'Review supply item details.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50 dark:bg-gray-800"><LuX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="item-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {field('Item Name *', 'item_name', 'text', 'e.g. Engine Oil (10W-40)')}
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category *</label>
                <input type="text" list="categories" value={form.category ?? ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  disabled={mode === 'view'}
                  className={`w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${mode === 'view' ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-900'}`} placeholder="e.g. Fluids, Tyres, Filters" />
                <datalist id="categories">
                  <option value="Fluids & Lubricants" />
                  <option value="Spare Parts" />
                  <option value="Tyres" />
                  <option value="Filters" />
                  <option value="Tools" />
                  <option value="Cleaning Supplies" />
                </datalist>
              </div>

              {field('Current Quantity *', 'quantity', 'text', '0', val => setForm(p => ({ ...p, quantity: parseInt(formatNumber(val)) || 0 })))}
              {field('Unit of Measurement *', 'unit', 'text', 'e.g. liters, pcs, sets')}
              
              {field('Reorder Level *', 'reorder_level', 'text', '10', val => setForm(p => ({ ...p, reorder_level: parseInt(formatNumber(val)) || 0 })))}
              {field('Unit Cost (₱) *', 'unit_cost', 'text', '0.00', val => setForm(p => ({ ...p, unit_cost: parseFloat(formatCost(val)) || 0 })))}
            </div>

            {mutation.isError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-900/30 flex items-start gap-3 mt-4">
                <LuTriangleAlert size={18} className="shrink-0 mt-0.5" />
                <p>{(mutation.error as any)?.response?.data?.message || 'Failed to save item. Please check all required fields.'}</p>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition">
            {mode === 'view' ? 'Close' : 'Cancel'}
          </button>
          {mode !== 'view' && (
            <button form="item-form" type="submit" disabled={!form.item_name || !form.category || !form.unit || mutation.isPending}
              className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2 shadow-lg shadow-blue-200/50">
              {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
              {mode === 'edit' ? 'Save Changes' : 'Add Item'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Supplies() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();

  const [page, setPage] = useState(1);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['inventory', search, categoryFilter, lowStockOnly, page],
    queryFn: () => inventoryApi.list({ 
      search: search || undefined, 
      category: categoryFilter || undefined, 
      low_stock: lowStockOnly ? true : undefined,
      page,
      per_page: 10
    }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const items = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const categories = Array.from(new Set(items.map(i => i.category))).filter(Boolean);

  return (
    <div className="space-y-10 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Items
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Parts, Fluids & Consumables
          </p>
        </div>
        <button onClick={() => { setEditingItem(undefined); setModalMode('create'); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20 dark:shadow-blue-900/30">
          <LuPlus size={16} /> Add Item
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 dark:border-gray-800 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search item name..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 font-medium text-gray-600 dark:text-gray-300">
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border ${lowStockOnly ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
          <LuTriangleAlert size={14} className={lowStockOnly ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'} />
          Low Stock Only
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-sm overflow-hidden relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Item Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">In Stock</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Unit Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-50 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2" />
                    Loading inventory data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <LuPackage size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                    No items found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group border-b border-gray-50/50 last:border-0">
                    <td className="px-8 py-6">
                      <div className="font-bold text-gray-900 dark:text-white text-base">{item.item_name}</div>
                    </td>
                    <td className="px-8 py-6 font-medium text-gray-600 dark:text-gray-300">
                      <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold tracking-widest uppercase border border-gray-100 dark:border-gray-800">{item.category}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="font-black text-gray-900 dark:text-white text-xl tracking-tight">{item.quantity}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{item.unit}</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {item.is_low_stock ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest border border-red-100 shadow-sm shadow-red-200/20">
                          <LuArrowDownToLine size={14} /> Reorder (≤{item.reorder_level})
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm shadow-emerald-200/20">
                          Sufficient
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-gray-900 dark:text-white font-bold text-base">₱{item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Per {item.unit}</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setEditingItem(item); setModalMode('view'); setShowModal(true); }}
                          title="View Details"
                          className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-900 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-none rounded-2xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-gray-700">
                          <LuSearch size={18} />
                        </button>
                        <button onClick={() => { setEditingItem(item); setModalMode('edit'); setShowModal(true); }}
                          title="Edit Item"
                          className="p-3 text-gray-400 hover:text-amber-600 hover:bg-white dark:hover:bg-gray-900 hover:shadow-lg hover:shadow-amber-200/50 dark:hover:shadow-none rounded-2xl transition-all border border-transparent hover:border-amber-100 dark:hover:border-gray-700">
                          <LuSettings size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <ItemModal item={editingItem} mode={modalMode} onClose={() => setShowModal(false)} />}

      {meta && meta.last_page > 1 && (
        <Pagination
          currentPage={page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

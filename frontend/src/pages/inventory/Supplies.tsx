import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuPackage, LuPlus, LuSearch, LuSettings, LuTriangleAlert, LuX, LuLoaderCircle, LuArrowDownToLine
} from 'react-icons/lu';
import { inventoryApi } from '../../api/inventory';
import type { InventoryItem, InventoryItemFormData } from '../../types/inventory';

// ── Add/Edit Item Modal ──────────────────────────────────────────────────────
interface ItemModalProps {
  item?: InventoryItem;
  onClose: () => void;
}

function ItemModal({ item, onClose }: ItemModalProps) {
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
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{item ? 'Edit Supply Item' : 'Add Supply Item'}</h2>
            <p className="text-sm text-gray-500 mt-1">{item ? 'Update stock quantity and details.' : 'Register a new consumable or spare part.'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="item-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {field('Item Name *', 'item_name', 'text', 'e.g. Engine Oil (10W-40)')}
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category *</label>
                <input type="text" list="categories" value={form.category ?? ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white" placeholder="e.g. Fluids, Tyres, Filters" />
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
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">
                Failed to save item. Please check all required fields.
              </p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="item-form" type="submit" disabled={!form.item_name || !form.category || !form.unit || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2 shadow-lg shadow-blue-200/50">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
            {item ? 'Save Changes' : 'Add Item'}
          </button>
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
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, categoryFilter, lowStockOnly],
    queryFn: () => inventoryApi.list({ search: search || undefined, category: categoryFilter || undefined, low_stock: lowStockOnly ? true : undefined }),
    staleTime: 30_000,
  });

  const items = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const categories = Array.from(new Set(items.map(i => i.category))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
            {meta?.total ?? '0'} Items
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Parts, Fluids & Consumables
          </p>
        </div>
        <button onClick={() => { setEditingItem(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> Add Item
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
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
          className="px-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-600">
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border ${lowStockOnly ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
          <LuTriangleAlert size={14} className={lowStockOnly ? 'text-amber-600' : 'text-gray-400'} />
          Low Stock Only
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">In Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Unit Price</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
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
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-900">{item.item_name}</td>
                    <td className="px-6 py-4 font-medium text-gray-600">
                      <span className="px-2.5 py-1 rounded-full bg-gray-100 text-[10px] tracking-wider uppercase">{item.category}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-gray-900 text-lg">{item.quantity}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{item.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.is_low_stock ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                          <LuArrowDownToLine size={14} /> Reorder (≤{item.reorder_level})
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          Sufficient
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">
                      ₱{item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => { setEditingItem(item); setShowModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition">
                        <LuSettings size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <ItemModal item={editingItem} onClose={() => setShowModal(false)} />}
    </div>
  );
}

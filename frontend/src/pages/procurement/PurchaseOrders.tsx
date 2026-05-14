import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuPlus, LuSearch, LuLoaderCircle, LuX,
  LuTrash2, LuChevronDown, LuSendHorizontal, LuCheck, LuTriangleAlert,
  LuFileText, LuHash, LuPackage, LuArrowRight,
} from 'react-icons/lu';
import { purchaseOrderApi } from '../../api/purchaseOrders';
import { supplierApi } from '../../api/suppliers';
import type { PurchaseOrder, PurchaseOrderFormData, POLineItem } from '../../types/procurement';
import { PO_STATUS_LABELS } from '../../constants';
import { Pagination } from '../../components/ui';

// ── helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  draft:                     'bg-gray-100 text-gray-600',
  pending_accounting_review: 'bg-amber-100 text-amber-700',
  verified:                  'bg-blue-100 text-blue-700',
  pending_ceo_approval:      'bg-purple-100 text-purple-700',
  approved:                  'bg-emerald-100 text-emerald-700',
  rejected:                  'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {PO_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const fmt = (v: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

// ── Line Item Row (inside Create Modal) ─────────────────────────────────────

type DraftLineItem = Omit<PurchaseOrderFormData['items'][number], never>;

function LineItemRow({
  item, index, onChange, onRemove,
}: { item: DraftLineItem; index: number; onChange: (i: number, v: Partial<DraftLineItem>) => void; onRemove: (i: number) => void }) {
  const set = (key: keyof DraftLineItem, value: string | number) => onChange(index, { [key]: value });
  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Item {index + 1}</p>
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500 transition"><LuTrash2 size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Name *</label>
          <input value={item.item_name} onChange={e => set('item_name', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Part Number</label>
          <input value={item.part_number ?? ''} onChange={e => set('part_number', e.target.value)} placeholder="e.g. BRK-2024-001"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qty *</label>
          <input type="number" min={1} value={item.quantity} onChange={e => set('quantity', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit</label>
          <select value={item.unit_of_measure ?? 'pcs'} onChange={e => set('unit_of_measure', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {['pcs', 'set', 'ltr', 'kg', 'box', 'roll', 'm', 'pair'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit Price (₱) *</label>
          <input type="number" min={0} step={0.01} value={item.unit_price} onChange={e => set('unit_price', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {item.part_number && (
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
            <input value={item.item_notes ?? ''} onChange={e => set('item_notes', e.target.value)} placeholder="Optional notes"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>
      <div className="text-right text-xs font-bold text-blue-600">
        Subtotal: {fmt((item.quantity || 0) * (item.unit_price || 0))}
      </div>
    </div>
  );
}

// ── Create PO Modal ───────────────────────────────────────────────────────────

function CreatePOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [items, setItems] = useState<DraftLineItem[]>([
    { item_name: '', part_number: '', description: '', quantity: 1, unit_of_measure: 'pcs', unit_price: 0, receipt_number: '', item_notes: '' },
  ]);
  const [notes, setNotes] = useState('');

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'verified-only'],
    queryFn: () => supplierApi.list({ accreditation_status: 'accredited', per_page: 200 }),
  });
  const suppliers = suppliersData?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => purchaseOrderApi.create({ supplier_id: supplierId as number, items, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); },
  });

  const addItem = () => setItems(p => [...p, { item_name: '', part_number: '', description: '', quantity: 1, unit_of_measure: 'pcs', unit_price: 0, receipt_number: '', item_notes: '' }]);
  const updateItem = (i: number, vals: Partial<DraftLineItem>) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...vals } : it));
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const total = items.reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0), 0);
  const canSubmit = supplierId && items.every(it => it.item_name && it.quantity > 0 && it.unit_price >= 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create Purchase Order</h2>
            <p className="text-sm text-gray-500 mt-1">Only accredited suppliers are available for selection.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto">
          <form id="po-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-8">
            {/* Supplier */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Supplier *</label>
              <div className="relative">
                <select value={supplierId} onChange={e => setSupplierId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                  <option value="">Select accredited supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>
                <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {suppliers.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100"><LuTriangleAlert size={14} /> No accredited suppliers yet. Verify a supplier first.</p>
              )}
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Line Items *</label>
                <button type="button" onClick={addItem} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"><LuPlus size={14} /> Add Item</button>
              </div>
              <div className="space-y-4">
                {items.map((item, i) => <LineItemRow key={i} item={item} index={i} onChange={updateItem} onRemove={removeItem} />)}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional instructions or notes..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between bg-blue-50/50 rounded-2xl px-6 py-5 border border-blue-100">
              <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">Total Amount</span>
              <span className="text-2xl font-black text-blue-700">{fmt(total)}</span>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">Failed to create PO. Please check all required fields.</p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="po-form" type="submit" disabled={!canSubmit || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition shadow-lg shadow-blue-200/50">
            {mutation.isPending ? <LuLoaderCircle size={16} className="animate-spin" /> : <LuFileText size={16} />} Create Draft PO
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PO Detail Modal ──────────────────────────────────────────────────────────

function PODetailModal({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const submitMutation = useMutation({
    mutationFn: () => purchaseOrderApi.submit(po.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); },
  });
  const approveMutation = useMutation({
    mutationFn: () => purchaseOrderApi.approve(po.id, { approved: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-[2rem]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900">{po.po_number}</h2>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{po.supplier?.company_name ?? `Supplier #${po.supplier_id}`}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><LuX size={20} /></button>
        </div>

        <div className="p-8 space-y-6">
          {/* Line Items */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Line Items</p>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Item', 'Part No.', 'Qty', 'Unit', 'Unit Price', 'Total'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(po.line_items ?? []).map((li: POLineItem) => (
                    <tr key={li.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{li.item_name}</td>
                      <td className="px-4 py-3">
                        {li.part_number ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-mono font-bold">
                            <LuHash size={9} />{li.part_number}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{li.quantity}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{li.unit_of_measure}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(li.unit_price)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{fmt(li.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-blue-700 text-right">Total</td>
                    <td className="px-4 py-3 text-sm font-black text-blue-700">{fmt(po.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Rejection Notes */}
          {po.rejection_notes && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-red-700 mb-1">Rejection Notes</p>
              <p className="text-sm text-red-800">{po.rejection_notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            {po.status === 'draft' && (
              <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-60 transition">
                {submitMutation.isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuSendHorizontal size={14} />}
                Submit for Review
              </button>
            )}
            {(po.status === 'pending_accounting_review' || po.status === 'verified') && (
              <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition">
                {approveMutation.isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuCheck size={14} />}
                Approve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PO Row ───────────────────────────────────────────────────────────────────

function PORow({ po, onClick }: { po: PurchaseOrder; onClick: () => void }) {
  return (
    <tr onClick={onClick} className="cursor-pointer transition-colors border-b border-gray-50/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><LuFileText size={14} /></div>
          <span className="font-mono text-sm font-bold text-gray-900">{po.po_number}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-700">{po.supplier?.company_name ?? `Supplier #${po.supplier_id}`}</td>
      <td className="px-6 py-4"><StatusBadge status={po.status} /></td>
      <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmt(po.total_amount)}</td>
      <td className="px-6 py-4 text-xs text-gray-400">{new Date(po.created_at).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 text-gray-400 hover:text-blue-600 text-sm font-medium transition">View <LuArrowRight size={13} /></div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', search, status, page],
    queryFn: () => purchaseOrderApi.list({ 
      search: search || undefined, 
      status: status || undefined,
      page,
      per_page: 10
    }),
    staleTime: 30_000,
  });

  const pos = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const statuses = ['', 'draft', 'pending_accounting_review', 'verified', 'pending_ceo_approval', 'approved', 'rejected'];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
            {meta?.total ?? '0'} Records
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Draft → Accounting → CEO
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> New PO
        </button>
      </div>

      {/* Pipeline legend */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['Draft', 'Accounting Review', 'Verified', 'CEO Approval', 'Approved'].map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{s}</span>
            {i < arr.length - 1 && <LuArrowRight size={12} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="PO number or supplier..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="pl-4 pr-9 py-2.5 rounded-2xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            {statuses.map(s => <option key={s} value={s}>{s ? PO_STATUS_LABELS[s] : 'All Statuses'}</option>)}
          </select>
          <LuChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-60"><LuLoaderCircle size={28} className="animate-spin text-gray-300" /></div>
        ) : pos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <LuPackage size={40} strokeWidth={1} />
            <p className="text-sm font-medium">No purchase orders found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['PO Number', 'Supplier', 'Status', 'Amount', 'Date', ''].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pos.map(po => <PORow key={po.id} po={po} onClick={() => setSelectedPO(po)} />)}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreatePOModal onClose={() => setShowCreate(false)} />}
      {selectedPO && <PODetailModal po={selectedPO} onClose={() => setSelectedPO(null)} />}

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

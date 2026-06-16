import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuPlus, LuSearch, LuLoaderCircle, LuX,
  LuTrash2, LuChevronDown, LuSendHorizontal, LuCheck, LuTriangleAlert,
  LuFileText, LuHash, LuPackage, LuArrowRight, LuChevronRight,
} from 'react-icons/lu';
import { Eye, CheckCircle, Send } from 'lucide-react';
import { purchaseOrderApi } from '../../api/purchaseOrders';
import { supplierApi } from '../../api/suppliers';
import type { PurchaseOrder, PurchaseOrderFormData, POLineItem } from '../../types/procurement';
import { PO_STATUS_LABELS } from '../../constants';
import { Pagination, Dropdown } from '../../components/ui';
import toast from 'react-hot-toast';

// ── helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  draft:                     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending_accounting_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  verified:                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending_ceo_approval:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  approved:                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected:                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
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
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item {index + 1}</p>
        <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500 transition"><LuTrash2 size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item Name *</label>
          <input value={item.item_name} onChange={e => set('item_name', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Part Number</label>
          <input value={item.part_number ?? ''} onChange={e => set('part_number', e.target.value)} placeholder="e.g. BRK-2024-001"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qty *</label>
          <input type="number" min={1} value={item.quantity} onChange={e => set('quantity', e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit</label>
          <select value={item.unit_of_measure ?? 'pcs'} onChange={e => set('unit_of_measure', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {['pcs', 'set', 'ltr', 'kg', 'box', 'roll', 'm', 'pair'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit Price (₱) *</label>
          <input type="number" min={0} step={0.01} value={item.unit_price} onChange={e => set('unit_price', e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {item.part_number && (
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
            <input value={item.item_notes ?? ''} onChange={e => set('item_notes', e.target.value)} placeholder="Optional notes"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>
      <div className="text-right text-xs font-bold text-blue-600">
        Subtotal: {fmt(Number(item.quantity || 0) * Number(item.unit_price || 0))}
      </div>
    </div>
  );
}

// ── Create PO Modal ───────────────────────────────────────────────────────────

function CreatePOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [items, setItems] = useState<DraftLineItem[]>([
    { item_name: '', part_number: '', description: '', quantity: 1 as any, unit_of_measure: 'pcs', unit_price: '' as any, receipt_number: '', item_notes: '' },
  ]);
  const [notes, setNotes] = useState('');

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'verified-only'],
    queryFn: () => supplierApi.list({ accreditation_status: 'accredited', per_page: 200 }),
  });
  const suppliers = suppliersData?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => purchaseOrderApi.create({
      supplier_id: supplierId as number,
      items: items.map(i => ({
        ...i,
        quantity: Number(i.quantity || 1),
        unit_price: Number(i.unit_price || 0)
      })),
      notes
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); },
  });

  const addItem = () => setItems(p => [...p, { item_name: '', part_number: '', description: '', quantity: 1 as any, unit_of_measure: 'pcs', unit_price: '' as any, receipt_number: '', item_notes: '' }]);
  const updateItem = (i: number, vals: Partial<DraftLineItem>) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...vals } : it));
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const canSubmit = supplierId && items.every(it => it.item_name && Number(it.quantity || 0) > 0 && Number(it.unit_price || 0) >= 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Create Purchase Order</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Only accredited suppliers are available for selection.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50 dark:bg-gray-800"><LuX size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form id="po-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-8">
            {/* Supplier */}
            <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <LuPackage className="text-blue-500" /> Supplier
                </h3>
                <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Supplier *</label>
                <div className="relative">
                  <select value={supplierId} onChange={e => setSupplierId(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                    <option value="">Select accredited supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                  <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {suppliers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100"><LuTriangleAlert size={14} /> No accredited suppliers yet. Verify a supplier first.</p>
                )}
              </div>
            </details>

            {/* Line Items */}
            <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <LuFileText className="text-emerald-500" /> Line Items
                </h3>
                <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Items *</label>
                  <button type="button" onClick={addItem} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"><LuPlus size={14} /> Add Item</button>
                </div>
                <div className="space-y-4">
                  {items.map((item, i) => <LineItemRow key={i} item={item} index={i} onChange={updateItem} onRemove={removeItem} />)}
                </div>
              </div>
            </details>

            {/* Notes */}
            <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <LuFileText className="text-gray-500" /> Additional Notes
                </h3>
                <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional instructions or notes..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
              </div>
            </details>

            {/* Total */}
            <div className="flex items-center justify-between bg-blue-50/50 rounded-2xl px-6 py-5 border border-blue-100">
              <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">Total Amount</span>
              <span className="text-2xl font-black text-blue-700">{fmt(total)}</span>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {(mutation.error as any)?.response?.data?.message || 'Failed to create PO. Please check all required fields.'}
              </p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition">
            Cancel
          </button>
          <button form="po-form" type="submit" disabled={!canSubmit || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
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
  const verifyMutation = useMutation({
    mutationFn: () => purchaseOrderApi.verify(po.id, { approved: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); },
  });
  const approveMutation = useMutation({
    mutationFn: () => purchaseOrderApi.approve(po.id, { approved: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 pb-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-[2rem]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{po.po_number}</h2>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{po.supplier?.company_name ?? `Supplier #${po.supplier_id}`}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><LuX size={20} /></button>
        </div>

        <div className="p-8 space-y-6">
          {/* Line Items */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Line Items</p>
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['Item', 'Part No.', 'Qty', 'Unit', 'Unit Price', 'Total'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {(po.line_items ?? []).map((li: POLineItem) => (
                    <tr key={li.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{li.item_name}</td>
                      <td className="px-4 py-3">
                        {li.part_number ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-mono font-bold">
                            <LuHash size={9} />{li.part_number}
                          </span>
                        ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{li.quantity}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{li.unit_of_measure}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(li.unit_price)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{fmt(li.total_price)}</td>
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1">Rejection Notes</p>
              <p className="text-sm text-red-800 dark:text-red-300">{po.rejection_notes}</p>
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
            {po.status === 'pending_accounting_review' && (
              <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition">
                {verifyMutation.isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuCheck size={14} />}
                Verify PO
              </button>
            )}
            {po.status === 'pending_ceo_approval' && (
              <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition">
                {approveMutation.isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuCheck size={14} />}
                Approve PO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PO Row ───────────────────────────────────────────────────────────────────

function PORow({
  po,
  onDetail,
  onSubmitReview,
  onVerify,
  onApprove
}: {
  po: PurchaseOrder;
  onDetail: (po: PurchaseOrder) => void;
  onSubmitReview: (id: number) => void;
  onVerify: (id: number) => void;
  onApprove: (id: number) => void;
}) {
  return (
    <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all border-b border-gray-50/50 dark:border-gray-800 group last:border-0">
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm shadow-blue-200/20 dark:shadow-none group-hover:bg-white dark:group-hover:bg-gray-800 group-hover:shadow-md transition-all"><LuFileText size={18} /></div>
          <span className="font-black text-gray-900 dark:text-white tracking-tight">{po.po_number}</span>
        </div>
      </td>
      <td className="px-8 py-6 text-sm font-bold text-gray-700 dark:text-gray-200">{po.supplier?.company_name ?? `Supplier #${po.supplier_id}`}</td>
      <td className="px-8 py-6"><StatusBadge status={po.status} /></td>
      <td className="px-8 py-6">
        <div className="text-gray-900 dark:text-white font-black text-base">{fmt(po.total_amount)}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Total Amount</div>
      </td>
      <td className="px-8 py-6">
        <div className="text-gray-700 dark:text-gray-200 font-medium text-xs">{new Date(po.created_at).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Date Issued</div>
      </td>
      <td className="px-8 py-6">
        <Dropdown
          items={[
            {
              label: 'View Details',
              icon: <Eye size={14} />,
              onClick: () => onDetail(po)
            },
            ...(po.status === 'draft' ? [{
              label: 'Submit for Review',
              icon: <Send size={14} />,
              onClick: () => onSubmitReview(po.id)
            }] : []),
            ...(po.status === 'pending_accounting_review' ? [{
              label: 'Verify PO',
              icon: <CheckCircle size={14} />,
              onClick: () => onVerify(po.id)
            }] : []),
            ...(po.status === 'pending_ceo_approval' ? [{
              label: 'Approve PO',
              icon: <CheckCircle size={14} />,
              onClick: () => onApprove(po.id)
            }] : []),
          ]}
        />
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['purchase-orders', search, status, page],
    queryFn: () => purchaseOrderApi.list({ 
      search: search || undefined, 
      status: status || undefined,
      page,
      per_page: 10
    }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order submitted for review successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to submit purchase order.');
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderApi.verify(id, { approved: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order verified successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to verify purchase order.');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderApi.approve(id, { approved: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order approved successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to approve purchase order.');
    }
  });

  const pos = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const statuses = ['', 'draft', 'pending_accounting_review', 'verified', 'pending_ceo_approval', 'approved', 'rejected'];

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Records
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Draft → Accounting → CEO
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
          <LuPlus size={16} /> New PO
        </button>
      </div>

      {/* Pipeline legend */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {['Draft', 'Accounting Review', 'Verified', 'CEO Approval', 'Approved'].map((s, i, arr) => (
          <div key={s} className="flex items-center gap-4 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 whitespace-nowrap">{s}</span>
            {i < arr.length - 1 && <LuArrowRight size={14} className="text-gray-200 dark:text-gray-700" />}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
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
            className="pl-5 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white font-bold">
            {statuses.map(s => <option key={s} value={s}>{s ? PO_STATUS_LABELS[s] : 'All Statuses'}</option>)}
          </select>
          <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className={`bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative ${pos.length > 0 ? 'min-h-[350px]' : ''}`}>
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-60"><LuLoaderCircle size={28} className="animate-spin text-gray-300" /></div>
        ) : pos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <LuPackage size={40} strokeWidth={1} />
            <p className="text-sm font-medium">No purchase orders found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <tr>
                {['PO Number', 'Supplier', 'Status', 'Amount', 'Date', ''].map(h => (
                  <th key={h} className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-50 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {pos.map(po => (
                <PORow
                  key={po.id}
                  po={po}
                  onDetail={setSelectedPO}
                  onSubmitReview={(id) => submitMutation.mutate(id)}
                  onVerify={(id) => verifyMutation.mutate(id)}
                  onApprove={(id) => approveMutation.mutate(id)}
                />
              ))}
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

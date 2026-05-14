import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuWrench, LuPlus, LuSearch, LuLoaderCircle, LuX, LuChevronDown,
  LuCheck, LuBan, LuTriangleAlert, LuArrowRight, LuClock,
  LuShieldCheck, LuClipboardList,
} from 'react-icons/lu';
import { workOrderApi } from '../../api/workOrders';
import type { WorkOrder, WorkOrderFormData } from '../../types/procurement';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS } from '../../constants';
import { Pagination } from '../../components/ui';

// ── helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700',
  open:             'bg-blue-100 text-blue-700',
  in_progress:      'bg-purple-100 text-purple-700',
  completed:        'bg-emerald-100 text-emerald-700',
  cancelled:        'bg-gray-100 text-gray-500',
};

const priorityStyles: Record<string, string> = {
  routine:  'bg-gray-50 text-gray-500 border border-gray-200',
  urgent:   'bg-orange-50 text-orange-600 border border-orange-200',
  critical: 'bg-red-50 text-red-600 border border-red-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {WO_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityStyles[priority] ?? ''}`}>
      {WO_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ── Approve / Reject Modal ───────────────────────────────────────────────────

function ApprovalModal({ wo, onClose }: { wo: WorkOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => workOrderApi.approve(wo.id, { notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders'] }); onClose(); },
  });
  const rejectMutation = useMutation({
    mutationFn: () => workOrderApi.reject(wo.id, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders'] }); onClose(); },
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-black text-gray-900">Review Work Order</h2>
            <p className="text-xs text-gray-500 mt-0.5">{wo.wo_number} · Auto-generated PMS</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><LuX size={18} /></button>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-5">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-bold mb-1"><LuTriangleAlert size={13} /> Auto-Generated Work Order</div>
          <p className="text-xs text-amber-800">{wo.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <PriorityBadge priority={wo.priority} />
            <span className="text-xs text-amber-700">Bus: {wo.bus?.plate_number ?? `#${wo.bus_id}`}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(['approve', 'reject'] as const).map(a => (
            <button key={a} type="button" onClick={() => setAction(a)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${action === a
                ? a === 'approve' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {a === 'approve' ? 'Approve' : 'Reject'}
            </button>
          ))}
        </div>

        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder={action === 'reject' ? 'Required: reason for rejection...' : 'Optional approval notes...'}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">Cancel</button>
          {action === 'approve' ? (
            <button onClick={() => approveMutation.mutate()} disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition">
              {isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuCheck size={14} />} Approve
            </button>
          ) : (
            <button onClick={() => rejectMutation.mutate()} disabled={isPending || !notes.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition">
              {isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuBan size={14} />} Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create WO Modal ──────────────────────────────────────────────────────────

function CreateWOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<WorkOrderFormData>({ bus_id: 0, assigned_to: 0, priority: 'routine', description: '' });
  const mutation = useMutation({
    mutationFn: () => workOrderApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders'] }); onClose(); },
  });
  const f = (label: string, key: keyof WorkOrderFormData, type = 'text') => (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={(form[key] as string | number) || ''} onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder={`Enter ${label.replace(' *', '').replace(' (User ID)', '').toLowerCase()}...`} />
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Request Work Order</h2>
            <p className="text-sm text-gray-500 mt-1">Submit a maintenance or repair request for a fleet vehicle.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="wo-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {f('Bus ID *', 'bus_id', 'number')}
              {f('Assigned Mechanic (User ID)', 'assigned_to', 'number')}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority Level</label>
              <div className="relative">
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as WorkOrderFormData['priority'] }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
                <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Detailed Description *</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue, symptoms, or maintenance required..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            </div>
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="wo-form" type="submit" disabled={!form.bus_id || !form.description || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition shadow-lg shadow-blue-200/50">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />} Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WO Row ───────────────────────────────────────────────────────────────────

function WORow({ wo, onReview }: { wo: WorkOrder; onReview: (wo: WorkOrder) => void }) {
  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <LuWrench size={14} />
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-gray-900">{wo.wo_number}</p>
            {wo.auto_generated && (
              <span className="text-[10px] text-purple-500 font-semibold">Auto-generated (PMS)</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-700">{wo.bus?.plate_number ?? `Bus #${wo.bus_id}`}</td>
      <td className="px-6 py-4"><PriorityBadge priority={wo.priority} /></td>
      <td className="px-6 py-4"><StatusBadge status={wo.status} /></td>
      <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">{wo.description}</td>
      <td className="px-6 py-4">
        {wo.status === 'pending_approval' ? (
          <button onClick={() => onReview(wo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition">
            <LuShieldCheck size={12} /> Review
          </button>
        ) : wo.approved_by ? (
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><LuCheck size={12} /> Approved</div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-gray-400"><LuArrowRight size={12} /></div>
        )}
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkOrders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [reviewWO, setReviewWO] = useState<WorkOrder | null>(null);

  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', search, status, page],
    queryFn: () => workOrderApi.list({ 
      search: search || undefined, 
      status: status || undefined,
      page,
      per_page: 10
    }),
    staleTime: 30_000,
  });

  const wos = data?.data?.data ?? [];
  const meta = data?.data?.meta;
  const pendingCount = wos.filter(w => w.status === 'pending_approval').length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
            {meta?.total ?? '0'} Requests
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Maintenance & Mechanics
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> Request W.O.
        </button>
      </div>

      {/* Pending approval banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
          <LuClock size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            <strong>{pendingCount}</strong> auto-generated work order{pendingCount > 1 ? 's' : ''} pending your approval.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search work orders..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="pl-4 pr-9 py-2.5 rounded-2xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            <option value="">All Statuses</option>
            {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <LuChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-60"><LuLoaderCircle size={28} className="animate-spin text-gray-300" /></div>
        ) : wos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <LuClipboardList size={40} strokeWidth={1} />
            <p className="text-sm font-medium">No work orders found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['W.O. Number', 'Bus', 'Priority', 'Status', 'Description', 'Action'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wos.map(wo => <WORow key={wo.id} wo={wo} onReview={setReviewWO} />)}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateWOModal onClose={() => setShowCreate(false)} />}
      {reviewWO && <ApprovalModal wo={reviewWO} onClose={() => setReviewWO(null)} />}

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

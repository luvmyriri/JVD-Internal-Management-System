import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  LuWrench, LuPlus, LuSearch, LuLoaderCircle, LuX, LuChevronDown,
  LuCheck, LuBan, LuTriangleAlert, LuClock,
  LuClipboardList, LuArrowRight,
} from 'react-icons/lu';
import { 
  Eye, 
  CheckCircle, 
  FileEdit, 
  ShieldCheck
} from 'lucide-react';
import { workOrderApi } from '../../api/workOrders';
import { fleetApi } from '../../api/fleet';
import type { WorkOrder, WorkOrderFormData } from '../../types/procurement';
import { WO_STATUS_LABELS, WO_PRIORITY_LABELS } from '../../constants';
import { Pagination, Dropdown, ConfirmDialog, PipelineVisualizer } from '../../components/ui';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../../utils';


// ── helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  pending_validation: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  pending_approval:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  verified:           'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  open:               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled:          'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const priorityStyles: Record<string, string> = {
  routine:  'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400',
  urgent:   'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400',
  critical: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
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
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-black text-gray-900 dark:text-white">Review Work Order</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{wo.wo_number} · Auto-generated PMS</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><LuX size={18} /></button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl px-5 py-4 mb-5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold mb-1"><LuTriangleAlert size={13} /> Auto-Generated Work Order</div>
          <p className="text-xs text-amber-800 dark:text-amber-300">{wo.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <PriorityBadge priority={wo.priority} />
            <span className="text-xs text-amber-700 dark:text-amber-400">Bus: {wo.bus?.plate_number ?? `#${wo.bus_id}`}</span>
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
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition">Cancel</button>
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

// ── Detail Modal ─────────────────────────────────────────────────────────────

function WODetailModal({ wo, onClose }: { wo: WorkOrder; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
              <LuWrench size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{wo.wo_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={wo.status} />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {wo.auto_generated ? 'PMS Auto-System' : 'Manual Request'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:text-white transition-all active:scale-95">
            <LuX size={20} />
          </button>
        </div>

        <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
          {/* Pipeline Visualizer */}
          <PipelineVisualizer 
            pipelineType={wo.type === 'trip' ? 'transaction' : 'maintenance'}
            currentStatus={wo.status}
            metadata={{
              approved_by: wo.approver ? `${wo.approver.first_name} ${wo.approver.last_name}` : undefined,
              approved_at: wo.approved_at || undefined,
              bus_plate: wo.bus?.plate_number,
              driver_name: wo.assignee ? `${wo.assignee.first_name} ${wo.assignee.last_name}` : undefined,
              ticket_no: wo.trip_ticket_id ? `TT-${wo.trip_ticket_id}` : undefined,
            }}
          />

          {/* Main Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Vehicle</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{wo.bus?.plate_number ?? `Bus #${wo.bus_id}`}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{wo.bus?.model ?? 'Vehicle Model Details'} {wo.bus?.bus_category ? `• ${wo.bus.bus_category}` : ''}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority Level</p>
              <div className="pt-1"><PriorityBadge priority={wo.priority} /></div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <LuClipboardList size={14} /> Work Description
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic">
              "{wo.description}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Created Date</p>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <LuClock size={16} className="text-blue-500" />
                {new Date(wo.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned To</p>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-[10px]">
                  {wo.assignee ? wo.assignee.first_name.charAt(0) : '?'}
                </div>
                {wo.assignee ? `${wo.assignee.first_name} ${wo.assignee.last_name}` : 'Unassigned'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:bg-gray-800 transition-all active:scale-95">
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create WO Modal ──────────────────────────────────────────────────────────

function CreateWOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<WorkOrderFormData>>({ bus_id: 0, priority: 'routine', description: '' });
  const mutation = useMutation({
    mutationFn: () => workOrderApi.create(form as WorkOrderFormData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders'] }); onClose(); },
  });

  const { data: busesData, isLoading: busesLoading } = useQuery({
    queryKey: ['buses-dropdown'],
    queryFn: () => fleetApi.list({ per_page: 100 }),
    staleTime: 60_000,
  });
  const buses = busesData?.data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Request Work Order</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Submit a maintenance or repair request for a fleet vehicle.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50 dark:bg-gray-800"><LuX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="wo-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div>
              {/* Bus ID Dropdown */}
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bus ID *</label>
              <div className="relative">
                <select
                  value={form.bus_id || ''}
                  onChange={e => setForm(p => ({ ...p, bus_id: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                >
                  <option value="">{busesLoading ? 'Loading buses...' : 'Select a bus...'}</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.plate_number} — {bus.model} {bus.bus_category ? `• ${bus.bus_category}` : ''} {bus.year ? `(${bus.year})` : ''}
                    </option>
                  ))}
                </select>
                <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority Level</label>
              <div className="relative">
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as WorkOrderFormData['priority'] }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            </div>
            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {(mutation.error as any)?.response?.data?.message || 'Failed to submit work order request.'}
              </p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition">
            Cancel
          </button>
          <button form="wo-form" type="submit" disabled={!form.bus_id || !form.description || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />} Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit WO Modal ────────────────────────────────────────────────────────────

function EditWOModal({ wo, onClose }: { wo: WorkOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<WorkOrderFormData>>({
    bus_id: wo.bus_id,
    assigned_to: wo.assigned_to || undefined,
    priority: wo.priority as any,
    description: wo.description,
    parts_used: wo.parts_used || '',
    cost: wo.cost ? Number(wo.cost) : 0,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        cost: Number(parseMoneyInput(String(form.cost || 0))),
      };
      return workOrderApi.update(wo.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work Order updated successfully!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update work order.');
    },
  });

  const { data: busesData, isLoading: busesLoading } = useQuery({
    queryKey: ['buses-dropdown'],
    queryFn: () => fleetApi.list({ per_page: 100 }),
    staleTime: 60_000,
  });
  const buses = busesData?.data?.data ?? [];

  const f = (label: string, key: keyof Partial<WorkOrderFormData>, type = 'text') => {
    const isCost = key === 'cost';
    return (
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
        <input 
          type={isCost ? 'text' : type} 
          value={isCost ? formatMoneyInput(String(form[key] ?? '')) : ((form[key] as string | number) || '')} 
          onChange={e => {
            if (isCost) {
              const clean = parseMoneyInput(e.target.value);
              if ((clean.split('.').length - 1) > 1) return;
              setForm(p => ({ ...p, cost: clean as any }));
            } else {
              setForm(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }));
            }
          }}
          onKeyDown={(e) => {
            if (isCost) {
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
              }
            }
          }}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white dark:bg-gray-800 dark:text-white" 
          placeholder={`Enter ${label.toLowerCase()}...`} 
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Edit Work Order</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Modify work order details, priority, assignment, parts, or cost.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50 dark:bg-gray-800"><LuX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="edit-wo-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Bus ID Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bus ID *</label>
                <div className="relative">
                  <select
                    value={form.bus_id || ''}
                    onChange={e => setForm(p => ({ ...p, bus_id: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  >
                    <option value="">{busesLoading ? 'Loading buses...' : 'Select a bus...'}</option>
                    {buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.plate_number} — {bus.model} {bus.bus_category ? `• ${bus.bus_category}` : ''} {bus.year ? `(${bus.year})` : ''}
                      </option>
                    ))}
                  </select>
                  <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {f('Assigned Mechanic (User ID)', 'assigned_to', 'number')}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority Level</label>
                <div className="relative">
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                  <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {f('Cost (₱)', 'cost', 'number')}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Detailed Description *</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue or maintenance required..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white dark:bg-gray-800 dark:text-white" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Parts Used</label>
              <textarea rows={2} value={form.parts_used} onChange={e => setForm(p => ({ ...p, parts_used: e.target.value }))}
                placeholder="List parts used or required (comma-separated)..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white dark:bg-gray-800 dark:text-white" />
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {(mutation.error as any)?.response?.data?.message || 'Failed to update work order.'}
              </p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition">
            Cancel
          </button>
          <button form="edit-wo-form" type="submit" disabled={!form.bus_id || !form.description || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WO Row ───────────────────────────────────────────────────────────────────

function WORow({ 
  wo, 
  onReview, 
  onDetail, 
  onComplete,
  onGenerateJO,
  onEdit,
}: { 
  wo: WorkOrder; 
  onReview: (wo: WorkOrder) => void;
  onDetail: (wo: WorkOrder) => void;
  onComplete: (wo: WorkOrder) => void;
  onGenerateJO: (wo: WorkOrder) => void;
  onEdit: (wo: WorkOrder) => void;
}) {
  const { user } = useAuth();
  const canApproveOrEdit = user?.role === 'super_admin' || user?.role === 'executive_vice_president' || user?.role === 'operations_manager' || user?.role === 'head_mechanic' || user?.role === 'service_adviser';

  return (
    <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-sm shadow-purple-200/20 dark:shadow-none group-hover:bg-white dark:group-hover:bg-gray-800 group-hover:shadow-md transition-all">
            <LuWrench size={18} />
          </div>
          <div>
            <p className="font-black text-gray-900 dark:text-white tracking-tight">{wo.wo_number}</p>
            {wo.auto_generated && (
              <span className="text-[10px] text-purple-500 font-black uppercase tracking-widest mt-1">Auto-generated (PMS)</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <div className="text-sm font-bold text-gray-700 dark:text-gray-200">{wo.bus?.plate_number ?? `Bus #${wo.bus_id}`}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{wo.bus?.model ?? 'Vehicle Details'} {wo.bus?.bus_category ? `• ${wo.bus.bus_category}` : ''}</div>
      </td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800"><PriorityBadge priority={wo.priority} /></td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800"><StatusBadge status={wo.status} /></td>
      <td className="px-8 py-6 text-xs text-gray-500 dark:text-gray-400 max-w-[300px] leading-relaxed border-b border-gray-50 dark:border-gray-800">{wo.description}</td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <Dropdown 
          items={[
            { 
              label: 'View Details', 
              icon: <Eye size={14} />, 
              onClick: () => onDetail(wo) 
            },
            ...((wo.status === 'pending_approval' || wo.status === 'verified') && canApproveOrEdit ? [{ 
              label: 'Review Order', 
              icon: <ShieldCheck size={14} />, 
              onClick: () => onReview(wo) 
            }] : []),
            ...(wo.status === 'open' ? [{ 
              label: 'Generate J.O.', 
              icon: <LuArrowRight size={14} />, 
              onClick: () => onGenerateJO(wo)
            }] : []),
            ...(wo.status === 'in_progress' ? [{ 
              label: 'Mark Completed', 
              icon: <CheckCircle size={14} />, 
              onClick: () => onComplete(wo)
            }] : []),
            ...(wo.status !== 'completed' && wo.status !== 'cancelled' && canApproveOrEdit ? [{ 
              label: 'Edit Request', 
              icon: <FileEdit size={14} />, 
              onClick: () => onEdit(wo)
            }] : []),
          ]}
        />
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editWO, setEditWO] = useState<WorkOrder | null>(null);
  const [reviewWO, setReviewWO] = useState<WorkOrder | null>(null);
  const [detailWO, setDetailWO] = useState<WorkOrder | null>(null);
  const [confirmJO, setConfirmJO] = useState<WorkOrder | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<WorkOrder | null>(null);

  const [page, setPage] = useState(1);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['work-orders', search, status, page],
    queryFn: () => workOrderApi.list({ 
      search: search || undefined, 
      status: status || undefined,
      page,
      per_page: 10
    }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => workOrderApi.complete(id, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order marked as completed!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to mark work order as completed.');
    }
  });

  const generateJOMutation = useMutation({
    mutationFn: (id: number) => workOrderApi.generateJobOrder(id, { requires_po: false }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      qc.invalidateQueries({ queryKey: ['job-orders'] });
      toast.success(`Job Order generated successfully: ${res.data?.data?.jo_number ?? ''}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to generate Job Order.');
    }
  });

  const wos = data?.data?.data ?? [];
  const meta = data?.data?.meta;
  const pendingCount = wos.filter(w => w.status === 'pending_approval' || w.status === 'verified').length;

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Requests
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Maintenance & Mechanics
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
          <LuPlus size={16} /> Request W.O.
        </button>
      </div>

      {/* Pending approval banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-[1.5rem] px-6 py-4 shadow-sm shadow-amber-200/20 dark:shadow-none">
          <LuClock size={18} className="text-amber-600 dark:text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
            {pendingCount} auto-generated work order{pendingCount > 1 ? 's' : ''} pending your approval.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
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
            className="pl-5 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white font-bold">
            <option value="">All Statuses</option>
            {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className={`bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative ${wos.length > 0 ? 'min-h-[350px]' : ''}`}>
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-60"><LuLoaderCircle size={28} className="animate-spin text-gray-300" /></div>
        ) : wos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <LuClipboardList size={40} strokeWidth={1} />
            <p className="text-sm font-medium">No work orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 uppercase tracking-[0.2em] text-[10px]">
                <tr>
                  {['W.O. Number', 'Bus', 'Priority', 'Status', 'Description', 'Action'].map(h => (
                    <th key={h} className="px-8 py-5 text-left font-black text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
                {wos.map(wo => (
                  <WORow 
                    key={wo.id} 
                    wo={wo} 
                    onReview={setReviewWO} 
                    onDetail={setDetailWO}
                    onComplete={(item) => setConfirmComplete(item)}
                    onGenerateJO={(item) => setConfirmJO(item)}
                    onEdit={setEditWO}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateWOModal onClose={() => setShowCreate(false)} />}
      {editWO && <EditWOModal wo={editWO} onClose={() => setEditWO(null)} />}
      {reviewWO && <ApprovalModal wo={reviewWO} onClose={() => setReviewWO(null)} />}
      {detailWO && <WODetailModal wo={detailWO} onClose={() => setDetailWO(null)} />}

      {confirmJO && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmJO(null)}
          onConfirm={() => generateJOMutation.mutate(confirmJO.id)}
          title="Generate Job Order"
          message={`Generate a Job Order from Work Order ${confirmJO.wo_number}?`}
          confirmText="Generate J.O."
          variant="success"
        />
      )}

      {confirmComplete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmComplete(null)}
          onConfirm={() => completeMutation.mutate(confirmComplete.id)}
          title="Mark Completed"
          message="Are you sure you want to mark this work order as completed?"
          confirmText="Complete"
          variant="success"
        />
      )}

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

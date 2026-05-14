import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuClipboardList, LuPlus, LuSearch, LuLoaderCircle, LuX, LuChevronDown,
  LuCalendar, LuMapPin, LuArrowRight, LuWrench, LuUsers,
} from 'react-icons/lu';
import { jobOrderApi } from '../../api/jobOrders';
import type { JobOrder, JobOrderFormData } from '../../types/procurement';
import { JO_STATUS_LABELS, SERVICE_TYPE_LABELS } from '../../constants';

// ── helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  created:     'bg-sky-100 text-sky-700',
  confirmed:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-gray-100 text-gray-500',
};

const serviceTypeStyles: Record<string, string> = {
  bus_rental:           'bg-indigo-50 text-indigo-600',
  field_trip:           'bg-teal-50 text-teal-600',
  corporate_transport:  'bg-blue-50 text-blue-600',
  travel_package:       'bg-violet-50 text-violet-600',
  event:                'bg-pink-50 text-pink-600',
  maintenance:          'bg-orange-50 text-orange-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {JO_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ServiceTypeBadge({ type }: { type: string }) {
  const isMainenance = type === 'maintenance';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${serviceTypeStyles[type] ?? 'bg-gray-50 text-gray-600'}`}>
      {isMainenance && <LuWrench size={9} />}
      {!isMainenance && <LuUsers size={9} />}
      {SERVICE_TYPE_LABELS[type] ?? type}
    </span>
  );
}

const fmt = (date: string) => new Date(date).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });

// ── Create JO Modal ───────────────────────────────────────────────────────────

function CreateJOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<JobOrderFormData>({
    customer_id: 0,
    service_type: 'bus_rental',
    service_date: '',
    destination: '',
    total_cost: 0,
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => jobOrderApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-orders'] }); onClose(); },
  });

  const set = (key: keyof JobOrderFormData, value: string | number) => setForm(p => ({ ...p, [key]: value }));
  const isMaintenanceType = form.service_type === 'maintenance';
  const canSubmit = (isMaintenanceType || form.customer_id > 0) && form.service_date && form.destination;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-[2rem]">
          <div>
            <h2 className="text-xl font-black text-gray-900">New Job Order</h2>
            <p className="text-xs text-gray-500 mt-0.5">Issued by Ma'am Minda · No PO needed unless parts are required.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><LuX size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-8 space-y-4">
          {/* Service Type */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Type *</label>
            <div className="relative">
              <select value={form.service_type} onChange={e => set('service_type', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                <option value="maintenance">Maintenance (PMS)</option>
              </select>
              <LuChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Maintenance notice */}
          {isMaintenanceType && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 text-xs text-orange-700">
              <strong>PMS Maintenance JO</strong> — This will be linked to a Work Order. A PO will only be issued if external parts are required.
            </div>
          )}

          {/* Customer — not required for maintenance */}
          {!isMaintenanceType && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer ID *</label>
              <input type="number" value={form.customer_id || ''} onChange={e => set('customer_id', Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Date *</label>
              <input type="date" value={form.service_date} onChange={e => set('service_date', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bus ID (optional)</label>
              <input type="number" value={form.bus_id ?? ''} onChange={e => set('bus_id', Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Destination / Description *</label>
            <input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="e.g. Baguio City or 'Engine overhaul'"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estimated Cost (₱)</label>
            <input type="number" min={0} step={0.01} value={form.total_cost} onChange={e => set('total_cost', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
            <textarea rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {mutation.isError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">Failed to create job order.</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" disabled={!canSubmit || mutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition">
              {mutation.isPending && <LuLoaderCircle size={14} className="animate-spin" />}
              Create J.O.
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── JO Row ───────────────────────────────────────────────────────────────────

function JORow({ jo }: { jo: JobOrder }) {
  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <LuClipboardList size={14} />
          </div>
          <span className="font-mono text-sm font-bold text-gray-900">{jo.jo_number}</span>
        </div>
      </td>
      <td className="px-6 py-4"><ServiceTypeBadge type={jo.service_type} /></td>
      <td className="px-6 py-4 text-sm text-gray-700">
        {jo.customer ? `${jo.customer.first_name} ${jo.customer.last_name}` : jo.service_type === 'maintenance' ? 'PMS Maintenance' : `Customer #${jo.customer_id}`}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <LuMapPin size={11} className="text-gray-400 shrink-0" />
          <span className="truncate max-w-[150px]">{jo.destination}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <LuCalendar size={11} className="text-gray-400" />
          {fmt(jo.service_date)}
        </div>
      </td>
      <td className="px-6 py-4"><StatusBadge status={jo.status} /></td>
      <td className="px-6 py-4 text-sm font-bold text-gray-900">
        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(jo.total_cost)}
      </td>
      <td className="px-6 py-4 text-gray-400 hover:text-blue-600 transition"><LuArrowRight size={14} /></td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobOrders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['job-orders', search, status, serviceType],
    queryFn: () => jobOrderApi.list({ search: search || undefined, status: status || undefined, service_type: serviceType || undefined }),
    staleTime: 30_000,
  });

  const jos = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Job Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Issued by Ma'am Minda · {meta?.total ?? '—'} total</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> New J.O.
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <LuSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="JO number or destination..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="pl-4 pr-9 py-2.5 rounded-2xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            <option value="">All Statuses</option>
            {Object.entries(JO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <LuChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={serviceType} onChange={e => setServiceType(e.target.value)}
            className="pl-4 pr-9 py-2.5 rounded-2xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
            <option value="">All Types</option>
            {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="maintenance">Maintenance (PMS)</option>
          </select>
          <LuChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-60"><LuLoaderCircle size={28} className="animate-spin text-gray-300" /></div>
        ) : jos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <LuClipboardList size={40} strokeWidth={1} />
            <p className="text-sm font-medium">No job orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['J.O. Number', 'Type', 'Customer', 'Destination', 'Date', 'Status', 'Amount', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jos.map(jo => <JORow key={jo.id} jo={jo} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateJOModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

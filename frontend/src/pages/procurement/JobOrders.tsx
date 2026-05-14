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
  created: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const serviceTypeStyles: Record<string, string> = {
  bus_rental: 'bg-indigo-50 text-indigo-600',
  field_trip: 'bg-teal-50 text-teal-600',
  corporate_transport: 'bg-blue-50 text-blue-600',
  travel_package: 'bg-violet-50 text-violet-600',
  event: 'bg-pink-50 text-pink-600',
  maintenance: 'bg-orange-50 text-orange-600',
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
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">New Job Order</h2>
            <p className="text-sm text-gray-500 mt-1">Issued by Ma'am Minda · No PO needed unless parts are required.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto">
          <form id="jo-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Service Type *</label>
              <div className="relative">
                <select value={form.service_type} onChange={e => set('service_type', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  <option value="maintenance">Maintenance (PMS)</option>
                </select>
                <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {isMaintenanceType && (
              <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 text-xs text-orange-700 leading-relaxed">
                <strong className="block mb-1 text-orange-800">PMS Maintenance JO</strong>
                This will be linked to a Work Order. A PO will only be issued if external parts are required.
              </div>
            )}

            {!isMaintenanceType && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Customer ID *</label>
                <input type="number" value={form.customer_id || ''} onChange={e => set('customer_id', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="Enter customer ID..." />
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Service Date *</label>
                <input type="date" value={form.service_date} onChange={e => set('service_date', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bus ID*</label>
                <input type="number" value={form.bus_id ?? ''} onChange={e => set('bus_id', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="Enter bus ID..." />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Destination / Description *</label>
              <input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="e.g. Baguio City or 'Engine overhaul'"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estimated Cost (₱)</label>
              <input type="number" min={0} step={0.01} value={form.total_cost} onChange={e => set('total_cost', Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="0.00" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea rows={3} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="Optional notes..." />
            </div>

            {mutation.isError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">Failed to create job order.</p>}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="jo-form" type="submit" disabled={!canSubmit || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition shadow-lg shadow-blue-200/50">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />} Create J.O.
          </button>
        </div>
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

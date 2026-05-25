import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuClipboardList, LuPlus, LuSearch, LuLoaderCircle, LuX, LuChevronDown,
  LuCalendar, LuMapPin, LuArrowRight, LuWrench, LuUsers
} from 'react-icons/lu';
import {
  Eye,
  CheckCircle,
  FileEdit,
  Send
} from 'lucide-react';
import { jobOrderApi } from '../../api/jobOrders';
import { customerApi } from '../../api/customers';
import { fleetApi } from '../../api/fleet';
import type { JobOrder, JobOrderFormData } from '../../types/procurement';
import { JO_STATUS_LABELS, SERVICE_TYPE_LABELS } from '../../constants';
import { Pagination, Dropdown } from '../../components/ui';

// ── helpers ──────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  created: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const serviceTypeStyles: Record<string, string> = {
  bus_rental: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  field_trip: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  corporate_transport: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  travel_package: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  event: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  maintenance: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
      {JO_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ServiceTypeBadge({ type }: { type: string }) {
  const isMainenance = type === 'maintenance';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${serviceTypeStyles[type] ?? 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
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

  // Fetch Customers for Dropdown
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: () => customerApi.list({ per_page: 100 }),
    staleTime: 60_000,
  });
  const customers = customersData?.data?.data ?? [];

  // Fetch Buses for Dropdown
  const { data: busesData, isLoading: busesLoading } = useQuery({
    queryKey: ['buses-dropdown'],
    queryFn: () => fleetApi.list({ per_page: 100 }),
    staleTime: 60_000,
  });
  const buses = busesData?.data?.data ?? [];

  const set = (key: keyof JobOrderFormData, value: any) => setForm(p => ({ ...p, [key]: value }));
  const isMaintenanceType = form.service_type === 'maintenance';
  const canSubmit = (isMaintenanceType || form.customer_id > 0) && form.service_date && form.destination;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">New Job Order</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1"> No PO needed unless parts are required.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50 dark:bg-gray-800"><LuX size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto">
          <form id="jo-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Service Type *</label>
              <div className="relative">
                <select value={form.service_type} onChange={e => set('service_type', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  <option value="maintenance">Maintenance (PMS)</option>
                </select>
                <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {isMaintenanceType && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl px-5 py-4 text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
                <strong className="block mb-1 text-orange-800 dark:text-orange-300">PMS Maintenance JO</strong>
                This will be linked to a Work Order. A PO will only be issued if external parts are required.
              </div>
            )}

            {!isMaintenanceType && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Customer *</label>
                <div className="relative">
                  <select
                    value={form.customer_id || ''}
                    onChange={e => set('customer_id', Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  >
                    <option value="">{customersLoading ? 'Loading customers...' : 'Select a customer...'}</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} (ID: {c.id})
                      </option>
                    ))}
                  </select>
                  <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Service Date *</label>
                <input type="date" value={form.service_date} onChange={e => set('service_date', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bus Selection</label>
                <div className="relative">
                  <select
                    value={form.bus_id || ''}
                    onChange={e => set('bus_id', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  >
                    <option value="">{busesLoading ? 'Loading buses...' : 'Select a bus (Optional)...'}</option>
                    {buses.map((bus: any) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.plate_number} — {bus.model} {bus.year ? `(${bus.year})` : ''}
                      </option>
                    ))}
                  </select>
                  <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Destination / Description *</label>
              <input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="e.g. Baguio City or 'Engine overhaul'"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estimated Cost (₱)</label>
              <input type="number" min={0} step={0.01} value={form.total_cost} onChange={e => set('total_cost', Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="0.00" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea rows={3} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="Optional notes..." />
            </div>

            {mutation.isError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">{(mutation.error as any)?.response?.data?.message || 'Failed to create job order.'}</p>}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition">
            Cancel
          </button>
          <button form="jo-form" type="submit" disabled={!canSubmit || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />} Create J.O.
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

function JODetailModal({ jo, onClose }: { jo: JobOrder; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <LuClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{jo.jo_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={jo.status} />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {SERVICE_TYPE_LABELS[jo.service_type] ?? jo.service_type}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:text-white transition-all active:scale-95">
            <LuX size={20} />
          </button>
        </div>

        <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
          {/* Main Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {jo.customer ? `${jo.customer.first_name} ${jo.customer.last_name}` : jo.service_type === 'maintenance' ? 'PMS Maintenance' : `Customer #${jo.customer_id}`}
              </h3>
              {jo.customer && <p className="text-xs text-gray-500 dark:text-gray-400">{jo.customer.email || 'No email provided'}</p>}
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Investment</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(jo.total_cost)}
              </h3>
            </div>
          </div>

          <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <LuMapPin size={14} /> Destination / Work Summary
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-bold leading-relaxed">
              {jo.destination}
            </p>
            {jo.notes && (
              <p className="text-xs text-gray-400 mt-3 leading-relaxed italic">
                "{jo.notes}"
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Schedule Date</p>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <LuCalendar size={16} className="text-blue-500" />
                {new Date(jo.service_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Vehicle</p>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <LuArrowRight size={16} className="text-sky-500" />
                {jo.bus?.plate_number ?? `Bus #${jo.bus_id}`}
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

// ── JO Row ───────────────────────────────────────────────────────────────────

function JORow({
  jo,
  onDetail,
  onConfirm,
  onComplete
}: {
  jo: JobOrder;
  onDetail: (jo: JobOrder) => void;
  onConfirm: (id: number) => void;
  onComplete: (id: number) => void;
}) {
  return (
    <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-sm shadow-sky-200/20 dark:shadow-none group-hover:bg-white dark:group-hover:bg-gray-800 group-hover:shadow-md transition-all">
            <LuClipboardList size={18} />
          </div>
          <span className="font-black text-gray-900 dark:text-white tracking-tight">{jo.jo_number}</span>
        </div>
      </td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800"><ServiceTypeBadge type={jo.service_type} /></td>
      <td className="px-8 py-6 text-sm font-bold text-gray-700 dark:text-gray-200 border-b border-gray-50 dark:border-gray-800">
        {jo.customer ? `${jo.customer.first_name} ${jo.customer.last_name}` : jo.service_type === 'maintenance' ? 'PMS Maintenance' : `Customer #${jo.customer_id}`}
      </td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
          <LuMapPin size={12} className="shrink-0" /> Destination
        </div>
        <div className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-[150px]">{jo.destination}</div>
      </td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
          <LuCalendar size={12} /> Schedule
        </div>
        <div className="text-sm font-bold text-gray-700 dark:text-gray-200">{fmt(jo.service_date)}</div>
      </td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800"><StatusBadge status={jo.status} /></td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <div className="text-gray-900 dark:text-white font-black text-base">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(jo.total_cost)}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Total Amount</div>
      </td>
      <td className="px-8 py-6 border-b border-gray-50 dark:border-gray-800">
        <Dropdown
          items={[
            {
              label: 'View Details',
              icon: <Eye size={14} />,
              onClick: () => onDetail(jo)
            },
            ...(jo.status === 'created' ? [{
              label: 'Confirm Order',
              icon: <Send size={14} />,
              onClick: () => onConfirm(jo.id)
            }] : []),
            ...(jo.status === 'confirmed' || jo.status === 'in_progress' ? [{
              label: 'Mark Completed',
              icon: <CheckCircle size={14} />,
              onClick: () => onComplete(jo.id)
            }] : []),
            ...(jo.status !== 'completed' && jo.status !== 'cancelled' ? [{
              label: 'Edit Order',
              icon: <FileEdit size={14} />,
              onClick: () => alert('Edit feature coming soon')
            }] : []),
          ]}
        />
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailJO, setDetailJO] = useState<JobOrder | null>(null);

  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['job-orders', search, status, serviceType, page],
    queryFn: () => jobOrderApi.list({
      search: search || undefined,
      status: status || undefined,
      service_type: serviceType || undefined,
      page,
      per_page: 10
    }),
    staleTime: 30_000,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => jobOrderApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-orders'] });
      alert('Job order confirmed successfully!');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to confirm job order.');
    }
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => jobOrderApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-orders'] });
      alert('Job order marked as completed!');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to mark job order as completed.');
    }
  });

  const jos = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Orders
          </div>
          
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
          <LuPlus size={16} /> New J.O.
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="JO number or destination..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="pl-5 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white font-bold">
            <option value="">All Statuses</option>
            {Object.entries(JO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={serviceType} onChange={e => setServiceType(e.target.value)}
            className="pl-5 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white font-bold">
            <option value="">All Types</option>
            {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="maintenance">Maintenance (PMS)</option>
          </select>
          <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className={`bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden ${jos.length > 0 ? 'min-h-[350px]' : ''}`}>
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
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 uppercase tracking-[0.2em] text-[10px]">
                <tr>
                  {['J.O. Number', 'Type', 'Customer', 'Destination', 'Date', 'Status', 'Amount', ''].map(h => (
                    <th key={h} className="px-8 py-5 text-left font-black text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="">
                {jos.map(jo => (
                  <JORow
                    key={jo.id}
                    jo={jo}
                    onDetail={setDetailJO}
                    onConfirm={(id) => confirmMutation.mutate(id)}
                    onComplete={(id) => completeMutation.mutate(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateJOModal onClose={() => setShowCreate(false)} />}
      {detailJO && <JODetailModal jo={detailJO} onClose={() => setDetailJO(null)} />}

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

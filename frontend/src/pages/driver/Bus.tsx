import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LuBus, LuGauge, LuCalendarDays, LuShield,
  LuTriangleAlert, LuCircleCheck, LuWrench,
  LuHash, LuUsers, LuX,
} from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import { workOrderApi } from '../../api/workOrders';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  available:         { label: 'Available',         color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' },
  in_service:        { label: 'In Service',         color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20' },
  under_maintenance: { label: 'Under Maintenance',  color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20' },
  decommissioned:    { label: 'Decommissioned',     color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' },
};

function StatCard({ icon, label, value, sub, accent = false }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; accent?: boolean;
}) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border rounded-[2rem] p-5 flex flex-col gap-3',
      accent
        ? 'border-rose-100 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-500/5'
        : 'border-gray-100 dark:border-gray-800'
    )}>
      <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', accent ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-400')}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className={cn('text-xl font-black mt-0.5', accent ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white')}>{value}</p>
        {sub && <p className="text-xs text-gray-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RequestMaintenanceModal({ busId, onClose }: { busId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'critical'>('routine');

  const mutation = useMutation({
    mutationFn: () => workOrderApi.create({
      bus_id: busId,
      priority,
      description,
      type: 'maintenance',
    } as any),
    onSuccess: () => {
      toast.success('Maintenance request submitted successfully! Pending validation by head mechanic.');
      qc.invalidateQueries({ queryKey: ['driver-my-bus'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit maintenance request.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Request Maintenance/Repair</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Submit ad-hoc repairs outside of the PMS window</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-450 dark:hover:text-white transition bg-gray-50 dark:bg-gray-800">
            <LuX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority Level *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['routine', 'urgent', 'critical'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all",
                    priority === p
                      ? p === 'critical'
                        ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none'
                        : p === 'urgent'
                        ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none'
                        : 'bg-gray-700 border-gray-700 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-750 text-gray-500 hover:border-gray-400'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description of Issue *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue, parts needing replacement, or symptoms (e.g. squeaking brakes, engine knocking...)"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim() || mutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-60 transition shadow-lg shadow-blue-200/50"
            >
              {mutation.isPending && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DriverBus() {
  const { user } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);

  const { data: busRes, isLoading } = useQuery({
    queryKey: ['driver-my-bus', (user as any)?.id],
    queryFn: async () => {
      const res = await fleetApi.list({ per_page: 999 });
      const buses = res.data?.data ?? [];
      return buses.find((b: any) => b.driver?.id === (user as any)?.id) ?? null;
    },
    placeholderData: keepPreviousData,
  });

  const bus = busRes as any;

  if (isLoading) {
    return (
      <div className="py-24 text-center text-gray-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Loading bus details…</p>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="space-y-6 p-1">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Bus</h1>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] py-24 text-center">
          <LuBus size={48} className="mx-auto mb-4 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
          <p className="text-base font-black text-gray-400">No bus assigned yet</p>
          <p className="text-sm text-gray-300 dark:text-gray-600 mt-1">Please contact your HR or Admin to get assigned a bus.</p>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[bus.status] ?? STATUS_META.available;
  const isOverdue = bus.is_service_overdue;
  const nextService = bus.next_service_due;
  const lastService = bus.last_service_date;

  const daysUntilService = nextService
    ? Math.ceil((new Date(nextService).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Bus</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Details and maintenance status of your assigned vehicle</p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-650 text-white text-sm font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-200/50 dark:shadow-none"
        >
          <LuWrench size={16} /> Request Maintenance / Repair
        </button>
      </div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-7 shadow-sm overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-blue-500/5 dark:bg-blue-500/10" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-sm">
              <LuBus size={32} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{bus.plate_number}</p>
              <p className="text-gray-500 dark:text-gray-400 font-semibold text-base">{bus.model}</p>
            </div>
          </div>

          <div className={cn('flex items-center gap-2 px-5 py-3 rounded-2xl border font-black text-sm self-start', statusMeta.bg, statusMeta.color)}>
            <LuShield size={16} />
            {statusMeta.label}
          </div>
        </div>
      </motion.div>

      {/* Service alert */}
      {isOverdue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl"
        >
          <LuTriangleAlert size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-rose-600 dark:text-rose-400 text-sm">Service Overdue</p>
            <p className="text-rose-400 dark:text-rose-400/70 text-xs font-medium mt-0.5">
              This bus was due for service on {nextService}. Please notify your supervisor or maintenance team immediately.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<LuGauge size={20} />}
          label="Total Mileage"
          value={bus.total_mileage ? `${bus.total_mileage.toLocaleString()} km` : '—'}
        />
        <StatCard
          icon={<LuUsers size={20} />}
          label="Seating Capacity"
          value={bus.seating_capacity ? `${bus.seating_capacity} seats` : '—'}
        />
        <StatCard
          icon={<LuCalendarDays size={20} />}
          label="Last Serviced"
          value={lastService ?? '—'}
          sub={lastService ? new Date(lastService).toLocaleDateString('en-PH', { weekday: 'long' }) : undefined}
        />
        <StatCard
          icon={isOverdue ? <LuTriangleAlert size={20} /> : <LuWrench size={20} />}
          label="Next Service Due"
          value={nextService ?? '—'}
          sub={daysUntilService !== null
            ? isOverdue
              ? `Overdue by ${Math.abs(daysUntilService)} day${Math.abs(daysUntilService) !== 1 ? 's' : ''}`
              : `In ${daysUntilService} day${daysUntilService !== 1 ? 's' : ''}`
            : undefined
          }
          accent={isOverdue}
        />
      </div>

      {/* Info grid */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Vehicle Information</h2>
        <div className="grid grid-cols-2 gap-5">
          {[
            { label: 'Plate Number', value: bus.plate_number, icon: <LuHash size={14} /> },
            { label: 'Model', value: bus.model, icon: <LuBus size={14} /> },
            { label: 'Seating Capacity', value: bus.seating_capacity ? `${bus.seating_capacity} seats` : '—', icon: <LuUsers size={14} /> },
            { label: 'Status', value: statusMeta.label, icon: <LuShield size={14} /> },
          ].map(f => (
            <div key={f.label}>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                {f.icon}
                {f.label}
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{f.value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Service summary */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <LuWrench size={12} /> Maintenance Overview
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Last Service</span>
            <span className="text-sm font-black text-gray-800 dark:text-gray-200">{lastService ?? 'Not recorded'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Next Service Due</span>
            <span className={cn('text-sm font-black', isOverdue ? 'text-rose-500' : 'text-gray-800 dark:text-gray-200')}>
              {nextService ?? 'Not scheduled'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Service Status</span>
            <span className={cn(
              'flex items-center gap-1.5 text-sm font-black',
              isOverdue ? 'text-rose-500' : 'text-emerald-500'
            )}>
              {isOverdue ? <LuTriangleAlert size={14} /> : <LuCircleCheck size={14} />}
              {isOverdue ? 'Overdue' : 'Up to date'}
            </span>
          </div>
        </div>
      </div>
      {showRequestModal && (
        <RequestMaintenanceModal busId={bus.id} onClose={() => setShowRequestModal(false)} />
      )}
    </div>
  );
}

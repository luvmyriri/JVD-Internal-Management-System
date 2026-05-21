import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LuBus, LuGauge, LuCalendarDays, LuShield,
  LuTriangleAlert, LuCircleCheck, LuWrench,
  LuHash, LuUsers,
} from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';

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

export default function DriverBus() {
  const { user } = useAuth();

  const { data: busRes, isLoading } = useQuery({
    queryKey: ['driver-my-bus', (user as any)?.id],
    queryFn: async () => {
      const res = await fleetApi.list({ per_page: 999 });
      const buses = res.data?.data ?? [];
      return buses.find((b: any) => b.driver?.id === (user as any)?.id) ?? null;
    },
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
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Bus</h1>
        <p className="text-gray-400 text-sm font-medium mt-1">Details and maintenance status of your assigned vehicle</p>
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
    </div>
  );
}

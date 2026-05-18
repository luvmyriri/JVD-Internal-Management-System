import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuWrench, LuSearch, LuTriangleAlert, LuCircleCheckBig, LuClock,
  LuLoaderCircle, LuBus, LuCalendar, LuCheckCheck, LuList, LuClipboardList,
  LuUser, LuShieldAlert, LuFileText, LuSend, LuExternalLink,
  LuDownload, LuCloudUpload,
} from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import { Pagination, Modal, Button, StatusBadge } from '../../components/ui';
import type { Bus } from '../../types/inventory';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { getNextPmsInfo } from '../../data/pmsSchedule';
import BusProfilePanel from './BusProfilePanel';

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysUntilDue(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return differenceInDays(parseISO(dateStr), new Date());
}

// ── Log Maintenance Modal ────────────────────────────────────────────────────
interface LogModalProps { bus: Bus; onClose: () => void; }

function LogMaintenanceModal({ bus, onClose }: LogModalProps) {
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const next90 = format(addDays(new Date(), 90), 'yyyy-MM-dd');
  const pmsInfo = getNextPmsInfo(bus.total_mileage);
  const [checked, setChecked] = useState<boolean[]>(pmsInfo.level.checklist.map(() => false));

  const [form, setForm] = useState({
    last_service_date: today,
    next_service_due: next90,
    total_mileage: bus.total_mileage,
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => fleetApi.update(bus.id, {
      last_service_date: form.last_service_date,
      next_service_due: form.next_service_due,
      total_mileage: form.total_mileage,
      status: 'available',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buses-pms'] });
      qc.invalidateQueries({ queryKey: ['buses'] });
      onClose();
    },
  });

  const inp = 'w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all';
  const lbl = 'block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 mb-1.5';

  return (
    <Modal isOpen onClose={onClose} title="Log Maintenance" size="xl">
      <div className="space-y-5 p-2">
        {/* Bus + PMS type summary */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <LuBus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-white">{bus.plate_number}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{bus.model} · {bus.total_mileage.toLocaleString()} km</p>
          </div>
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${pmsInfo.level.color} ${pmsInfo.level.textColor}`}>
            {pmsInfo.level.type}
          </span>
          {bus.is_service_overdue && (
            <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 px-3 py-1 rounded-full uppercase tracking-wider">
              Overdue
            </span>
          )}
        </div>

        {/* Scope of Works checklist */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <LuClipboardList className="w-4 h-4 text-gray-400" />
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Scope of Works — {pmsInfo.level.type} ({pmsInfo.level.interval})
            </p>
            <span className="ml-auto text-[10px] text-gray-400 font-bold">
              {checked.filter(Boolean).length}/{pmsInfo.level.checklist.length} done
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {pmsInfo.level.checklist.map((item, i) => (
              <label key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors">
                <input type="checkbox" checked={checked[i]}
                  onChange={() => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))}
                  className="mt-0.5 rounded accent-blue-600 shrink-0" />
                <span className={`text-xs font-medium leading-relaxed transition-all ${checked[i] ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  {item}
                </span>
              </label>
            ))}
          </div>
          {pmsInfo.level.note && (
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border-t border-emerald-100 dark:border-emerald-500/20">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">★ {pmsInfo.level.note}</p>
            </div>
          )}
        </div>

        <form id="log-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Service Date *</label>
            <input type="date" className={inp} value={form.last_service_date}
              onChange={e => setForm(p => ({ ...p, last_service_date: e.target.value }))} required />
          </div>
          <div>
            <label className={lbl}>Next Service Due *</label>
            <input type="date" className={inp} value={form.next_service_due}
              onChange={e => setForm(p => ({ ...p, next_service_due: e.target.value }))} required />
          </div>
          <div>
            <label className={lbl}>Current Mileage (km) *</label>
            <input type="number" className={inp} value={form.total_mileage} min={bus.total_mileage}
              onChange={e => setForm(p => ({ ...p, total_mileage: parseInt(e.target.value) || 0 }))} required />
          </div>
          <div>
            <label className={lbl}>Service Notes</label>
            <input type="text" className={inp} placeholder="e.g. Parts replaced..." value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </form>

        {mutation.isError && (
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl">
            <LuTriangleAlert className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Failed to log maintenance. Please try again.</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="log-form" type="submit" isLoading={mutation.isPending}>
            <LuCheckCheck className="w-4 h-4 mr-1.5" /> Confirm Service
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string; value: number; sub: string;
  gradient: string; shadow: string; icon: React.ReactNode;
}
function KpiCard({ label, value, sub, gradient, shadow, icon }: KpiCardProps) {
  return (
    <div className={`relative overflow-hidden p-6 rounded-[2rem] ${gradient} text-white ${shadow} hover:scale-[1.02] transition-all`}>
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/20" />
      <div className="absolute -bottom-3 -left-3 w-14 h-14 rounded-full bg-white/10" />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-4xl font-black leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-80">{label}</p>
        <p className="text-[10px] font-medium mt-0.5 opacity-60">{sub}</p>
      </div>
    </div>
  );
}

// ── Mileage Bar ───────────────────────────────────────────────────────────────
function MileageBar({ bus }: { bus: Bus }) {
  const info = getNextPmsInfo(bus.total_mileage);
  const pct = info.progressPct;
  const color = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
        <span className={info.level.textColor}>{info.level.shortLabel}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-gray-400">
        {info.isOverdue ? 'Overdue' : `${info.kmRemaining.toLocaleString()} km to ${info.level.type} @ ${info.dueAtKm.toLocaleString()} km`}
      </p>
    </div>
  );
}

// ── Request WO Modal ─────────────────────────────────────────────────────────
interface RequestWoModalProps { bus: Bus; onClose: () => void; }

function RequestWoModal({ bus, onClose }: RequestWoModalProps) {
  const pmsInfo = getNextPmsInfo(bus.total_mileage);
  const [notes, setNotes] = useState(
    `Preventive maintenance due for ${bus.plate_number}. Total mileage: ${bus.total_mileage.toLocaleString()} km. Next service: ${pmsInfo.level.type}.`
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(bus.is_service_overdue ? 'high' : 'medium');
  const [submitted, setSubmitted] = useState(false);

  const inp = 'w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all';
  const lbl = 'block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 mb-1.5';

  if (submitted) return (
    <Modal isOpen onClose={onClose} title="Work Order Submitted" size="md">
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
          <LuCheckCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <p className="text-lg font-black text-gray-900 dark:text-white">WO Request Sent</p>
          <p className="text-sm text-gray-400 mt-1">The Work Order for <span className="font-bold text-gray-700 dark:text-gray-300">{bus.plate_number}</span> is now pending approval.</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-left">
          <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">⚠ Awaiting Approval</p>
          <p className="text-xs text-amber-600 dark:text-amber-300">No maintenance work may begin until a designated approver reviews and approves this Work Order.</p>
        </div>
        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    </Modal>
  );

  return (
    <Modal isOpen onClose={onClose} title="Request Work Order" size="lg">
      <div className="space-y-5 p-2">
        {/* Bus info */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <LuBus className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 dark:text-white">{bus.plate_number}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{bus.model} · {bus.total_mileage.toLocaleString()} km</p>
          </div>
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${pmsInfo.level.color} ${pmsInfo.level.textColor}`}>
            {pmsInfo.level.type}
          </span>
        </div>

        {/* Approval notice */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
          <LuShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
            <span className="font-black">Approval Required.</span> This WO will be queued for review. No maintenance work may begin until a designated employee approves it.
          </p>
        </div>

        {/* PMS scope preview */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <LuClipboardList className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scope — {pmsInfo.level.type} ({pmsInfo.level.interval})</p>
          </div>
          <ul className="max-h-36 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {pmsInfo.level.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 px-4 py-2">
                <span className="text-gray-300 dark:text-gray-600 text-xs mt-0.5 shrink-0">{i + 1}.</span>
                <span className="text-xs text-gray-600 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <label className={lbl}>Priority Level</label>
            <select value={priority} onChange={e => setPriority(e.target.value as any)}
              className={inp.replace('bg-white dark:bg-gray-800', 'bg-white dark:bg-gray-900')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High — Urgent</option>
            </select>
          </div>
          <div>
            <label className={lbl}>WO Description / Notes</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              className={inp + ' resize-none'} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => setSubmitted(true)}>
            <LuSend className="w-4 h-4 mr-1.5" /> Submit WO Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Service Adviser Alerts ────────────────────────────────────────────────────
function ServiceAdviserAlerts({ overdue, upcoming }: { overdue: Bus[]; upcoming: Bus[] }) {
  if (overdue.length === 0 && upcoming.length === 0) return null;
  return (
    <div className="space-y-3">
      {overdue.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
          <LuShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-black text-red-700 dark:text-red-400">Automated Service Adviser — {overdue.length} Vehicle{overdue.length > 1 ? 's' : ''} Overdue</p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
              {overdue.map(b => b.plate_number).join(', ')} — Request a Work Order immediately. No work may begin until approved.
            </p>
          </div>
          <span className="text-[10px] font-black bg-red-500 text-white px-2 py-1 rounded-lg uppercase tracking-wider shrink-0">Critical</span>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <LuClock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-black text-amber-700 dark:text-amber-400">Service Due within 7 Days — {upcoming.length} Vehicle{upcoming.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {upcoming.map(b => b.plate_number).join(', ')} — Schedule preventive maintenance soon to avoid downtime.
            </p>
          </div>
          <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-1 rounded-lg uppercase tracking-wider shrink-0">Soon</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PMS() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'priority' | 'all'>('priority');
  const [page, setPage] = useState(1);
  const [logBus, setLogBus] = useState<Bus | null>(null);
  const [woBus, setWoBus] = useState<Bus | null>(null);
  const [profileBus, setProfileBus] = useState<Bus | null>(null);
  const itemsPerPage = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['buses-pms', search],
    queryFn: () => fleetApi.list({ search: search || undefined, per_page: 200 }),
    staleTime: 30_000,
  });

  const buses: Bus[] = data?.data?.data ?? [];

  const overdueBuses  = buses.filter(b => b.is_service_overdue);
  const upcomingBuses = buses.filter(b => {
    if (b.is_service_overdue) return false;
    const days = daysUntilDue(b.next_service_due);
    return days !== null && days <= 7;
  });
  const healthyBuses  = buses.filter(b => !overdueBuses.includes(b) && !upcomingBuses.includes(b));

  const displayBuses = tab === 'priority'
    ? [...overdueBuses, ...upcomingBuses].sort((a, b) => {
        if (!a.next_service_due) return 1;
        if (!b.next_service_due) return -1;
        return new Date(a.next_service_due).getTime() - new Date(b.next_service_due).getTime();
      })
    : buses;

  const totalPages   = Math.ceil(displayBuses.length / itemsPerPage);
  const paginated    = displayBuses.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {buses.length} Vehicles
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Preventive Maintenance System</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard label="Overdue for Service" value={overdueBuses.length}
          sub="Requires immediate attention"
          gradient="bg-gradient-to-br from-red-500 to-rose-600"
          shadow="shadow-xl shadow-red-300/40 dark:shadow-red-900/40"
          icon={<LuTriangleAlert className="w-5 h-5 text-white" />} />
        <KpiCard label="Due within 7 Days" value={upcomingBuses.length}
          sub="Schedule service soon"
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          shadow="shadow-xl shadow-amber-300/40 dark:shadow-amber-900/40"
          icon={<LuClock className="w-5 h-5 text-white" />} />
        <KpiCard label="Healthy Fleet" value={healthyBuses.length}
          sub="Within service window"
          gradient="bg-gradient-to-br from-emerald-400 to-teal-600"
          shadow="shadow-xl shadow-emerald-300/40 dark:shadow-emerald-900/40"
          icon={<LuCircleCheckBig className="w-5 h-5 text-white" />} />
        <KpiCard label="Total Fleet" value={buses.length}
          sub="Registered vehicles"
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          shadow="shadow-xl shadow-blue-300/40 dark:shadow-blue-900/40"
          icon={<LuBus className="w-5 h-5 text-white" />} />
      </div>

      {/* Automated Service Adviser */}
      <ServiceAdviserAlerts overdue={overdueBuses} upcoming={upcomingBuses} />

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-700/50 gap-1">
            {([
              { key: 'priority', label: 'Priority Queue', icon: LuTriangleAlert },
              { key: 'all',      label: 'All Fleet',      icon: LuList },
            ] as const).map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  tab === t.key
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`}>
                <t.icon className="w-3 h-3" />{t.label}
                {t.key === 'priority' && overdueBuses.length + upcomingBuses.length > 0 && (
                  <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none">
                    {overdueBuses.length + upcomingBuses.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 w-72 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <LuSearch className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search plate or model..."
                className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full text-gray-700 dark:text-gray-200 outline-none" />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                <LuCloudUpload className="w-4 h-4" /> Bulk Import
                <input type="file" multiple className="hidden" accept=".csv,.xlsx" />
              </label>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
                <LuDownload className="w-4 h-4" /> Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 uppercase tracking-widest text-[10px] border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-5">Bus / Driver</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Last Serviced</th>
                <th className="px-8 py-5">Next Due</th>
                <th className="px-8 py-5">Next PMS Type</th>
                <th className="px-8 py-5">Mileage Progress</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-gray-400">
                    <LuLoaderCircle className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">Loading PMS data...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <LuCircleCheckBig className="w-10 h-10 mx-auto mb-3 text-emerald-300 dark:text-emerald-700" />
                    <p className="text-sm font-bold text-gray-400">
                      {tab === 'priority' ? 'No priority maintenance needed — fleet is healthy!' : 'No vehicles found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map(bus => {
                  const days = daysUntilDue(bus.next_service_due);
                  const isOverdue = bus.is_service_overdue;
                  const isUpcoming = !isOverdue && days !== null && days <= 7;
                  return (
                    <tr key={bus.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOverdue ? 'bg-red-50 dark:bg-red-500/10' : isUpcoming ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'
                          }`}>
                            <LuBus className={`w-4 h-4 ${isOverdue ? 'text-red-500' : isUpcoming ? 'text-amber-500' : 'text-emerald-500'}`} />
                          </div>
                          <div
                            onClick={() => setProfileBus(bus)}
                            className="group cursor-pointer"
                          >
                            <p className="font-black text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                              {bus.plate_number}
                              <LuExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{bus.model}</p>
                            {bus.driver ? (
                              <div className="flex items-center gap-1 mt-1">
                                <LuUser className="w-3 h-3 text-blue-400" />
                                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold">{bus.driver.first_name} {bus.driver.last_name}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-gray-300 dark:text-gray-600 italic">No driver</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1.5">
                          <StatusBadge status={bus.status.replace('_', ' ')}
                            variant={bus.status === 'available' ? 'success' : bus.status === 'in_service' ? 'info' : bus.status === 'under_maintenance' ? 'warning' : 'danger'} />
                          {isOverdue && (
                            <div className="flex items-center gap-1 text-[9px] text-red-500 font-black uppercase tracking-widest">
                              <LuTriangleAlert className="w-3 h-3" /> Overdue
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <LuCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {bus.last_service_date ? format(parseISO(bus.last_service_date), 'MMM dd, yyyy') : <span className="text-gray-300 dark:text-gray-600 italic">Never</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {bus.next_service_due ? (
                          <div>
                            <p className={`font-black text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : isUpcoming ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                              {format(parseISO(bus.next_service_due), 'MMM dd, yyyy')}
                            </p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isOverdue ? 'text-red-400' : isUpcoming ? 'text-amber-400' : 'text-gray-400'}`}>
                              {isOverdue ? `${Math.abs(days ?? 0)}d overdue` : days === 0 ? 'Due today' : `${days}d remaining`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 dark:text-gray-600 font-black uppercase tracking-widest italic">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        {(() => {
                          const info = getNextPmsInfo(bus.total_mileage);
                          return (
                            <div className="space-y-1">
                              <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest border ${info.level.color} ${info.level.textColor} border-current/20`}>
                                {info.level.type}
                              </span>
                              <p className="text-[9px] text-gray-400 font-bold">@ {info.dueAtKm.toLocaleString()} km</p>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-8 py-5 min-w-[170px]">
                        <MileageBar bus={bus} />
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={() => setWoBus(bus)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all w-full border border-indigo-100 dark:border-indigo-500/20"
                          >
                            <LuFileText className="w-3.5 h-3.5" /> Request WO
                          </button>
                          <button
                            onClick={() => setLogBus(bus)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all w-full border border-blue-100 dark:border-blue-500/20"
                          >
                            <LuWrench className="w-3.5 h-3.5" /> Log Service
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} lastPage={totalPages} total={displayBuses.length} perPage={itemsPerPage} onPageChange={setPage} />
      )}

      {logBus     && <LogMaintenanceModal bus={logBus} onClose={() => setLogBus(null)} />}
      {woBus      && <RequestWoModal bus={woBus} onClose={() => setWoBus(null)} />}
      {profileBus && <BusProfilePanel bus={profileBus} onClose={() => setProfileBus(null)} />}
    </div>
  );
}
import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  LuX, LuBus, LuUser, LuFileText, LuWrench, LuGauge,
  LuPackage, LuTriangleAlert, LuCircleCheckBig, LuClock, LuCar,
  LuCloudUpload, LuDownload
} from 'react-icons/lu';
import type { Bus, BusDocument, MaintenanceRecord, MileageLog, ConsumptionRecord } from '../../types/inventory';
import { getNextPmsInfo } from '../../data/pmsSchedule';

// ── Mock data generators (replace with API calls when backend ready) ─────────
function mockDocs(_bus: Bus): BusDocument[] {
  const today = new Date();
  const y = (d: number) => format(new Date(today.getTime() + d * 86400000), 'yyyy-MM-dd');
  return [
    { id: 1, type: 'or_cr', label: 'Official Receipt / Certificate of Registration', issue_date: y(-365), expiry_date: y(30), file_url: undefined, status: 'expiring_soon' },
    { id: 2, type: 'lto_registration', label: 'LTO Registration', issue_date: y(-300), expiry_date: y(65), file_url: undefined, status: 'valid' },
    { id: 3, type: 'insurance', label: 'Comprehensive Insurance', issue_date: y(-180), expiry_date: y(-10), file_url: undefined, status: 'expired' },
    { id: 4, type: 'franchise', label: 'LTFRB Franchise / CPC', issue_date: y(-500), expiry_date: y(120), file_url: undefined, status: 'valid' },
    { id: 5, type: 'inspection', label: 'MVIS Inspection Certificate', issue_date: y(-60), expiry_date: y(305), file_url: undefined, status: 'valid' },
  ];
}

function mockHistory(_bus: Bus): MaintenanceRecord[] {
  return [
    { id: 1, pms_type: 'First PMS', service_date: '2024-01-15', mileage_at_service: 5000, performed_by: 'Lionsjade Corp', cost: 0, parts_replaced: ['Engine Oil 15W-40 (10L)', 'Oil Filter', 'Fuel Filter (P&S)', 'Transmission Oil'], notes: 'Free labor and filters.' },
    { id: 2, pms_type: 'PMS 1', service_date: '2024-04-10', mileage_at_service: 15000, performed_by: 'Lionsjade Corp', cost: 2800, parts_replaced: ['Engine Oil 15W-40 (10L)', 'Oil Filter', 'Fuel Filter (Primary)'], notes: 'Brakes adjusted. Clutch OK.' },
    { id: 3, pms_type: 'PMS 2', service_date: '2024-07-22', mileage_at_service: 25000, performed_by: 'Lionsjade Corp', cost: 3200, parts_replaced: ['Engine Oil 15W-40 (10L)', 'Oil Filter', 'Fuel Filter (P&S)', 'Air Filter'], notes: 'All checks passed.' },
  ];
}

function mockMileage(bus: Bus): MileageLog[] {
  return [
    { id: 1, log_date: '2024-11-01', mileage: bus.total_mileage - 800, trip_description: 'Cebu-Ormoc Route', logged_by: bus.driver?.first_name },
    { id: 2, log_date: '2024-11-08', mileage: bus.total_mileage - 400, trip_description: 'Regular Operations', logged_by: bus.driver?.first_name },
    { id: 3, log_date: '2024-11-15', mileage: bus.total_mileage, trip_description: 'Regular Operations', logged_by: bus.driver?.first_name },
  ];
}

function mockConsumption(_bus: Bus): ConsumptionRecord[] {
  return [
    { id: 1, record_date: '2024-11-15', category: 'engine_oil', item_name: 'Petron Supreme 15W-40', quantity: 10, unit: 'liters', unit_cost: 180, total_cost: 1800, notes: 'PMS change' },
    { id: 2, record_date: '2024-11-15', category: 'filters', item_name: 'Oil Filter - Genuine', quantity: 1, unit: 'pc', unit_cost: 350, total_cost: 350 },
    { id: 3, record_date: '2024-11-10', category: 'fuel', item_name: 'Diesel', quantity: 200, unit: 'liters', unit_cost: 62, total_cost: 12400, notes: 'Weekly fueling' },
    { id: 4, record_date: '2024-10-20', category: 'brake_parts', item_name: 'Brake Lining Set', quantity: 1, unit: 'set', unit_cost: 2800, total_cost: 2800, notes: 'Replaced at PMS 2' },
  ];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const DOC_LABELS: Record<string, string> = {
  or_cr: 'OR/CR', lto_registration: 'LTO Reg', insurance: 'Insurance',
  franchise: 'Franchise', inspection: 'Inspection', other: 'Document',
};
const CONSUMPTION_COLORS: Record<string, string> = {
  engine_oil: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
  fuel: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10',
  tire: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10',
  brake_parts: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10',
  filters: 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-500/10',
  grease: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-700',
  other: 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-700',
};

type ProfileTab = 'overview' | 'documents' | 'history' | 'mileage' | 'consumption';

// ── Main Component ────────────────────────────────────────────────────────────
export default function BusProfilePanel({ bus, onClose }: { bus: Bus; onClose: () => void }) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const pmsInfo = getNextPmsInfo(bus.total_mileage);
  const docs = mockDocs(bus);
  const history = mockHistory(bus);
  const mileage = mockMileage(bus);
  const consumption = mockConsumption(bus);
  const totalSpend = consumption.reduce((s, r) => s + r.total_cost, 0);
  const expiredDocs = docs.filter(d => d.status === 'expired').length;
  const expiringSoon = docs.filter(d => d.status === 'expiring_soon').length;

  const tabs: { key: ProfileTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview',     label: 'Overview',     icon: LuCar },
    { key: 'documents',    label: 'Documents',     icon: LuFileText },
    { key: 'history',      label: 'Maint. History', icon: LuWrench },
    { key: 'mileage',      label: 'Mileage Log',  icon: LuGauge },
    { key: 'consumption',  label: 'Consumption',  icon: LuPackage },
  ];

  const card = 'rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-5';
  const label = 'text-[9px] font-black text-gray-400 uppercase tracking-widest';
  const value = 'text-sm font-bold text-gray-900 dark:text-white mt-0.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-5xl h-[85vh] min-h-[600px] rounded-2xl md:rounded-3xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <LuBus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black text-white">{bus.plate_number}</p>
            <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">{bus.model} · {bus.seating_capacity} seats · {bus.total_mileage.toLocaleString()} km</p>
          </div>
          {(expiredDocs > 0 || expiringSoon > 0) && (
            <span className="flex items-center gap-1 text-[9px] font-black bg-red-500/20 text-red-100 border border-red-300/30 px-2 py-1 rounded-lg uppercase tracking-wider">
              <LuTriangleAlert className="w-3 h-3" /> {expiredDocs + expiringSoon} doc alert{expiredDocs + expiringSoon > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white">
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-5 py-3.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <>
              {/* Driver */}
              <div className={card}>
                <div className="flex items-center gap-3 mb-4">
                  <LuUser className="w-4 h-4 text-blue-500" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Driver</p>
                </div>
                {bus.driver ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg">
                      {bus.driver.first_name[0]}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">{bus.driver.first_name} {bus.driver.last_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Designated Driver</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No driver assigned</p>
                )}
              </div>

              {/* Vehicle Info grid */}
              <div className={card}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Vehicle Information</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Plate Number', bus.plate_number],
                    ['Model', bus.model],
                    ['Year', bus.year ?? '—'],
                    ['Color', bus.color ?? '—'],
                    ['Body Type', bus.body_type ?? '—'],
                    ['Fuel Type', bus.fuel_type ?? '—'],
                    ['Chassis No.', bus.chassis_number ?? '—'],
                    ['Engine No.', bus.engine_number ?? '—'],
                    ['Seating Capacity', `${bus.seating_capacity} seats`],
                    ['Total Mileage', `${bus.total_mileage.toLocaleString()} km`],
                  ].map(([l, v]) => (
                    <div key={l as string}>
                      <p className={label}>{l}</p>
                      <p className={value}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PMS Status */}
              <div className={`${card} border-l-4 ${pmsInfo.isOverdue ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">PMS Status</p>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest ${pmsInfo.level.color} ${pmsInfo.level.textColor}`}>
                    {pmsInfo.level.type}
                  </span>
                  <span className={`text-[10px] font-bold ${pmsInfo.isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                    {pmsInfo.isOverdue ? 'OVERDUE' : `${pmsInfo.kmRemaining.toLocaleString()} km remaining`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className={`h-full rounded-full ${pmsInfo.isOverdue ? 'bg-red-400' : pmsInfo.progressPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${pmsInfo.progressPct}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-1">Due at {pmsInfo.dueAtKm.toLocaleString()} km · {pmsInfo.level.interval}</p>
              </div>

              {/* Last & Next service */}
              <div className="grid grid-cols-2 gap-4">
                <div className={card}>
                  <p className={label}>Last Serviced</p>
                  <p className={value}>{bus.last_service_date ? format(parseISO(bus.last_service_date), 'MMM dd, yyyy') : '—'}</p>
                </div>
                <div className={`${card} ${bus.is_service_overdue ? 'border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5' : ''}`}>
                  <p className={label}>Next Due</p>
                  <p className={`${value} ${bus.is_service_overdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {bus.next_service_due ? format(parseISO(bus.next_service_due), 'MMM dd, yyyy') : '—'}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                    <LuCloudUpload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Bulk Upload Documents</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Support for PDF, Excel, and Images</p>
                  </div>
                </div>
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                  Select Files
                  <input type="file" multiple className="hidden" accept=".pdf,.xls,.xlsx,image/*" />
                </label>
              </div>

              <div className="space-y-3">
                {docs.map(doc => {
                  const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
                  const badgeCls = doc.status === 'expired'
                    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                    : doc.status === 'expiring_soon'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
                  const Icon = doc.status === 'expired' ? LuTriangleAlert : doc.status === 'expiring_soon' ? LuClock : LuCircleCheckBig;
                  return (
                    <div key={doc.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/30 group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${badgeCls}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{doc.label}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {DOC_LABELS[doc.type]} · Expires {format(parseISO(doc.expiry_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${badgeCls}`}>
                        {doc.status === 'expired' ? `${Math.abs(daysLeft)}d overdue` : doc.status === 'expiring_soon' ? `${daysLeft}d left` : 'Valid'}
                      </span>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Download Document">
                        <LuDownload className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MAINTENANCE HISTORY ── */}
          {tab === 'history' && (
            <div className="space-y-4">
              {history.map((rec) => (
                <div key={rec.id} className={card}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest ${getNextPmsInfo(rec.mileage_at_service).level.color} ${getNextPmsInfo(rec.mileage_at_service).level.textColor}`}>
                        {rec.pms_type}
                      </span>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">{format(parseISO(rec.service_date), 'MMM dd, yyyy')} · {rec.mileage_at_service.toLocaleString()} km</p>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">₱{rec.cost.toLocaleString()}</p>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Parts / Items</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.parts_replaced.map((p, j) => (
                      <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{p}</span>
                    ))}
                  </div>
                  {rec.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{rec.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── MILEAGE LOG ── */}
          {tab === 'mileage' && (
            <div className="space-y-3">
              {mileage.map(log => (
                <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/30">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <LuGauge className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{log.mileage.toLocaleString()} km</p>
                    <p className="text-[10px] text-gray-400">{log.trip_description} {log.logged_by ? `· ${log.logged_by}` : ''}</p>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400">{format(parseISO(log.log_date), 'MMM dd, yyyy')}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── CONSUMPTION ── */}
          {tab === 'consumption' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className={card}>
                  <p className={label}>Total Spend</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">₱{totalSpend.toLocaleString()}</p>
                </div>
                <div className={card}>
                  <p className={label}>Records</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{consumption.length}</p>
                </div>
              </div>
              <div className="space-y-3">
                {consumption.map(rec => (
                  <div key={rec.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/30">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shrink-0 ${CONSUMPTION_COLORS[rec.category]}`}>
                      {rec.category.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{rec.item_name}</p>
                      <p className="text-[10px] text-gray-400">{rec.quantity} {rec.unit} · ₱{rec.unit_cost}/unit</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-gray-900 dark:text-white text-sm">₱{rec.total_cost.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-400">{format(parseISO(rec.record_date), 'MMM dd')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

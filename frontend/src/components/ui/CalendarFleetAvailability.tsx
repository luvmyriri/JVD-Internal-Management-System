import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  LuBus, LuChevronLeft, LuChevronRight, LuX,
  LuUser, LuMapPin, LuClock, LuHash, LuLayers,
  LuCircle, LuCalendar, LuArrowRight
} from 'react-icons/lu';
import { AnimatePresence, motion } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date();
const y = today.getFullYear();
const m = today.getMonth();
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ── Bus Detail Modal ──────────────────────────────────────────────────────────

interface BusDetailModalProps {
  bus: any;
  dispatch?: any;
  isOccupied: boolean;
  onClose: () => void;
}

function BusDetailModal({ bus, dispatch, isOccupied, onClose }: BusDetailModalProps) {
  const statusColor = isOccupied
    ? { ring: 'ring-amber-400 dark:ring-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300', label: 'In Service' }
    : { ring: 'ring-emerald-400 dark:ring-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', label: 'Available' };

  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <AnimatePresence>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Header gradient bar */}
          <div className={`h-1.5 w-full ${isOccupied ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} />

          <div className="p-6">
            {/* Top row */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-2 ${statusColor.ring} ${isOccupied ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
                  <LuBus className={`w-6 h-6 ${isOccupied ? 'text-amber-500' : 'text-emerald-500'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                    {bus.model || bus.plate_number}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <LuHash className="w-3 h-3 text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {bus.plate_number}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-5 ${statusColor.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot} ${isOccupied ? 'animate-pulse' : ''}`} />
              {statusColor.label}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <InfoCard icon={<LuLayers className="w-3.5 h-3.5" />} label="Capacity" value={`${bus.seating_capacity || 49} seats`} />
              <InfoCard icon={<LuCircle className="w-3.5 h-3.5" />} label="Category" value={bus.bus_category || 'Economy'} />
              {bus.driver && (
                <InfoCard icon={<LuUser className="w-3.5 h-3.5" />} label="Assigned Driver" value={`${bus.driver.first_name} ${bus.driver.last_name}`} />
              )}

            </div>

            {/* Active dispatch info (occupied buses) */}
            {isOccupied && dispatch && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4 space-y-2.5">
                <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Active Dispatch</p>

                <DispatchRow icon={<LuClock className="w-3.5 h-3.5 text-amber-500" />} label="Departure" value={dispatch.depart || 'N/A'} />
                <DispatchRow icon={<LuUser className="w-3.5 h-3.5 text-amber-500" />} label="Driver" value={dispatch.driver || 'N/A'} />
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0 text-amber-500"><LuMapPin className="w-3.5 h-3.5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 font-bold uppercase tracking-wider mb-0.5">Route</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {dispatch.route?.split(' - ').map((leg: string, i: number, arr: string[]) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="text-[11px] font-black text-amber-700 dark:text-amber-300">{leg.trim()}</span>
                          {i < arr.length - 1 && <LuArrowRight className="w-3 h-3 text-amber-400 shrink-0" />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <DispatchRow icon={<LuHash className="w-3.5 h-3.5 text-amber-500" />} label="Passengers" value={`${dispatch.seats || 'N/A'} pax`} />
              </div>
            )}

            {/* Next service */}
            {bus.next_service_due && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                <LuCalendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Next Service Due</p>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{bus.next_service_due}</p>
                </div>
                {bus.is_service_overdue && (
                  <span className="ml-auto text-[8px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg">Overdue</span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body!
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
      <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-[11px] font-black text-gray-900 dark:text-white capitalize truncate">{value}</p>
      </div>
    </div>
  );
}

function DispatchRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0">{icon}</div>
      <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70 font-bold uppercase tracking-wider w-16 shrink-0">{label}</span>
      <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 truncate">{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CalendarFleetAvailabilityProps {
  tickets?: any[];
  buses?: any[];
}

export default function CalendarFleetAvailability({ tickets = [], buses = [] }: CalendarFleetAvailabilityProps) {
  const [calDate, setCalDate] = useState(new Date(y, m, 1));
  const [selected, setSelected] = useState<Date>(today);
  const [modalBus, setModalBus] = useState<{ bus: any; dispatch?: any; isOccupied: boolean } | null>(null);

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();

  const cells = useMemo(() => {
    const arr: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(calYear, calMonth, d));
    return arr;
  }, [calYear, calMonth, daysInMonth, firstWeekday]);

  const fleetSchedules = useMemo(() => {
    return tickets.map((t: any) => ({
      id: t.id,
      date: t.date_of_travel ? new Date(t.date_of_travel) : new Date(),
      bus: t.bus?.plate_number || t.plate_no || 'N/A',
      busModel: t.bus?.model || '',
      plate: t.bus?.plate_number || t.plate_no || 'N/A',
      route: `${t.pick_up || 'N/A'} - ${t.drop_off || 'N/A'}`,
      driver: t.driver ? `${t.driver.first_name || ''} ${t.driver.last_name || ''}`.trim() : (t.driver?.name || 'N/A'),
      depart: '09:00 AM',
      status: t.status === 'completed' ? 'completed' : t.status === 'approved' ? 'in_service' : 'scheduled',
      seats: t.no_of_passengers || 45,
    }));
  }, [tickets]);

  const selectedEvents = useMemo(() => fleetSchedules.filter(s => isSameDay(s.date, selected)), [fleetSchedules, selected]);

  const occupiedPlates = useMemo(() => Array.from(new Set(selectedEvents.map(d => d.bus))), [selectedEvents]);

  const availableToday = useMemo(() => {
    if (!buses || buses.length === 0) return [];
    return buses.filter((b: any) => !occupiedPlates.includes(b.plate_number));
  }, [buses, occupiedPlates]);

  const handleAvailClick = (b: any) => {
    setModalBus({ bus: b, isOccupied: false });
  };

  const handleOccupiedClick = (plate: string) => {
    const dispatch = selectedEvents.find(s => s.bus === plate);
    const busObj = buses.find((b: any) => b.plate_number === plate) || {
      plate_number: plate,
      model: dispatch?.busModel || plate,
      seating_capacity: dispatch?.seats || 49,
    };
    setModalBus({ bus: busObj, dispatch, isOccupied: true });
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100/50 dark:border-gray-800 shadow-sm p-3 flex flex-col h-full min-h-0">
        {/* Title */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-50 dark:border-gray-850 shrink-0">
          <div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
              <LuBus className="w-3.5 h-3.5 text-blue-500" />
              Fleet Calendar &amp; Availability
            </h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Click a bus to view details</p>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex flex-col gap-1.5 mt-3.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-850 dark:text-white uppercase tracking-wider">
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
                className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
              >
                <LuChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
                className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
              >
                <LuChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center">
            {DAY_LABELS.map((d, i) => (
              <div key={i} className="text-[8px] font-black text-gray-400 dark:text-gray-600 py-0.5 uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="h-6.5" />;
              const events = fleetSchedules.filter(s => isSameDay(s.date, date));
              const isToday = isSameDay(date, today);
              const isSel = isSameDay(date, selected);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelected(date)}
                  className={`relative flex flex-col items-center justify-center rounded-lg transition-all h-6.5 text-[9px] font-black ${isSel
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/30'
                    : isToday
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  <span>{date.getDate()}</span>
                  {events.length > 0 && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isSel ? 'bg-white' : 'bg-blue-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Available / Occupied */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/80 min-h-0 flex-1">
          {/* Available */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-xl mb-1.5 shrink-0">
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Avail</span>
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{availableToday.length}</span>
            </div>
            <div className="space-y-1 overflow-y-auto pr-1 flex-1">
              {availableToday.map((b: any) => (
                <button
                  key={b.id}
                  onClick={() => handleAvailClick(b)}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-800/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/10 hover:border-emerald-200/60 dark:hover:border-emerald-500/30 transition-all shadow-sm cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[8.5px] font-black text-gray-900 dark:text-white uppercase tracking-wider shrink-0 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {b.model || b.plate_number}
                    </span>
                    <span className="text-[7.5px] text-gray-400 dark:text-gray-500 font-bold truncate">({b.plate_number})</span>
                  </div>
                  <span className="text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.5 rounded shrink-0">
                    {b.seating_capacity || 49} Seats
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Occupied */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-xl mb-1.5 shrink-0">
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Occupied</span>
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">{occupiedPlates.length}</span>
            </div>
            <div className="space-y-1 overflow-y-auto pr-1 flex-1">
              {occupiedPlates.length === 0 ? (
                <p className="text-[9px] text-gray-400 dark:text-gray-500 italic p-1.5">No occupied buses.</p>
              ) : (
                occupiedPlates.map((plate, idx) => {
                  const dispatch = selectedEvents.find(s => s.bus === plate);
                  return (
                    <button
                      key={`${plate}-${idx}`}
                      onClick={() => handleOccupiedClick(plate)}
                      className="w-full flex flex-col gap-0.5 p-1.5 rounded-lg bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100/50 dark:border-gray-800/50 hover:bg-amber-50/60 dark:hover:bg-amber-500/10 hover:border-amber-200/60 dark:hover:border-amber-500/30 transition-all shadow-sm cursor-pointer group text-left"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                          <span className="text-[8.5px] font-black text-gray-900 dark:text-white uppercase tracking-wider shrink-0 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                            {dispatch?.busModel || plate}
                          </span>
                          <span className="text-[7.5px] text-gray-400 dark:text-gray-500 font-bold truncate">({dispatch?.plate || plate})</span>
                        </div>
                        <span className="text-[7.5px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 px-1 py-0.5 rounded shrink-0">
                          Dep {dispatch?.depart || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[7.5px] font-bold text-gray-500 dark:text-gray-400 pl-2.5">
                        <span className="truncate max-w-[65%]">{dispatch?.route || 'In route'}</span>
                        <span className="truncate max-w-[35%] opacity-75 text-right">{dispatch?.driver || 'N/A'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {modalBus && (
        <BusDetailModal
          bus={modalBus.bus}
          dispatch={modalBus.dispatch}
          isOccupied={modalBus.isOccupied}
          onClose={() => setModalBus(null)}
        />
      )}
    </>
  );
}

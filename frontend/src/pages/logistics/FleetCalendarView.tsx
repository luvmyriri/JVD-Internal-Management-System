import { LuBus } from 'react-icons/lu';
import { cn } from '../../utils';

interface FleetCalendarViewProps {
  selectedBusId: number | null;
  setSelectedBusId: (id: number | null) => void;
  setCalendarMonth: (month: number) => void;
  setCalendarYear: (year: number) => void;
  filteredBuses: any[];
  buses: any[];
  calendarMonth: number;
  calendarYear: number;
  calendarData: any[];
  setSelectedCalendarDay: (value: { day: number; entries: any[] } | null) => void;
}

export default function FleetCalendarView({
  selectedBusId,
  setSelectedBusId,
  setCalendarMonth,
  setCalendarYear,
  filteredBuses,
  buses,
  calendarMonth,
  calendarYear,
  calendarData,
  setSelectedCalendarDay,
}: FleetCalendarViewProps) {
  if (!selectedBusId) {
    /* BUSES GRID */
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
        {filteredBuses.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400">
            <p className="text-sm font-bold text-gray-500">No buses matched the search criteria.</p>
          </div>
        ) : (
          filteredBuses.map((bus: any) => (
            <div
              key={bus.id}
              onClick={() => {
                setSelectedBusId(bus.id);
                setCalendarMonth(new Date().getMonth() + 1);
                setCalendarYear(new Date().getFullYear());
              }}
              className="p-6 bg-gray-50/50 dark:bg-gray-800/25 border border-gray-100 dark:border-gray-800/80 rounded-[2.2rem] hover:border-blue-400/40 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="px-3.5 py-1.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 flex items-center gap-2 shadow-sm">
                    <LuBus className="text-blue-600 dark:text-blue-400 w-4 h-4" />
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xs uppercase">{bus.plate_number}</span>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block shadow-sm",
                    bus.status === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/20' :
                    bus.status === 'in_service' ? 'bg-blue-100 text-blue-700 dark:bg-blue-955/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/20' :
                    bus.status === 'under_maintenance' ? 'bg-amber-100 text-amber-700 dark:bg-amber-955/30 dark:text-amber-450 border border-amber-200/50 dark:border-amber-900/20' :
                    'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900/20'
                  )}>
                    {bus.status.replace('_', ' ')}
                  </span>
                </div>

                <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1">{bus.model}</h4>

                <div className="mt-4 space-y-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider font-black text-gray-400">Capacity</span>
                    <span className="text-gray-850 dark:text-gray-200">{bus.seating_capacity} seats</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider font-black text-gray-400">Class</span>
                    <span className="text-gray-850 dark:text-gray-200">{bus.bus_category || 'ECONOMY'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[9px] tracking-wider font-black text-gray-400">Captain</span>
                    <span className="text-gray-850 dark:text-gray-200 font-black text-blue-600 dark:text-blue-450">
                      {bus.driver ? `${bus.driver.first_name} ${bus.driver.last_name}` : 'TBA'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex justify-end">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                  View Schedule Calendar →
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  /* BUS CALENDAR VIEW */
  const selectedBus = buses.find((b: any) => b.id === selectedBusId);

  // Calendar grid computation
  const firstDayOfMonth = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-8 space-y-6">
      {/* calendar header/info */}
      <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800/80">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedBusId(null)}
            className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 text-xs font-black text-gray-650 dark:text-gray-300 uppercase tracking-widest border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm transition-all"
          >
            ← Back to Fleet
          </button>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedBus?.model}</h3>
            <p className="text-[10px] text-gray-450 font-black uppercase tracking-widest mt-0.5">
              Plate: {selectedBus?.plate_number} • Capacity: {selectedBus?.seating_capacity} Seats • {selectedBus?.bus_category || 'ECONOMY'}
            </p>
          </div>
        </div>
        {selectedBus?.driver && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Assigned Captain</p>
            <p className="text-sm font-black text-blue-600 dark:text-blue-450 uppercase mt-0.5">
              {selectedBus.driver.first_name} {selectedBus.driver.last_name}
            </p>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        <div className="grid grid-cols-7 border-b border-gray-150 dark:border-gray-850 bg-gray-50/30 dark:bg-gray-800/10">
          {weekdays.map(d => (
            <div key={d} className="py-4 text-center text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest border-r border-gray-100 dark:border-gray-850 last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-collapse">
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return (
                <div key={`empty-${idx}`} className="min-h-[120px] border-b border-r border-gray-100 dark:border-gray-805 bg-gray-50/20 dark:bg-gray-900/10 last:border-r-0" />
              );
            }

            const dayStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEntries = calendarData.filter((e: any) => e.date === dayStr);

            return (
              <div
                key={`day-${day}`}
                onClick={() => {
                  if (dayEntries.length > 0) {
                    setSelectedCalendarDay({ day, entries: dayEntries });
                  }
                }}
                className={cn(
                  "min-h-[120px] p-3 border-b border-r border-gray-100 dark:border-gray-805 bg-white dark:bg-gray-900 flex flex-col justify-between last:border-r-0 transition-all select-none",
                  dayEntries.length > 0
                    ? "cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-950/10"
                    : "cursor-default"
                )}
              >
                <span className={cn(
                  "text-xs font-black text-gray-400",
                  dayEntries.length > 0 && "text-blue-600 dark:text-blue-400 font-black"
                )}>
                  {day}
                </span>

                <div className="space-y-1 mt-2 flex-1 flex flex-col justify-end overflow-hidden">
                  {dayEntries.map((e: any, eIdx: number) => {
                    if (e.type === 'invoice') {
                      return (
                        <div
                          key={`e-${eIdx}`}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-955/40 text-blue-700 dark:text-blue-400 text-[9px] font-black rounded-lg border border-blue-100/30 dark:border-blue-900/20 truncate leading-tight shadow-sm text-left"
                          title={`Invoice #${e.reference_no} - ${e.customer_name}`}
                        >
                          🎫 INV-{e.reference_no}
                        </div>
                      );
                    } else if (e.type === 'pms') {
                      return (
                        <div
                          key={`e-${eIdx}`}
                          className="px-2 py-1 bg-red-50 dark:bg-red-955/40 text-red-700 dark:text-red-400 text-[9px] font-black rounded-lg border border-red-100/30 dark:border-red-900/20 truncate leading-tight shadow-sm text-left"
                          title={`PMS - ${e.description}`}
                        >
                          🛠️ PMS-{e.reference_no}
                        </div>
                      );
                    } else {
                      const prefix = e.travel_type === 'international' ? '✈️ DTT' : '🚌 DTT';
                      return (
                        <div
                          key={`e-${eIdx}`}
                          className="px-2 py-1 bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-450 text-[9px] font-black rounded-lg border border-amber-100/30 dark:border-amber-900/20 truncate leading-tight shadow-sm text-left"
                          title={`${e.travel_type === 'international' ? 'International' : 'Local'} Trip Ticket #${e.reference_no} - ${e.drop_off}`}
                        >
                          {prefix}-{e.reference_no}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

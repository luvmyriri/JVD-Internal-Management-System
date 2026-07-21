import BusLayout from '../../components/ui/BusLayout';
import { cn } from '../../utils';
import { MONTH_NAMES } from './monthNames';

export default function CalendarDayDetailModal({
  day,
  month,
  year,
  entries,
  bus,
  onClose,
}: {
  day: number;
  month: number;
  year: number;
  entries: any[];
  bus: any;
  onClose: () => void;
}) {
  const monthName = MONTH_NAMES[month - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="p-8 border-b border-gray-105 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Assignments for {monthName} {day}, {year}
            </h2>
            <p className="text-[10px] text-gray-450 uppercase font-black tracking-widest mt-0.5">
              Bus: {bus ? `${bus.plate_number} (${bus.model})` : 'TBA'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-gray-50 dark:bg-gray-850 rounded-2xl text-gray-450 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className="p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row gap-8"
            >
              <div className="flex-1 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block shadow-sm",
                      entry.type === 'invoice'
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30"
                        : entry.type === 'pms'
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200/50 dark:border-red-800/30"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-450 border border-amber-200/50 dark:border-amber-855/30"
                    )}>
                      {entry.type === 'invoice' ? 'POS Invoice' : entry.type === 'pms' ? 'PMS Maintenance' : entry.travel_type === 'international' ? 'International Travel' : 'Local Travel'}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase mt-2 font-mono">
                      {entry.type === 'invoice' ? `INV-${entry.reference_no}` : entry.type === 'pms' ? `${entry.reference_no}` : `DTT-${entry.reference_no}`}
                    </h3>
                  </div>
                  {entry.type === 'invoice' && (
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Total Amount</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-450 mt-0.5">
                        ₱{Number(entry.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  {entry.type === 'invoice' ? (
                    <>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Customer Name</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{entry.customer_name || 'Walk-in'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Status</span>
                        <span className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border inline-block shadow-sm",
                          entry.status === 'completed'
                            ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30"
                            : "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30"
                        )}>
                          {entry.status === 'completed' ? 'Completed' : 'Reserved'}
                        </span>
                      </div>
                    </>
                  ) : entry.type === 'pms' ? (
                    <>
                      <div className="col-span-2">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Description / Notes</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 block mt-1">{entry.description || 'No description provided.'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Status</span>
                        <span className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border inline-block shadow-sm",
                          entry.status === 'completed'
                            ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30"
                            : "bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/30"
                        )}>
                          {entry.status}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Driver</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{bus?.driver ? `${bus.driver.first_name} ${bus.driver.last_name}` : 'TBA'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Passengers</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{entry.pax} pax</span>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">Route</span>
                        <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="font-bold text-gray-600 dark:text-gray-350">{entry.pick_up}</span>
                            <span className="text-gray-400">→</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-black text-gray-800 dark:text-white">{entry.drop_off}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {entry.type === 'invoice' && entry.seat_map && entry.seat_map.length > 0 ? (
                <div className="lg:w-[320px] shrink-0 space-y-3">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selected Seating Chart</span>
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 flex justify-center">
                    <BusLayout
                      hasRestroom={bus?.bus_category === 'VIP'}
                      seats={bus?.custom_seats || []}
                      totalSeats={bus?.seating_capacity || 49}

                      selectedSeats={entry.seat_map || []}
                      viewOnly={true}
                      compact={true}
                    />
                  </div>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider text-center">
                    Booked Seats ({entry.seat_map.length}): {entry.seat_map.join(', ')}
                  </p>
                </div>
              ) : entry.type === 'invoice' ? (
                <div className="lg:w-[320px] shrink-0 flex items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-850 rounded-3xl text-gray-400 italic text-xs text-center font-bold">
                  No seats assigned for this invoice.
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-8 border-t border-gray-105 dark:border-gray-850 bg-white dark:bg-gray-900 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}

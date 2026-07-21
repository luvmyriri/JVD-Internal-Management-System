import type { TripTicket } from '../../types';
import { StatusBadge } from './StatusBadge';
import { printTripTicket } from './printTripTicket';

export default function TripTicketDetailModal({ ticket, onClose }: { ticket: TripTicket; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Ticket #{ticket.control_no}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold text-sm">
            ✕
          </button>
        </div>

        <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Date</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.date_of_travel}</h3>
              {ticket.duration && <p className="text-xs text-gray-500 mt-1">{ticket.duration}</p>}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passengers</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.no_of_passengers} pax</h3>
              {ticket.passenger_name && <p className="text-xs text-gray-500 mt-1">{ticket.passenger_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Route</p>
              <div className="mt-2 space-y-3">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 shadow-sm z-10" />
                    <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Pick Up</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.pick_up}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 shadow-sm" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Drop Off</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.drop_off}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle & Driver</p>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.bus?.plate_number || ticket.plate_no || 'TBA'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.driver?.name || 'TBA'}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Allowances</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">Meal</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.meal_allowance?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">Diesel</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.diesel?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">SOP</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {ticket.sop?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm text-gray-500">Tolls</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {((ticket.easy_trip || 0) + (ticket.autosweep || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
          <button
            onClick={() => printTripTicket(ticket)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 border border-blue-500/20"
          >
            Print DTT
          </button>
          <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

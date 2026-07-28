import { useQuery } from '@tanstack/react-query';
import { tripTicketApi } from '../../../api/operations';
import { LuMapPin, LuCalendar, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function TripTicketsCard() {
  const navigate = useNavigate();
  const { data: ticketsRaw, isLoading } = useQuery({
    queryKey: ['trip-tickets-widget'],
    queryFn: tripTicketApi.getAll,
    staleTime: 1000 * 60 * 2,
  });

  const tickets: any[] = (ticketsRaw as any[]) ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <LuMapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Trip Tickets Schedule</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Assigned dispatch trips & active tickets</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/logistics/trip-tickets')}
          className="text-xs font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 uppercase tracking-wider"
        >
          View Schedule &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-cyan-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-xs font-medium">
          No scheduled trips found.
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.slice(0, 3).map((t: any, idx: number) => (
            <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-mono">
                  {t.ticket_number || `TKT-${t.id}`}
                </span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                  {t.destination || t.route || 'Local Dispatch'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                  <LuCalendar size={12} /> {t.departure_date || 'Today'}
                </span>
                <span className="inline-block mt-0.5 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 text-[9px] font-black uppercase rounded-md">
                  {t.status || 'Scheduled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

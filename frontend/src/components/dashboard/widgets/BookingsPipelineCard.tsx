import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { LuTicket, LuSparkles, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function BookingsPipelineCard() {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'agent'],
    queryFn: dashboardApi.getAgent,
    staleTime: 1000 * 60 * 2,
  });

  const kpis = dashboardData?.kpis;
  const recentBookings = dashboardData?.recent_bookings ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <LuTicket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Active Bookings Pipeline</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Educational tours, charters & joiners</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/sales/educational-tours')}
          className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 uppercase tracking-wider"
        >
          View Sales &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <div>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Active Bookings Count</span>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                {kpis?.active_bookings ?? recentBookings.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm">
              <LuSparkles size={18} />
            </div>
          </div>

          <div className="space-y-2">
            {recentBookings.slice(0, 3).map((b: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{b.Customer || 'Customer'}</span>
                  <span className="block text-[10px] text-gray-400 font-medium">{b.Destination}</span>
                </div>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{b.Amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

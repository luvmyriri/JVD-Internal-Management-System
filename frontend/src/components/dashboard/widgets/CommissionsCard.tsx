import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { LuPercent, LuCoins, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function CommissionsCard() {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'agent'],
    queryFn: dashboardApi.getAgent,
    staleTime: 1000 * 60 * 2,
  });

  const kpis = dashboardData?.kpis;
  const formatMoney = (val: number = 0) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <LuPercent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Agent Commissions</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sales commission & payouts monitor</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/sales/commissions')}
          className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 uppercase tracking-wider"
        >
          View Claims &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-28 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : (
        <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 rounded-2xl border border-teal-100 dark:border-teal-900/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Monthly Commission</span>
            <p className="text-2xl font-black text-teal-700 dark:text-teal-300 mt-0.5">
              {formatMoney(kpis?.monthly_commission ?? 0)}
            </p>
            <p className="text-[10px] text-teal-600/80 font-bold uppercase tracking-tight mt-1">Processed & Pending Payouts</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center">
            <LuCoins size={22} />
          </div>
        </div>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { LuFileText, LuClock, LuCheck, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function InvoicesSummaryCard() {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'accounting'],
    queryFn: dashboardApi.getAccounting,
    staleTime: 1000 * 60 * 2,
  });

  const kpis = dashboardData?.kpis;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <LuFileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Invoices & Billing</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Customer billing and liquidations status</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/accounting/billing')}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 uppercase tracking-wider"
        >
          View All &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <LuClock size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Pending Invoices</span>
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {kpis?.pending_invoices ?? 0}
            </p>
            <p className="text-[10px] text-amber-600/80 font-bold uppercase tracking-tight mt-1">Awaiting Payment</p>
          </div>

          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <LuCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Completed Collections</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {kpis?.processed_collections ?? 0}
            </p>
            <p className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-tight mt-1">Fully Paid</p>
          </div>
        </div>
      )}
    </div>
  );
}

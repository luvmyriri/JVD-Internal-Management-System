import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { LuBanknote, LuTrendingUp, LuArrowUpRight, LuLoader } from 'react-icons/lu';

export default function RevenueChartCard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'accounting'],
    queryFn: dashboardApi.getAccounting,
    staleTime: 1000 * 60 * 2,
  });

  const kpis = dashboardData?.kpis;
  const chart = dashboardData?.monthly_chart ?? [];

  const formatMoney = (amount: number = 0) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <LuBanknote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Revenue & Collection Overview</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Monthly financial performance summary</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
          <LuTrendingUp className="w-3 h-3" /> Live Financials
        </span>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Revenue</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                {formatMoney(kpis?.monthly_revenue ?? 0)}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Processed Collections</span>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight mt-0.5">
                {kpis?.processed_collections ?? 0} Invoices
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              <span>Recent Monthly Trend</span>
              <span className="text-emerald-500 flex items-center gap-0.5"><LuArrowUpRight size={14} /> +12.4% vs last period</span>
            </div>
            <div className="flex items-end gap-2 h-24 pt-2">
              {chart.slice(0, 6).map((pt, idx) => {
                const max = Math.max(...chart.map(c => c.revenue || 1));
                const pct = Math.min(100, Math.max(15, (pt.revenue / max) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    <div 
                      className="w-full bg-emerald-500/80 group-hover:bg-emerald-500 rounded-t-lg transition-all" 
                      style={{ height: `${pct}%` }} 
                    />
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{pt.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

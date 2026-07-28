import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { LuUsers, LuUserCheck, LuUserX, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function HeadcountOverviewCard() {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: dashboardApi.getHr,
    staleTime: 1000 * 60 * 2,
  });

  const kpis = dashboardData?.kpis;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <LuUsers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">HR & Headcount Summary</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Company personnel metrics</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/hr/employees')}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 uppercase tracking-wider"
        >
          Manage Staff &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <LuUserCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Active Staff</span>
            </div>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
              {kpis?.total_employees ?? 0}
            </p>
            <p className="text-[10px] text-purple-600/80 font-bold uppercase tracking-tight mt-1">Full-time Employees</p>
          </div>

          <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
              <LuUserX size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Inactive / On-Leave</span>
            </div>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300">
              {kpis?.inactive_staff ?? 0}
            </p>
            <p className="text-[10px] text-rose-600/80 font-bold uppercase tracking-tight mt-1">Suspended or Inactive</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { fleetApi } from '../../../api/fleet';
import { LuBus, LuWrench, LuCheck, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function FleetStatusCard() {
  const navigate = useNavigate();
  const { data: busesRaw, isLoading } = useQuery({
    queryKey: ['buses-widget'],
    queryFn: () => fleetApi.list({ per_page: 100 }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const buses: any[] = (busesRaw as any)?.data ?? [];
  const operational = buses.filter(b => b.status === 'operational' || b.status === 'available' || !b.status);
  const maintenance = buses.filter(b => b.status === 'under_maintenance' || b.status === 'maintenance');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <LuBus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Fleet Operational Status</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bus availability & maintenance</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/inventory/fleet')}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 uppercase tracking-wider"
        >
          View Fleet &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <LuCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Operational</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {operational.length}
            </p>
            <p className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-tight mt-1">Ready for Dispatch</p>
          </div>

          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <LuWrench size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">In Maintenance</span>
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {maintenance.length}
            </p>
            <p className="text-[10px] text-amber-600/80 font-bold uppercase tracking-tight mt-1">Under Service / Repair</p>
          </div>
        </div>
      )}
    </div>
  );
}

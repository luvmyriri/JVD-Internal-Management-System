import { useQuery } from '@tanstack/react-query';
import { workOrderApi } from '../../../api/workOrders';
import { LuWrench, LuClock, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function WorkOrdersCard() {
  const navigate = useNavigate();
  const { data: ordersRaw, isLoading } = useQuery({
    queryKey: ['work-orders-widget'],
    queryFn: () => workOrderApi.list({ per_page: 20 }).then((r: any) => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const orders: any[] = (ordersRaw as any)?.data ?? [];
  const openOrders = orders.filter(o => o.status === 'open' || o.status === 'in_progress');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <LuWrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Job & Work Orders</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fleet repairs & maintenance work orders</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/procurement/work-orders')}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 uppercase tracking-wider"
        >
          View Pipeline &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-28 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      ) : (
        <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Active Repair Orders</span>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
              {openOrders.length}
            </p>
            <p className="text-[10px] text-rose-600/80 font-bold uppercase tracking-tight mt-1">Open or In-Progress Tasks</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center">
            <LuClock size={18} />
          </div>
        </div>
      )}
    </div>
  );
}

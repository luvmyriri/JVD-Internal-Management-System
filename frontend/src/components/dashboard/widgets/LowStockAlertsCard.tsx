import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../../api/inventory';
import { LuBox, LuAlertTriangle, LuCheckCircle, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function LowStockAlertsCard() {
  const navigate = useNavigate();
  const { data: suppliesRaw, isLoading } = useQuery({
    queryKey: ['supplies-widget'],
    queryFn: () => inventoryApi.listSupplies({ per_page: 100 }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const items: any[] = (suppliesRaw as any)?.data ?? [];
  const lowStock = items.filter(i => (i.quantity ?? i.stock ?? 0) <= (i.reorder_level ?? i.min_stock ?? 5));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <LuBox className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Inventory Stock Alerts</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Supply levels & low stock monitor</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/inventory/supplies')}
          className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 uppercase tracking-wider"
        >
          View Stock &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-28 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 mb-1">
              {lowStock.length > 0 ? <LuAlertTriangle size={16} /> : <LuCheckCircle size={16} />}
              <span className="text-[10px] font-black uppercase tracking-widest">Reorder Alerts</span>
            </div>
            <p className="text-2xl font-black text-orange-700 dark:text-orange-300">
              {lowStock.length} Items
            </p>
            <p className="text-[10px] text-orange-600/80 font-bold uppercase tracking-tight mt-1">
              {lowStock.length > 0 ? 'Requires Stock Replenishment' : 'All Supplies at Healthy Levels'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

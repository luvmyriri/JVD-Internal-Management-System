import { useQuery } from '@tanstack/react-query';
import { purchaseOrderApi } from '../../../api/procurement';
import { LuShoppingBag, LuFileCheck, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function PurchaseOrdersCard() {
  const navigate = useNavigate();
  const { data: posRaw, isLoading } = useQuery({
    queryKey: ['po-widget'],
    queryFn: () => purchaseOrderApi.list({ per_page: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const pos: any[] = (posRaw as any)?.data ?? [];
  const drafts = pos.filter(p => p.status === 'draft');
  const pending = pos.filter(p => p.status === 'pending' || p.status === 'submitted');
  const approved = pos.filter(p => p.status === 'approved');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <LuShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Purchase Orders</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Procurement orders & supplier requisitions</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/procurement/purchase-orders')}
          className="text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 uppercase tracking-wider"
        >
          Manage POs &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Drafts</span>
            <p className="text-xl font-black text-gray-700 dark:text-gray-200 mt-1">{drafts.length}</p>
          </div>

          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-center">
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Pending</span>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">{pending.length}</p>
          </div>

          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Approved</span>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{approved.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}

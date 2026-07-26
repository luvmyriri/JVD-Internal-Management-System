import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../../api/dashboards';
import { Inbox, ArrowRight, AlertCircle, Clock, FileCheck, Wrench, Banknote } from 'lucide-react';
import client from '../../../api/client';

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Banknote; color: string; bg: string }> = {
  cash_budget: {
    label: 'Cash Budget',
    icon: Banknote,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  purchase_order: {
    label: 'Purchase Order',
    icon: FileCheck,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  work_order: {
    label: 'Work Order',
    icon: Wrench,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
};

export default function ApprovalsWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['widget_approvals'],
    queryFn: () => client.get('/dashboards/widgets/approvals').then(r => r.data),
    refetchInterval: 30_000,
  });

  const approvals: any[] = data?.approvals ?? [];

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
          <Inbox className="w-6 h-6 opacity-40" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Inbox Zero</p>
        <p className="text-[11px] mt-1">No pending approvals for your role.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Count banner */}
      <div className="px-5 py-3 flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
            {approvals.length} item{approvals.length !== 1 ? 's' : ''} awaiting your action
          </span>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {approvals.map((item: any) => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.cash_budget;
          const Icon = cfg.icon;
          return (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => navigate(item.action_url)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left group"
            >
              {/* Type icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {item.urgency === 'high' && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.subtitle}</p>
              </div>

              {/* Amount + arrow */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {item.amount > 0 && (
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                    ₱{item.amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                  </span>
                )}
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

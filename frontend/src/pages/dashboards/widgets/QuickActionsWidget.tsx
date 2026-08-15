import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  LuShoppingCart, LuReceipt, LuBanknote, LuWallet,
  LuFileText, LuClipboardList, LuWrench, LuMap, LuPackage,
  LuUsers, LuBus, LuSignature, LuSettings,
} from 'react-icons/lu';
import client from '../../../api/client';

interface QuickAction {
  label: string;
  path: string;
  module: string;
  icon: ReactNode;
  tint: string;
  /** Key in widget pending counts to show a badge (optional) */
  countKey?: string;
  /** Additional roles that can see this even without `can_create` permission */
  extraRoles?: string[];
}

const ALL_ACTIONS: QuickAction[] = [
  {
    label: 'New Sales Order',
    path: '/sales/custom-transactions',
    module: 'sales',
    icon: <LuShoppingCart className="w-4 h-4" />,
    tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    label: 'View Transactions',
    path: '/accounting/transactions',
    module: 'accounting',
    icon: <LuReceipt className="w-4 h-4" />,
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    countKey: 'pending_invoices',
  },
  {
    label: 'Record Collection',
    path: '/accounting/collections',
    module: 'accounting',
    icon: <LuBanknote className="w-4 h-4" />,
    tint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    label: 'Cash Budget',
    path: '/operations/cash-budgets',
    module: 'accounting',
    icon: <LuWallet className="w-4 h-4" />,
    tint: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    countKey: 'pending_budgets',
  },
  {
    label: 'Purchase Order',
    path: '/procurement/purchase-orders',
    module: 'procurement',
    icon: <LuFileText className="w-4 h-4" />,
    tint: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    countKey: 'pending_pos',
  },
  {
    label: 'Job Order',
    path: '/procurement/job-orders',
    module: 'procurement',
    icon: <LuClipboardList className="w-4 h-4" />,
    tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    label: 'Work Order',
    path: '/procurement/work-orders',
    module: 'procurement',
    icon: <LuWrench className="w-4 h-4" />,
    tint: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    countKey: 'pending_wos',
  },
  {
    label: 'Trip Ticket',
    path: '/logistics/trip-tickets',
    module: 'logistics',
    icon: <LuMap className="w-4 h-4" />,
    tint: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    countKey: 'pending_trips',
  },
  {
    label: 'Add Supply',
    path: '/inventory/supplies',
    module: 'inventory',
    icon: <LuPackage className="w-4 h-4" />,
    tint: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  {
    label: 'Fleet Status',
    path: '/logistics/fleet',
    module: 'logistics',
    icon: <LuBus className="w-4 h-4" />,
    tint: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    extraRoles: ['operations_manager', 'dispatcher', 'logistics_in_charge'],
  },
  {
    label: 'Manage Users',
    path: '/admin/users',
    module: 'users',
    icon: <LuUsers className="w-4 h-4" />,
    tint: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    extraRoles: ['super_admin', 'admin'],
  },
  {
    label: 'Contracts',
    path: '/sales/contracts',
    module: 'sales',
    icon: <LuSignature className="w-4 h-4" />,
    tint: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    label: 'System Settings',
    path: '/admin/system-settings',
    module: 'users',
    icon: <LuSettings className="w-4 h-4" />,
    tint: 'bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400',
    extraRoles: ['super_admin'],
  },
];

export default function QuickActionsWidget({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  // Live pending counts for badges
  const { data: countsData } = useQuery({
    queryKey: ['widget_quick_counts'],
    queryFn: () => client.get('/dashboards/widgets/approvals').then(r => {
      const approvals: any[] = r.data?.approvals ?? [];
      return {
        pending_invoices: 0,
        pending_budgets:  approvals.filter((a: any) => a.type === 'cash_budget').length,
        pending_pos:      approvals.filter((a: any) => a.type === 'purchase_order').length,
        pending_wos:      approvals.filter((a: any) => a.type === 'work_order').length,
        pending_trips:    0,
      };
    }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const counts: Record<string, number> = countsData ?? {};

  const actions = ALL_ACTIONS.filter((a) => {
    const hasPerm = hasPermission(a.module, 'can_create') || hasPermission(a.module, 'can_view');
    const hasExtraRole = a.extraRoles?.includes(user?.role ?? '') ?? false;
    return hasPerm || hasExtraRole;
  });

  if (actions.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-400">
        No quick actions available for your role.
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const badge = a.countKey ? (counts[a.countKey] ?? 0) : 0;
          return (
            <button
              key={a.path}
              onClick={() => { navigate(a.path); onNavigate?.(); }}
              className="relative flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-left transition hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm active:scale-[0.98]"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.tint}`}>
                {a.icon}
              </span>
              <span className="text-xs font-bold leading-tight text-gray-800 dark:text-gray-100">{a.label}</span>
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

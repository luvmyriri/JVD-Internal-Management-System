import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  LuShoppingCart, LuReceipt, LuBanknote, LuWallet,
  LuFileText, LuClipboardList, LuWrench, LuMap, LuPackage,
} from 'react-icons/lu';

/**
 * Quick Actions — the widgets menu's launcher for the processes staff do most.
 * Each shortcut is gated by the same create-permission as its module, so users
 * only see actions they can actually perform. Clicking navigates to the module
 * (where the "New …" flow lives) and closes the menu.
 */
interface QuickAction {
  label: string;
  path: string;
  module: string;
  icon: ReactNode;
  tint: string;
}

const ACTIONS: QuickAction[] = [
  { label: 'New Sales Order', path: '/sales/custom-transactions', module: 'sales', icon: <LuShoppingCart className="w-4 h-4" />, tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { label: 'Create Invoice', path: '/accounting/billing', module: 'accounting', icon: <LuReceipt className="w-4 h-4" />, tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { label: 'Record Collection', path: '/accounting/collections', module: 'accounting', icon: <LuBanknote className="w-4 h-4" />, tint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
  { label: 'Cash Budget', path: '/accounting/cash-budgets', module: 'accounting', icon: <LuWallet className="w-4 h-4" />, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { label: 'Purchase Order', path: '/procurement/purchase-orders', module: 'procurement', icon: <LuFileText className="w-4 h-4" />, tint: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { label: 'Job Order', path: '/procurement/job-orders', module: 'procurement', icon: <LuClipboardList className="w-4 h-4" />, tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { label: 'Work Order', path: '/procurement/work-orders', module: 'procurement', icon: <LuWrench className="w-4 h-4" />, tint: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  { label: 'Trip Ticket', path: '/logistics/trip-tickets', module: 'logistics', icon: <LuMap className="w-4 h-4" />, tint: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
  { label: 'Add Supply', path: '/inventory/supplies', module: 'inventory', icon: <LuPackage className="w-4 h-4" />, tint: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
];

export default function QuickActionsWidget({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const actions = ACTIONS.filter((a) => hasPermission(a.module, 'can_create'));

  if (actions.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted">
        No quick actions are available for your role.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-1">
      {actions.map((a) => (
        <button
          key={a.path}
          onClick={() => { navigate(a.path); onNavigate?.(); }}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-muted"
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.tint}`}>{a.icon}</span>
          <span className="text-xs font-bold leading-tight text-ink">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

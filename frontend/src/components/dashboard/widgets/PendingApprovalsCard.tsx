import ApprovalsWidget from '../../../pages/dashboards/widgets/ApprovalsWidget';
import { LuClock } from 'react-icons/lu';

export default function PendingApprovalsCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <LuClock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Pending Approvals Queue</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Requisitions awaiting management approval</p>
          </div>
        </div>
      </div>
      <ApprovalsWidget />
    </div>
  );
}

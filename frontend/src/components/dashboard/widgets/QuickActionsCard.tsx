import QuickActionsWidget from '../../../pages/dashboards/widgets/QuickActionsWidget';
import { LuSparkles } from 'react-icons/lu';

export default function QuickActionsCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <LuSparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Quick Actions & Launchers</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Direct shortcuts to key daily tools</p>
          </div>
        </div>
      </div>
      <QuickActionsWidget />
    </div>
  );
}

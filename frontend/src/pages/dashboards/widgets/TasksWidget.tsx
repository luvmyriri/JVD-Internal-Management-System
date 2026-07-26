import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ListTodo, CalendarClock, Truck, FileText, Wrench } from 'lucide-react';
import client from '../../../api/client';

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  pending:     { dot: 'bg-amber-400',  label: 'Pending' },
  scheduled:   { dot: 'bg-blue-400',   label: 'Scheduled' },
  in_progress: { dot: 'bg-emerald-400', label: 'In Progress' },
  approved:    { dot: 'bg-teal-400',   label: 'Approved' },
  default:     { dot: 'bg-gray-300',   label: 'Open' },
};

const TYPE_ICON: Record<string, typeof ListTodo> = {
  trip:       Truck,
  invoice:    FileText,
  budget:     FileText,
  work_order: Wrench,
  job_order:  ListTodo,
  default:    ListTodo,
};

export default function TasksWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['widget_tasks'],
    queryFn: () => client.get('/dashboards/widgets/tasks').then(r => r.data),
    refetchInterval: 30_000,
  });

  const tasks: any[] = data?.tasks ?? [];

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 opacity-70" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">All Caught Up</p>
        <p className="text-[11px] mt-1">No pending tasks for your role right now.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Count banner */}
      <div className="px-5 py-3 flex items-center gap-2 bg-blue-50/60 dark:bg-blue-950/20">
        <CalendarClock className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
          {tasks.length} active task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Task list */}
      <div className="max-h-80 overflow-y-auto">
        {tasks.map((task: any) => {
          const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.default;
          const Icon = TYPE_ICON[task.type] ?? TYPE_ICON.default;

          return (
            <button
              key={`${task.type}-${task.id}`}
              onClick={() => task.url && navigate(task.url)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left group"
            >
              {/* Status dot + icon */}
              <div className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${statusCfg.dot}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{task.title}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.subtitle}</p>
              </div>

              {/* Status label + arrow */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{statusCfg.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

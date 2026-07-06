import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboards';
import { Card, ListRow, StatusPill } from '../../../components/ds';
import { ListTodo, CheckCircle, CheckCircle2, Clock, CalendarClock } from 'lucide-react';

export default function TasksWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard_tasks'],
    queryFn: dashboardApi.getWidgetTasks
  });

  const tasksData = data as any;
  const tasks = tasksData?.tasks || [];

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5">
      <h3 className="font-semibold text-ink mb-4">My Tasks & Schedule</h3>
      
      {isLoading ? (
        <div className="text-muted text-sm py-4">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
          <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm font-medium">No pending tasks</p>
          <p className="text-xs">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <ListRow 
              key={task.id}
              title={<span className="font-medium text-ink">{task.title}</span>}
              status={<StatusPill tone={task.status === 'pending' || task.status === 'scheduled' ? 'warning' : 'success'} label={task.status} />}
              subtitle={
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {task.subtitle}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboards';
import { useAuth } from '../context/AuthContext';
import RevenueWidget from './dashboards/widgets/RevenueWidget';
import FleetWidget from './dashboards/widgets/FleetWidget';
import TasksWidget from './dashboards/widgets/TasksWidget';
import ApprovalsWidget from './dashboards/widgets/ApprovalsWidget';

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard_layout'],
    queryFn: dashboardApi.getLayout
  });

  const layout = (data as any)?.layout || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-display font-bold text-ink">
          Good day, {user?.first_name || 'User'}
        </h1>
        <p className="text-muted">Here is your customized dashboard.</p>
      </header>

      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-surface border border-border rounded-[var(--radius-card)]"></div>
          <div className="h-64 bg-surface border border-border rounded-[var(--radius-card)]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content column (spanning 2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            {layout.includes('revenue') && <RevenueWidget />}
            {layout.includes('tasks') && <TasksWidget />}
            {layout.includes('approvals') && <ApprovalsWidget />}
          </div>

          {/* Sidebar content column */}
          <div className="space-y-6">
            {layout.includes('fleet_status') && <FleetWidget />}
            {layout.includes('fleet') && <FleetWidget />}
          </div>
        </div>
      )}
    </div>
  );
}

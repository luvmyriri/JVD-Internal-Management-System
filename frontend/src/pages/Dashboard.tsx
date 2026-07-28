import { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardErrorBoundary } from '../components/ui/DashboardErrorBoundary';
import { LoadingScreen } from '../components/ui';
import AdminDashboard from './dashboards/AdminDashboard';
import HRDashboard from './dashboards/HRDashboard';
import AccountingDashboard from './dashboards/AccountingDashboard';
import AgentDashboard from './dashboards/AgentDashboard';
import DriverDashboard from './dashboards/DriverDashboard';
import OperationsDashboard from './dashboards/OperationsDashboard';
import LogisticsDashboard from './dashboards/LogisticsDashboard';
import ProcurementDashboard from './dashboards/ProcurementDashboard';
import MaintenanceDashboard from './dashboards/MaintenanceDashboard';
import CustomDashboard from './dashboards/CustomDashboard';
import { LuLayoutGrid, LuSparkles } from 'react-icons/lu';

// Map dashboard_preference string → component
const DASHBOARD_MAP: Record<string, React.FC> = {
  admin:        AdminDashboard,
  accounting:   AccountingDashboard,
  operations:   OperationsDashboard,
  logistics:    LogisticsDashboard,
  procurement:  ProcurementDashboard,
  maintenance:  MaintenanceDashboard,
  hr:           HRDashboard,
  agent:        AgentDashboard,
  driver:       DriverDashboard,
  custom:       CustomDashboard,
};

function getDashboardForRole(role: string): React.FC {
  switch (role) {
    case 'super_admin':
    case 'executive_vice_president':
      return AdminDashboard;
    case 'operations_manager':
      return OperationsDashboard;
    case 'logistics_in_charge':
    case 'dispatcher':
      return LogisticsDashboard;
    case 'purchasing_manager':
      return ProcurementDashboard;
    case 'service_adviser':
    case 'head_mechanic':
      return MaintenanceDashboard;
    case 'corporate_secretary':
      return HRDashboard;
    case 'accounting_executive':
      return AccountingDashboard;
    case 'reservation_officer':
    case 'office_staff':
      return AgentDashboard;
    case 'driver':
      return DriverDashboard;
    default:
      return () => null;
  }
}

function WelcomeFallback() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const shortcuts = [
    { label: 'My Profile', path: '/profile' },
    { label: 'Notifications', path: '/notifications' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Welcome, {user?.first_name}!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          No default dashboard is assigned to your account. Use the navigation to access your modules.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {shortcuts.map(s => (
          <button
            key={s.path}
            onClick={() => navigate(s.path)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<'default' | 'custom'>(() => {
    const saved = localStorage.getItem('jvd_active_dashboard_view');
    return saved === 'custom' ? 'custom' : 'default';
  });

  const handleViewChange = (mode: 'default' | 'custom') => {
    setViewMode(mode);
    localStorage.setItem('jvd_active_dashboard_view', mode);
  };

  if (!user) return <LoadingScreen />;

  const preferenceKey = user.dashboard_preference;
  const PreferredDashboard = preferenceKey ? DASHBOARD_MAP[preferenceKey] : undefined;
  const RoleDashboard = getDashboardForRole(user.role);
  const DashboardComponent = PreferredDashboard ?? RoleDashboard;

  const isNull = DashboardComponent === (() => null) || !DashboardComponent;

  return (
    <div className="space-y-6">
      {/* Top View Selector Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2.5 px-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleViewChange('default')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'default'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <LuLayoutGrid size={14} /> Module View
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('custom')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'custom'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <LuSparkles size={14} /> My Custom Dashboard
          </button>
        </div>

        <span className="text-[11px] font-medium text-gray-400 hidden sm:inline-block">
          {viewMode === 'custom' ? 'Interactive Card Workspace' : 'Role Default Dashboard'}
        </span>
      </div>

      <DashboardErrorBoundary title="Dashboard failed to load">
        <Suspense fallback={<LoadingScreen />}>
          {viewMode === 'custom' ? (
            <CustomDashboard />
          ) : isNull ? (
            <WelcomeFallback />
          ) : (
            <DashboardComponent />
          )}
        </Suspense>
      </DashboardErrorBoundary>
    </div>
  );
}

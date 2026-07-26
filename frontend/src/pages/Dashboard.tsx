import { Suspense } from 'react';
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
      // Unknown role — do NOT default to AdminDashboard (hits admin APIs → crash)
      // Instead return null and show the welcome fallback
      return () => null;
  }
}

/**
 * WelcomeFallback is shown for unknown roles or when a user has no default dashboard.
 */
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

  if (!user) return <LoadingScreen />;

  // 1. Respect per-user dashboard preference if set by admin
  const preferenceKey = user.dashboard_preference;
  const PreferredDashboard = preferenceKey ? DASHBOARD_MAP[preferenceKey] : undefined;

  // 2. Fall back to the role-based default
  const RoleDashboard = getDashboardForRole(user.role);

  const DashboardComponent = PreferredDashboard ?? RoleDashboard;

  // 3. If it's the null-returning fallback, show WelcomeFallback
  const isNull = DashboardComponent === (() => null) || !DashboardComponent;

  return (
    <DashboardErrorBoundary title="Dashboard failed to load">
      <Suspense fallback={<LoadingScreen />}>
        {isNull ? <WelcomeFallback /> : <DashboardComponent />}
      </Suspense>
    </DashboardErrorBoundary>
  );
}

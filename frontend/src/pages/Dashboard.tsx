import { useAuth } from '../context/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import HRDashboard from './dashboards/HRDashboard';
import AccountingDashboard from './dashboards/AccountingDashboard';
import AgentDashboard from './dashboards/AgentDashboard';
import DriverDashboard from './dashboards/DriverDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'super_admin':
    case 'admin':
    case 'operations_manager':
    case 'logistics_in_charge':
    case 'dispatcher':
    case 'purchasing_manager':
    case 'service_adviser':
    case 'head_mechanic':
      return <AdminDashboard />;
    case 'human_resource':
    case 'corporate_secretary':
      return <HRDashboard />;
    case 'accounting':
    case 'accounting_executive':
      return <AccountingDashboard />;
    case 'agent':
    case 'reservation_officer':
    case 'office_staff':
      return <AgentDashboard />;
    case 'driver':
      return <DriverDashboard />;
    default:
      return <AdminDashboard />;
  }
}

import { useAuth } from '../context/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import HRDashboard from './dashboards/HRDashboard';
import AccountingDashboard from './dashboards/AccountingDashboard';
import AgentDashboard from './dashboards/AgentDashboard';
import DriverDashboard from './dashboards/DriverDashboard';
import OperationsDashboard from './dashboards/OperationsDashboard';
import LogisticsDashboard from './dashboards/LogisticsDashboard';
import ProcurementDashboard from './dashboards/ProcurementDashboard';
import MaintenanceDashboard from './dashboards/MaintenanceDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'super_admin':
    case 'executive_vice_president':
      return <AdminDashboard />;
    case 'operations_manager':
      return <OperationsDashboard />;
    case 'logistics_in_charge':
    case 'dispatcher':
      return <LogisticsDashboard />;
    case 'purchasing_manager':
      return <ProcurementDashboard />;
    case 'service_adviser':
    case 'head_mechanic':
      return <MaintenanceDashboard />;
    case 'corporate_secretary':
      return <HRDashboard />;
    case 'accounting_executive':
      return <AccountingDashboard />;
    case 'reservation_officer':
    case 'office_staff':
      return <AgentDashboard />;
    case 'driver':
      return <DriverDashboard />;
    default:
      return <AdminDashboard />;
  }
}

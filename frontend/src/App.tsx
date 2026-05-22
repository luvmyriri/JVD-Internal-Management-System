import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { EntityPreviewProvider } from './context/EntityPreviewContext';
import { AuthGuard } from './guards';
import PageWrapper from './components/layout/PageWrapper';
import EntityPreviewPanel from './components/ui/EntityPreviewPanel';
import FloatingCrossChecker from './components/ui/FloatingCrossChecker';
import { Toaster } from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/accounting/POS';
import Billing from './pages/accounting/Billing';
import Reports from './pages/accounting/Reports';
import ProcurementOverview from './pages/procurement/Overview';
import PurchaseOrders from './pages/procurement/PurchaseOrders';
import JobOrders from './pages/procurement/JobOrders';
import WorkOrders from './pages/procurement/WorkOrders';
import Accreditations from './pages/procurement/Accreditations';
import Suppliers from './pages/procurement/Suppliers';
import ProcurementDocuments from './pages/procurement/ProcurementDocuments';
import Supplies from './pages/inventory/Supplies';
import Fleet from './pages/inventory/Fleet';
import PMS from './pages/inventory/PMS';
import Passporting from './pages/travel/Passporting';
import VisaProcessing from './pages/travel/VisaProcessing';
import Customers from './pages/travel/Customers';
import CustomerProfile from './pages/travel/CustomerProfile';
import Documents from './pages/travel/Documents';
import Employees from './pages/hr/Employees';
import Users from './pages/admin/Users';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
import RolePermissions from './pages/admin/RolePermissions';
import DriverSchedule from './pages/driver/Schedule';
import DriverTrips from './pages/driver/Trips';
import DriverBus from './pages/driver/Bus';
import KycSubmission from './pages/KycSubmission';
import Profile from './pages/Profile';
import SetPassword from './pages/SetPassword';
import ForceChangePasswordModal from './components/auth/ForceChangePasswordModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DefaultRedirect = () => {
  const { user } = useAuth();
  let defaultLandingPage = localStorage.getItem('jvd_landing_page');
  if (!defaultLandingPage) {
    defaultLandingPage = user?.role === 'driver' ? '/driver/schedule' : '/dashboard';
  }
  return <Navigate to={defaultLandingPage} replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <EntityPreviewProvider>
            <AuthProvider>
              <Routes>
                {/* Public */}
              <Route path="/login" element={<Login />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="/kyc-submission" element={<KycSubmission />} />

              {/* Authenticated */}
              <Route
                element={
                  <AuthGuard>
                    <PageWrapper />
                  </AuthGuard>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />

                {/* Accounting */}
                <Route path="/accounting" element={<Navigate to="/accounting/billing" replace />} />
                <Route path="/accounting/pos" element={<POS />} />
                <Route path="/accounting/billing" element={<Billing />} />
                <Route path="/accounting/reports" element={<Reports />} />

                {/* Procurement */}
                <Route path="/procurement" element={<Navigate to="/procurement/overview" replace />} />
                <Route path="/procurement/overview" element={<ProcurementOverview />} />
                <Route path="/procurement/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/procurement/job-orders" element={<JobOrders />} />
                <Route path="/procurement/work-orders" element={<WorkOrders />} />
                <Route path="/procurement/accreditations" element={<Accreditations />} />
                <Route path="/procurement/suppliers" element={<Suppliers />} />
                <Route path="/procurement/documents" element={<ProcurementDocuments />} />

                {/* Inventory */}
                <Route path="/inventory/supplies" element={<Supplies />} />
                <Route path="/inventory/fleet" element={<Fleet />} />
                <Route path="/inventory/pms" element={<PMS />} />

                {/* Travel */}
                <Route path="/travel/passporting" element={<Passporting />} />
                <Route path="/travel/visa-processing" element={<VisaProcessing />} />
                <Route path="/travel/customers" element={<Customers />} />
                <Route path="/travel/customers/:id" element={<CustomerProfile />} />
                <Route path="/travel/documents" element={<Documents />} />

                {/* HR */}
                <Route path="/hr/employees" element={<Employees />} />

                {/* Admin */}
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/role-permissions" element={<RolePermissions />} />

                {/* Driver */}
                <Route path="/driver/schedule" element={<DriverSchedule />} />
                <Route path="/driver/trips" element={<DriverTrips />} />
                <Route path="/driver/bus" element={<DriverBus />} />
              </Route>

              <Route path="*" element={<DefaultRedirect />} />
            </Routes>
            <Toaster position="top-right" />
            <ForceChangePasswordModal />
            <EntityPreviewPanel />
            <FloatingCrossChecker />
          </AuthProvider>
        </EntityPreviewProvider>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

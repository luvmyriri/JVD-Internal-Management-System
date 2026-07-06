import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { EntityPreviewProvider } from './context/EntityPreviewContext';
import { AuthGuard } from './guards';
import PageWrapper from './components/layout/PageWrapper';
import EntityPreviewPanel from './components/ui/EntityPreviewPanel';
import FloatingCrossChecker from './components/ui/FloatingCrossChecker';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { JvdToaster } from './components/ds';
import { getLandingPageForUser, isPathAllowedForUser } from './utils/navigation';

// Pages — route-level code splitting (roadmap 3.4). Each becomes its own chunk so the
// initial bundle carries only the shell + the first route, not all ~40 pages + exceljs/jspdf.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FixedPackages = lazy(() => import('./pages/sales/FixedPackages'));
const CustomTransactions = lazy(() => import('./pages/sales/CustomTransactions'));
const Billing = lazy(() => import('./pages/accounting/Billing'));
const Reports = lazy(() => import('./pages/accounting/Reports'));
const JournalEntries = lazy(() => import('./pages/accounting/JournalEntries'));
const Liquidations = lazy(() => import('./pages/accounting/Liquidations'));
const PurchaseOrders = lazy(() => import('./pages/procurement/PurchaseOrders'));
const JobOrders = lazy(() => import('./pages/procurement/JobOrders'));
const WorkOrders = lazy(() => import('./pages/procurement/WorkOrders'));
const Commissions = lazy(() => import('./pages/operations/Commissions'));
const TripTickets = lazy(() => import('./pages/logistics/TripTickets'));
const CashBudgets = lazy(() => import('./pages/accounting/CashBudgets'));
const Collections = lazy(() => import('./pages/accounting/Collections'));
const Accreditations = lazy(() => import('./pages/operations/Accreditations'));
const Suppliers = lazy(() => import('./pages/procurement/Suppliers'));
const CompanyDocuments = lazy(() => import('./pages/operations/CompanyDocuments'));
const Supplies = lazy(() => import('./pages/inventory/Supplies'));
const Fleet = lazy(() => import('./pages/inventory/Fleet'));
const PMS = lazy(() => import('./pages/inventory/PMS'));
const Passporting = lazy(() => import('./pages/travel/Passporting'));
const VisaProcessing = lazy(() => import('./pages/travel/VisaProcessing'));
const Customers = lazy(() => import('./pages/operations/Customers'));
const CustomerProfile = lazy(() => import('./pages/operations/CustomerProfile'));
const Employees = lazy(() => import('./pages/hr/Employees'));
const Applications = lazy(() => import('./pages/hr/Applications'));
const Internships = lazy(() => import('./pages/hr/Internships'));
const Payroll = lazy(() => import('./pages/hr/Payroll'));
const Users = lazy(() => import('./pages/admin/Users'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const RolePermissions = lazy(() => import('./pages/admin/RolePermissions'));
const DriverSchedule = lazy(() => import('./pages/driver/Schedule'));
const DriverTrips = lazy(() => import('./pages/driver/Trips'));
const DriverBus = lazy(() => import('./pages/driver/Bus'));
const KycSubmission = lazy(() => import('./pages/KycSubmission'));
const VisaUploadPublic = lazy(() => import('./pages/travel/VisaUploadPublic'));
const CustomerPortal = lazy(() => import('./pages/portal/CustomerPortal'));
const Profile = lazy(() => import('./pages/Profile'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));
const LogisticsOverview = lazy(() => import('./pages/logistics/Overview'));
import ForceChangePasswordModal from './components/auth/ForceChangePasswordModal';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000, // 5 seconds (rapid caching, frequent background updates)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DefaultRedirect = () => {
  const { user } = useAuth();
  let defaultLandingPage = localStorage.getItem('jvd_landing_page');
  if (!defaultLandingPage || !isPathAllowedForUser(defaultLandingPage, user, user?.effective_permissions)) {
    defaultLandingPage = getLandingPageForUser(user, user?.effective_permissions);
  }
  return <Navigate to={defaultLandingPage} replace />;
};

/**
 * Route-level access check for the Administration pages — these expose system config,
 * RBAC management, and employee/audit data, so they're gated beyond AuthGuard's
 * authenticated-only check. Reuses the same isPathAllowedForUser logic the sidebar/landing-page
 * redirect already relies on, so it stays consistent with each role's actual permissions
 * (including dynamic custom_permissions grants) instead of a separately-maintained role list.
 */
const AdminRoute = ({ path, children }: { path: string; children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!isPathAllowedForUser(path, user, user?.effective_permissions)) {
    return <Navigate to={getLandingPageForUser(user, user?.effective_permissions)} replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <EntityPreviewProvider>
            <AuthProvider>
              <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Public */}
              <Route path="/login" element={<Login />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="/kyc-submission" element={<KycSubmission />} />
              <Route path="/public/visa-upload/:token" element={<VisaUploadPublic />} />
              <Route path="/portal/:token" element={<CustomerPortal />} />
              <Route path="/design-system" element={<DesignSystem />} />

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
                <Route path="/accounting/billing" element={<Billing />} />
                <Route path="/accounting/reports" element={<Reports />} />
                <Route path="/accounting/journal-entries" element={<JournalEntries />} />
                <Route path="/accounting/collections" element={<Collections />} />
                <Route path="/accounting/cash-budgets" element={<CashBudgets />} />
                <Route path="/accounting/commissions" element={<Commissions />} />
                <Route path="/accounting/liquidations" element={<Liquidations />} />
                <Route path="/accounting/pos" element={<Navigate to="/sales/fixed-packages" replace />} />

                {/* Operations */}
                <Route path="/operations" element={<Navigate to="/operations/customers" replace />} />
                <Route path="/operations/customers" element={<Customers />} />
                <Route path="/operations/customers/:id" element={<CustomerProfile />} />
                <Route path="/operations/accreditations" element={<Accreditations />} />
                <Route path="/operations/documents" element={<CompanyDocuments />} />
                <Route path="/operations/commissions" element={<Navigate to="/accounting/commissions" replace />} />
                <Route path="/operations/cash-budgets" element={<Navigate to="/accounting/cash-budgets" replace />} />

                {/* Logistics */}
                <Route path="/logistics" element={<LogisticsOverview />} />
                <Route path="/logistics/trip-tickets" element={<TripTickets />} />
                <Route path="/logistics/fleet" element={<Fleet />} />
                <Route path="/logistics/pms" element={<PMS />} />

                {/* Procurement */}
                <Route path="/procurement" element={<Navigate to="/procurement/work-orders" replace />} />
                <Route path="/procurement/overview" element={<Navigate to="/logistics" replace />} />
                <Route path="/procurement/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/procurement/job-orders" element={<JobOrders />} />
                <Route path="/procurement/work-orders" element={<WorkOrders />} />
                <Route path="/procurement/suppliers" element={<Suppliers />} />
                <Route path="/procurement/accreditations" element={<Navigate to="/operations/accreditations" replace />} />
                <Route path="/procurement/documents" element={<Navigate to="/operations/documents" replace />} />

                {/* Inventory */}
                <Route path="/inventory" element={<Navigate to="/inventory/supplies" replace />} />
                <Route path="/inventory/supplies" element={<Supplies />} />
                <Route path="/inventory/fleet" element={<Navigate to="/logistics/fleet" replace />} />
                <Route path="/inventory/pms" element={<Navigate to="/logistics/pms" replace />} />

                {/* Sales */}
                <Route path="/sales" element={<Navigate to="/sales/fixed-packages" replace />} />
                <Route path="/sales/fixed-packages" element={<FixedPackages />} />
                <Route path="/sales/custom-transactions" element={<CustomTransactions />} />

                {/* Travel Assistance */}
                <Route path="/travel" element={<Navigate to="/travel/passporting" replace />} />
                <Route path="/travel/passporting" element={<Passporting />} />
                <Route path="/travel/visa-processing" element={<VisaProcessing />} />
                <Route path="/travel/customers" element={<Navigate to="/operations/customers" replace />} />
                <Route path="/travel/customers/:id" element={<Navigate to="/operations/customers/:id" replace />} />
                <Route path="/travel/documents" element={<Navigate to="/operations/documents" replace />} />

                {/* HR */}
                <Route path="/hr" element={<Navigate to="/hr/employees" replace />} />
                <Route path="/hr/employees" element={<Employees />} />
                <Route path="/hr/applications" element={<Applications />} />
                <Route path="/hr/internships" element={<Internships />} />
                <Route path="/hr/payroll" element={<Payroll />} />

                {/* Admin */}
                <Route path="/admin/users" element={<AdminRoute path="/admin/users"><Users /></AdminRoute>} />
                <Route path="/admin/audit-logs" element={<AdminRoute path="/admin/audit-logs"><AuditLogs /></AdminRoute>} />
                <Route path="/admin/settings" element={<AdminRoute path="/admin/settings"><Settings /></AdminRoute>} />
                <Route path="/admin/role-permissions" element={<AdminRoute path="/admin/role-permissions"><RolePermissions /></AdminRoute>} />

                {/* Driver */}
                <Route path="/driver/overview" element={<DriverTrips />} />
                <Route path="/driver/scheduled-trips" element={<DriverSchedule />} />
                <Route path="/driver/my-fleet" element={<DriverBus />} />
                <Route path="/driver/commissions" element={<Commissions />} />
                <Route path="/driver/schedule" element={<Navigate to="/driver/scheduled-trips" replace />} />
                <Route path="/driver/trips" element={<Navigate to="/driver/overview" replace />} />
                <Route path="/driver/bus" element={<Navigate to="/driver/my-fleet" replace />} />
              </Route>

              <Route path="*" element={<DefaultRedirect />} />
            </Routes>
              </Suspense>
            <JvdToaster />
            <ForceChangePasswordModal />
            <EntityPreviewPanel />
            <FloatingCrossChecker />
          </AuthProvider>
        </EntityPreviewProvider>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

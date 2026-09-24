import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QuickRequestProvider } from './context/QuickRequestContext';
import { ThemeProvider } from './context/ThemeContext';
import { EntityPreviewProvider } from './context/EntityPreviewContext';
import QuickRequestModal from './components/layout/QuickRequestModal';
import { AuthGuard, RoleGuard } from './guards';
import PageWrapper from './components/layout/PageWrapper';
import EntityPreviewPanel from './components/ui/EntityPreviewPanel';
import FloatingCrossChecker from './components/ui/FloatingCrossChecker';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { getLandingPageForUser, isPathAllowedForUser } from './utils/navigation';

// Pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FixedPackages = lazy(() => import('./pages/sales/FixedPackages'));
const FixedPackageCheckout = lazy(() => import('./pages/sales/FixedPackageCheckout'));
const Sales = lazy(() => import('./pages/sales/Sales'));
const JoinerDepartures = lazy(() => import('./pages/sales/JoinerDepartures'));
const JoinerCheckout = lazy(() => import('./pages/sales/JoinerCheckout'));
const JoinerDepartureDetail = lazy(() => import('./pages/sales/JoinerDepartureDetail'));
const CharterSales = lazy(() => import('./pages/sales/CharterSales'));
const EducationalTours = lazy(() => import('./pages/sales/EducationalTours'));
const CustomTransactions = lazy(() => import('./pages/sales/CustomTransactions'));
const SalesOrders = lazy(() => import('./pages/sales/SalesOrders'));
const EducationalProgramDetails = lazy(() => import('./pages/sales/SalesDetails').then(module => ({ default: module.EducationalProgramDetails })));
const SalesServiceDetails = lazy(() => import('./pages/sales/SalesDetails').then(module => ({ default: module.SalesServiceDetails })));
const Transactions = lazy(() => import('./pages/accounting/Transactions'));
const TransactionDetails = lazy(() => import('./pages/accounting/TransactionDetails'));
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
const DashboardCustomizerPage = lazy(() => import('./pages/admin/DashboardCustomizerPage'));
const RolePermissions = lazy(() => import('./pages/admin/RolePermissions'));
const DriverSchedule = lazy(() => import('./pages/driver/Schedule'));
const DriverTrips = lazy(() => import('./pages/driver/Trips'));
const DriverBus = lazy(() => import('./pages/driver/Bus'));
const KycSubmission = lazy(() => import('./pages/KycSubmission'));
const VisaUploadPublic = lazy(() => import('./pages/travel/VisaUploadPublic'));
const CustomerPortal = lazy(() => import('./pages/portal/CustomerPortal'));
const Profile = lazy(() => import('./pages/Profile'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
import ForceChangePasswordModal from './components/auth/ForceChangePasswordModal';
import LogisticsOverview from './pages/logistics/Overview';

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

const DriverOnlyRoute = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard roles={['driver']}>
    {children}
  </RoleGuard>
);

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <EntityPreviewProvider>
            <AuthProvider>
              <QuickRequestProvider>
                <Suspense fallback={<div role="status" className="p-6 text-sm text-muted">Loading page…</div>}>
                <Routes>
                  {/* Public */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/kyc-submission" element={<KycSubmission />} />
                  <Route path="/public/visa-upload/:token" element={<VisaUploadPublic />} />
                  <Route path="/portal/:token" element={<CustomerPortal />} />

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
                    <Route path="/accounting" element={<Navigate to="/accounting/transactions" replace />} />
                    <Route path="/accounting/transactions" element={<Transactions />} />
                    <Route path="/accounting/transactions/:invoiceId" element={<TransactionDetails />} />
                    <Route path="/accounting/billing" element={<Navigate to="/accounting/transactions" replace />} />
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
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/sales/departures" element={<JoinerDepartures />} />
                    <Route path="/sales/departures/:departureId" element={<JoinerDepartureDetail />} />
                    <Route path="/sales/joiners/checkout" element={<JoinerCheckout />} />
                    <Route path="/sales/charters" element={<CharterSales />} />
                    <Route path="/sales/educational-tours" element={<EducationalTours />} />
                    <Route path="/sales/fixed-packages" element={<FixedPackages />} />
                    <Route path="/sales/fixed-packages/:serviceId/book" element={<FixedPackageCheckout />} />
                    <Route path="/sales/custom-transactions" element={<CustomTransactions />} />
                    <Route path="/sales/orders" element={<SalesOrders />} />
                    <Route path="/sales/services/:serviceId/details" element={<SalesServiceDetails />} />
                    <Route path="/sales/educational-programs/:programId/details" element={<EducationalProgramDetails />} />
                    <Route path="/sales/transactions/:invoiceId" element={<TransactionDetails />} />

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

                    {/* Admin & Settings */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin/users" element={<AdminRoute path="/admin/users"><Users /></AdminRoute>} />
                    <Route path="/admin/audit-logs" element={<AdminRoute path="/admin/audit-logs"><AuditLogs /></AdminRoute>} />
                    <Route path="/admin/settings" element={<AdminRoute path="/admin/settings"><Settings /></AdminRoute>} />
                    <Route path="/settings/dashboard-customizer" element={<DashboardCustomizerPage />} />
                    <Route path="/dashboard/customize" element={<Navigate to="/settings/dashboard-customizer" replace />} />
                    <Route path="/admin/role-permissions" element={<AdminRoute path="/admin/role-permissions"><RolePermissions /></AdminRoute>} />

                    {/* Driver */}
                    <Route path="/driver/overview" element={<DriverOnlyRoute><DriverTrips /></DriverOnlyRoute>} />
                    <Route path="/driver/scheduled-trips" element={<DriverOnlyRoute><DriverSchedule /></DriverOnlyRoute>} />
                    <Route path="/driver/my-fleet" element={<DriverOnlyRoute><DriverBus /></DriverOnlyRoute>} />
                    <Route path="/driver/commissions" element={<DriverOnlyRoute><Commissions /></DriverOnlyRoute>} />
                    <Route path="/driver/schedule" element={<Navigate to="/driver/scheduled-trips" replace />} />
                    <Route path="/driver/trips" element={<Navigate to="/driver/overview" replace />} />
                    <Route path="/driver/bus" element={<Navigate to="/driver/my-fleet" replace />} />
                  </Route>

                  <Route path="*" element={<DefaultRedirect />} />
                </Routes>
                </Suspense>
                <Toaster position="top-right" />
                <ForceChangePasswordModal />
                <EntityPreviewPanel />
                <FloatingCrossChecker />
                <QuickRequestModal />
              </QuickRequestProvider>
            </AuthProvider>
        </EntityPreviewProvider>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

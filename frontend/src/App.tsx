import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthGuard } from './guards';
import PageWrapper from './components/layout/PageWrapper';
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
import Supplies from './pages/inventory/Supplies';
import Fleet from './pages/inventory/Fleet';
import BusAccreditation from './pages/inventory/BusAccreditation';
import PMS from './pages/inventory/PMS';
import Passporting from './pages/travel/Passporting';
import VisaProcessing from './pages/travel/VisaProcessing';
import Customers from './pages/travel/Customers';
import Documents from './pages/travel/Documents';
import Employees from './pages/hr/Employees';
import Users from './pages/admin/Users';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';
import KycSubmission from './pages/KycSubmission';
import Profile from './pages/Profile';
import SetPassword from './pages/SetPassword';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
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

                {/* Inventory */}
                <Route path="/inventory/supplies" element={<Supplies />} />
                <Route path="/inventory/fleet" element={<Fleet />} />
                <Route path="/inventory/bus-accreditation" element={<BusAccreditation />} />
                <Route path="/inventory/pms" element={<PMS />} />

                {/* Travel */}
                <Route path="/travel/passporting" element={<Passporting />} />
                <Route path="/travel/visa-processing" element={<VisaProcessing />} />
                <Route path="/travel/customers" element={<Customers />} />
                <Route path="/travel/documents" element={<Documents />} />

                {/* HR */}
                <Route path="/hr/employees" element={<Employees />} />

                {/* Admin */}
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/admin/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './guards';
import PageWrapper from './components/layout/PageWrapper';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/accounting/POS';
import Billing from './pages/accounting/Billing';
import Reports from './pages/accounting/Reports';
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
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated */}
            <Route
              element={
                <AuthGuard>
                  <PageWrapper />
                </AuthGuard>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Accounting */}
              <Route path="/accounting" element={<Navigate to="/accounting/billing" replace />} />
              <Route path="/accounting/pos" element={<POS />} />
              <Route path="/accounting/billing" element={<Billing />} />
              <Route path="/accounting/reports" element={<Reports />} />

              {/* Procurement */}
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

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

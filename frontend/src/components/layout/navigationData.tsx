import type { ReactNode } from 'react';
import {
  LuLayoutDashboard,
  LuFileText,
  LuClipboardList,
  LuWrench,
  LuShieldCheck,
  LuTruck,
  LuPackage,
  LuBus,
  LuActivity,
  LuGlobe,
  LuStamp,
  LuUsers,
  LuFileCheck,
  LuUserCog,
  LuScrollText,
  LuSettings,
  LuCircleUser,
  LuChevronDown,
  LuCalendarClock,
  LuMapPin,
  LuBanknote,
  LuMap,
  LuWallet,
  LuSignature,
  LuStore,
  LuShoppingCart,
  LuFolderOpen,
  LuCreditCard,
  LuReceipt,
} from 'react-icons/lu';
import type { UserRole } from '../../types/auth';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: UserRole[];
  module?: string;   // top-level module for permission gating
  pageKey?: string;  // e.g. 'accounting.billing' — if set, used for page-level permission check
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: 'Management Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LuLayoutDashboard />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'reservation_officer', 'office_staff', 'accounting_executive', 'corporate_secretary', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'service_adviser', 'head_mechanic', 'driver'], module: 'dashboard', pageKey: 'dashboard' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Sales Overview', path: '/sales', icon: <LuLayoutDashboard />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales' },
      { label: 'Fixed Packages', path: '/sales/fixed-packages', icon: <LuStore />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales', pageKey: 'sales.fixed_packages' },
      { label: 'Joiner Departures', path: '/sales/departures', icon: <LuCalendarClock />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales', pageKey: 'sales.departures' },
      { label: 'Bus Charters', path: '/sales/charters', icon: <LuBus />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales', pageKey: 'sales.charters' },
      { label: 'Educational Tours', path: '/sales/educational-tours', icon: <LuGlobe />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales', pageKey: 'sales.educational_tours' },
      { label: 'Custom Transactions', path: '/sales/custom-transactions', icon: <LuShoppingCart />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales', pageKey: 'sales.custom_transactions' },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { label: 'Transactions', path: '/accounting/transactions', icon: <LuFileText />, roles: ['super_admin', 'executive_vice_president', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.billing' },
      { label: 'Reports', path: '/accounting/reports', icon: <LuClipboardList />, roles: ['super_admin', 'executive_vice_president', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.reports' },
      { label: 'General Ledger', path: '/accounting/journal-entries', icon: <LuScrollText />, roles: ['super_admin', 'executive_vice_president', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.reports' },
      { label: 'Collections', path: '/accounting/collections', icon: <LuBanknote />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.collections' },
      { label: 'Cash Budgets', path: '/accounting/cash-budgets', icon: <LuWallet />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.cash_budgets' },
      { label: 'Commissions', path: '/accounting/commissions', icon: <LuSignature />, roles: ['super_admin', 'executive_vice_president', 'corporate_secretary', 'operations_manager', 'accounting_executive', 'driver', 'head_mechanic', 'dispatcher', 'office_staff', 'service_adviser'], module: 'accounting', pageKey: 'accounting.commissions' },
      { label: 'Liquidations', path: '/accounting/liquidations', icon: <LuReceipt />, roles: ['super_admin', 'executive_vice_president', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.liquidations' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Customers', path: '/operations/customers', icon: <LuUsers />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'reservation_officer', 'office_staff', 'corporate_secretary'], module: 'operations', pageKey: 'operations.customers' },
      { label: 'Accreditations', path: '/operations/accreditations', icon: <LuShieldCheck />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'reservation_officer', 'office_staff', 'corporate_secretary'], module: 'operations', pageKey: 'operations.accreditations' },
      { label: 'Company Documents', path: '/operations/documents', icon: <LuFolderOpen />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'reservation_officer', 'office_staff', 'corporate_secretary'], module: 'operations', pageKey: 'operations.documents' },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { label: 'Overview', path: '/logistics', icon: <LuTruck />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'head_mechanic', 'service_adviser'], module: 'logistics', pageKey: 'logistics.overview' },
      { label: 'Trip Ticket', path: '/logistics/trip-tickets', icon: <LuMap />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'head_mechanic', 'service_adviser'], module: 'logistics', pageKey: 'logistics.trip_tickets' },
      { label: 'Fleet', path: '/logistics/fleet', icon: <LuBus />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'head_mechanic', 'service_adviser'], module: 'logistics', pageKey: 'logistics.fleet' },
      { label: 'PMS', path: '/logistics/pms', icon: <LuActivity />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'head_mechanic', 'service_adviser'], module: 'logistics', pageKey: 'logistics.pms' },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { label: 'Work Order', path: '/procurement/work-orders', icon: <LuWrench />, roles: ['super_admin', 'executive_vice_president', 'dispatcher', 'service_adviser'], module: 'procurement', pageKey: 'procurement.work_orders' },
      { label: 'Job Order', path: '/procurement/job-orders', icon: <LuClipboardList />, roles: ['super_admin', 'executive_vice_president', 'service_adviser'], module: 'procurement', pageKey: 'procurement.job_orders' },
      { label: 'Purchase Order', path: '/procurement/purchase-orders', icon: <LuFileText />, roles: ['super_admin', 'executive_vice_president', 'purchasing_manager'], module: 'procurement', pageKey: 'procurement.purchase_orders' },
      { label: 'Suppliers', path: '/procurement/suppliers', icon: <LuTruck />, roles: ['super_admin', 'executive_vice_president', 'purchasing_manager'], module: 'procurement', pageKey: 'procurement.suppliers' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Supplies', path: '/inventory/supplies', icon: <LuPackage />, roles: ['super_admin', 'executive_vice_president', 'purchasing_manager'], module: 'inventory', pageKey: 'inventory.supplies' },
    ],
  },

  {
    title: 'Human Resource',
    items: [
      { label: 'Employees', path: '/hr/employees', icon: <LuCircleUser />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'], module: 'hr', pageKey: 'hr.employees' },
      { label: 'Job Applications', path: '/hr/applications', icon: <LuFileCheck />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'], module: 'hr', pageKey: 'hr.applications' },
      { label: 'Internship', path: '/hr/internships', icon: <LuGlobe />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'], module: 'hr', pageKey: 'hr.internships' },
      { label: 'Payroll Management', path: '/hr/payroll', icon: <LuCreditCard />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'], module: 'hr', pageKey: 'hr.payroll' },
    ],
  },
  {
    title: 'Travel Assistance',
    items: [
      { label: 'Passporting', path: '/travel/passporting', icon: <LuStamp />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'travel', pageKey: 'travel.passporting' },
      { label: 'Visa Processing', path: '/travel/visa-processing', icon: <LuGlobe />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'travel', pageKey: 'travel.visa_processing' },
    ],
  },
  {
    title: 'Driver',
    items: [
      { label: 'Overview', path: '/driver/overview', icon: <LuMapPin />, roles: ['driver'], module: 'driver', pageKey: 'driver.overview' },
      { label: 'Scheduled Trips', path: '/driver/scheduled-trips', icon: <LuCalendarClock />, roles: ['driver'], module: 'driver', pageKey: 'driver.scheduled_trips' },
      { label: 'My Fleet', path: '/driver/my-fleet', icon: <LuBus />, roles: ['driver'], module: 'driver', pageKey: 'driver.my_fleet' },
      { label: 'My Commissions', path: '/driver/commissions', icon: <LuSignature />, roles: ['driver'], module: 'driver', pageKey: 'operations.commissions' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', path: '/admin/users', icon: <LuUserCog />, roles: ['super_admin', 'executive_vice_president'], module: 'admin', pageKey: 'admin.users' },
      { label: 'Role Permissions', path: '/admin/role-permissions', icon: <LuShieldCheck />, roles: ['super_admin'], module: 'admin', pageKey: 'admin.role_permissions' },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <LuScrollText />, roles: ['super_admin', 'executive_vice_president'], module: 'admin', pageKey: 'admin.audit_logs' },
      { label: 'Settings', path: '/admin/settings', icon: <LuSettings />, roles: ['super_admin', 'executive_vice_president'], module: 'admin', pageKey: 'admin.settings' },
    ],
  },
];

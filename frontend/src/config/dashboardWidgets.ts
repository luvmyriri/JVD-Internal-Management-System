export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  category: 'accounting' | 'hr' | 'fleet' | 'sales' | 'procurement' | 'travel' | 'inventory' | 'system';
  description: string;
  defaultColSpan?: string; // e.g. 'col-span-1', 'col-span-1 lg:col-span-2', 'col-span-full'
  iconName: string;
}

export const WIDGET_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'All Modules', icon: 'LuLayers' },
  { key: 'accounting', label: 'Accounting & Finance', icon: 'LuBanknote' },
  { key: 'hr', label: 'HR & Personnel', icon: 'LuUsers' },
  { key: 'fleet', label: 'Fleet & Logistics', icon: 'LuBus' },
  { key: 'sales', label: 'Sales & Bookings', icon: 'LuTicket' },
  { key: 'procurement', label: 'Procurement & Orders', icon: 'LuShoppingBag' },
  { key: 'travel', label: 'Travel & Passports', icon: 'LuGlobe' },
  { key: 'inventory', label: 'Inventory & Supplies', icon: 'LuBox' },
  { key: 'system', label: 'System & Security', icon: 'LuShield' },
];

export const AVAILABLE_WIDGETS: DashboardWidgetDefinition[] = [
  // Accounting
  {
    id: 'accounting_revenue',
    title: 'Revenue & Collection Overview',
    category: 'accounting',
    description: 'Track total monthly revenue, collected fees, and outstanding invoice balances.',
    defaultColSpan: 'col-span-1 lg:col-span-2',
    iconName: 'LuBanknote',
  },
  {
    id: 'accounting_invoices',
    title: 'Recent Invoices & Liquidations',
    category: 'accounting',
    description: 'Monitor pending customer invoices, liquidation vouchers, and billing statuses.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuFileText',
  },

  // HR
  {
    id: 'hr_headcount',
    title: 'Employee Headcount & Roles',
    category: 'hr',
    description: 'Summary of active staff, department distribution, and user account status.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuUsers',
  },
  {
    id: 'hr_applications',
    title: 'Career & Internship Applications',
    category: 'hr',
    description: 'Track recent applicant profiles, resume submissions, and intern status.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuUserCheck',
  },

  // Fleet & Logistics
  {
    id: 'fleet_status',
    title: 'Fleet Operational Status',
    category: 'fleet',
    description: 'Real-time vehicle availability, active buses, and maintenance schedules.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuBus',
  },
  {
    id: 'fleet_trips',
    title: 'Trip Tickets & Dispatch Schedule',
    category: 'fleet',
    description: 'Today’s active trip tickets, assigned drivers, and passenger routes.',
    defaultColSpan: 'col-span-1 lg:col-span-2',
    iconName: 'LuMapPin',
  },

  // Sales
  {
    id: 'sales_bookings',
    title: 'Active Bookings & Contracts',
    category: 'sales',
    description: 'Monitor Educational Tours, Charter Bookings, and Joiners reservations.',
    defaultColSpan: 'col-span-1 lg:col-span-2',
    iconName: 'LuTicket',
  },
  {
    id: 'sales_commissions',
    title: 'Agent Commissions Tracker',
    category: 'sales',
    description: 'View sales agent commission requests, payout amounts, and approval states.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuPercent',
  },

  // Procurement
  {
    id: 'procurement_pos',
    title: 'Purchase Orders & Suppliers',
    category: 'procurement',
    description: 'Track pending purchase orders, supplier verification, and procurement budgets.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuShoppingBag',
  },
  {
    id: 'procurement_work_orders',
    title: 'Job & Work Orders Pipeline',
    category: 'procurement',
    description: 'Monitor active repair orders, vendor task assignments, and completion status.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuWrench',
  },

  // Travel
  {
    id: 'travel_passports',
    title: 'Passport & Visa Processing',
    category: 'travel',
    description: 'Track customer passport cases, visa applications, and secure upload requests.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuGlobe',
  },

  // Inventory
  {
    id: 'inventory_alerts',
    title: 'Low Stock & Inventory Supplies',
    category: 'inventory',
    description: 'Alerts for inventory items below reorder thresholds and supply levels.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuBox',
  },

  // System & Security
  {
    id: 'system_approvals',
    title: 'Pending Approvals Queue',
    category: 'system',
    description: 'Items requiring managerial or admin verification and approval.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuClock',
  },
  {
    id: 'system_audit',
    title: 'Recent Security & Audit Logs',
    category: 'system',
    description: 'Audit log trail of user actions, login events, and database mutations.',
    defaultColSpan: 'col-span-1 lg:col-span-2',
    iconName: 'LuShield',
  },
  {
    id: 'system_quick_actions',
    title: 'Quick System Shortcuts',
    category: 'system',
    description: 'Direct quick-action launchers for common daily operations.',
    defaultColSpan: 'col-span-1',
    iconName: 'LuSparkles',
  },
];

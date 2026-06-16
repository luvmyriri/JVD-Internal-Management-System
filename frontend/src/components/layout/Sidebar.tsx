import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { settingsApi } from '../../api/settings';
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
  icon: React.ReactNode;
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
      { label: 'Dashboard', path: '/dashboard', icon: <LuLayoutDashboard />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'], module: 'dashboard', pageKey: 'dashboard' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Fixed Packages', path: '/sales/fixed-packages', icon: <LuStore />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales', pageKey: 'sales.fixed_packages' },
      { label: 'Custom Transactions', path: '/sales/custom-transactions', icon: <LuShoppingCart />, roles: ['super_admin', 'executive_vice_president', 'reservation_officer', 'office_staff'], module: 'sales', pageKey: 'sales.custom_transactions' },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { label: 'Billing', path: '/accounting/billing', icon: <LuFileText />, roles: ['super_admin', 'executive_vice_president', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.billing' },
      { label: 'Reports', path: '/accounting/reports', icon: <LuClipboardList />, roles: ['super_admin', 'executive_vice_president', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.reports' },
      { label: 'General Ledger', path: '/accounting/journal-entries', icon: <LuScrollText />, roles: ['super_admin', 'executive_vice_president', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.reports' },
      { label: 'Collections', path: '/accounting/collections', icon: <LuBanknote />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.collections' },
      { label: 'Cash Budgets', path: '/accounting/cash-budgets', icon: <LuWallet />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive'], module: 'accounting', pageKey: 'accounting.cash_budgets' },
      { label: 'Commissions', path: '/accounting/commissions', icon: <LuSignature />, roles: ['super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive', 'driver', 'head_mechanic', 'dispatcher', 'office_staff', 'service_adviser'], module: 'accounting', pageKey: 'accounting.commissions' },
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
      { label: 'Overview', path: '/logistics', icon: <LuTruck />, roles: ['super_admin', 'executive_vice_president', 'logistics_in_charge', 'dispatcher', 'head_mechanic', 'service_adviser'], module: 'logistics', pageKey: 'logistics.overview' },
      { label: 'Trip Ticket', path: '/logistics/trip-tickets', icon: <LuMap />, roles: ['super_admin', 'executive_vice_president', 'logistics_in_charge', 'dispatcher'], module: 'logistics', pageKey: 'logistics.trip_tickets' },
      { label: 'Fleet', path: '/logistics/fleet', icon: <LuBus />, roles: ['super_admin', 'executive_vice_president', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'head_mechanic', 'service_adviser'], module: 'logistics', pageKey: 'logistics.fleet' },
      { label: 'PMS', path: '/logistics/pms', icon: <LuActivity />, roles: ['super_admin', 'executive_vice_president', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'head_mechanic'], module: 'logistics', pageKey: 'logistics.pms' },
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Management Overview': true,
  });
  const [systemName, setSystemName] = useState(() => localStorage.getItem('jvd_page_title') || 'JVD ETMC');

  // Auto-expand section on mount if an item within it is active
  useEffect(() => {
    const currentPath = location.pathname;
    navigation.forEach(section => {
      if (section.items.some(item => currentPath.startsWith(item.path))) {
        setExpandedSections(prev => ({ ...prev, [section.title]: true }));
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    const loadSystemName = async () => {
      try {
        const response = await settingsApi.getPublicSettings();
        const { data } = response.data;
        if (data && data.landing_page_title) {
          setSystemName(data.landing_page_title);
          localStorage.setItem('jvd_page_title', data.landing_page_title);
        }
      } catch (err) {
        console.error('Failed to load system name:', err);
      }
    };
    loadSystemName();
  }, []);

  if (!user) return null;

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Super admin always bypasses all permission checks
        if (user.role === 'super_admin') return true;

        // Use page-level key if available, fall back to module key
        const permKey = item.pageKey ?? item.module;
        if (permKey) {
          return hasPermission(permKey, 'can_view');
        }

        // Fallback to static role list check if no permission key is defined
        return item.roles.includes(user.role as UserRole);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
        {/* Logo glow keyframe animation */}
        <style>{`
        @keyframes jvd-logo-glow {
          0%   { filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.85))  drop-shadow(0 0 18px rgba(250, 204, 21, 0.4)); }
          33%  { filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.85))  drop-shadow(0 0 18px rgba(59, 130, 246, 0.4)); }
          66%  { filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.85))   drop-shadow(0 0 18px rgba(239, 68, 68, 0.4)); }
          100% { filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.85))  drop-shadow(0 0 18px rgba(250, 204, 21, 0.4)); }
        }
        .jvd-logo-glow {
          animation: jvd-logo-glow 3s ease-in-out infinite;
        }
      `}</style>

        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800 shrink-0">
          <img
            src="/JVD 3D.png"
            alt="JVD Logo"
            className="h-9 w-auto jvd-logo-glow"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <p className="text-sm font-bold text-white leading-none select-none">{systemName}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Management Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-4">
          {filteredNavigation.map((section) => {
            const isExpanded = expandedSections[section.title];
            const hasMultipleItems = section.items.length > 0; // Most sections have multiple or at least one

            return (
              <div key={section.title} className="space-y-2">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors group"
                >
                  <span className="select-none">{section.title}</span>
                  {hasMultipleItems && (
                    <LuChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                    />
                  )}
                </button>

                <div
                  className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'
                    }`}
                >
                  <ul className="min-h-0 space-y-1.5 overflow-hidden mt-1">
                    {section.items.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end
                          onClick={() => onClose?.()}
                          title={item.label}
                          className={({ isActive }) =>
                            `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${isActive
                              ? 'bg-white text-blue-900 font-black shadow-lg shadow-white/10'
                              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                              )}
                              <span className={`text-base shrink-0 ${isActive ? 'text-blue-600' : ''}`}>{item.icon}</span>
                              <span className="truncate">{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800 shrink-0">
          <p className="text-[10px] text-gray-600 text-center">JVD Event & Travel</p>
          <p className="text-[10px] text-gray-700 text-center">Management Co.</p>
        </div>
      </aside>
    </>
  );
}

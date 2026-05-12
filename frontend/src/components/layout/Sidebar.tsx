import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LuLayoutDashboard,
  LuReceipt,
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
} from 'react-icons/lu';
import type { UserRole } from '../../types/auth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LuLayoutDashboard />, roles: ['super_admin', 'admin', 'human_resource', 'accounting', 'agent'] },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { label: 'Point of Sale', path: '/accounting/pos', icon: <LuReceipt />, roles: ['super_admin', 'accounting'] },
      { label: 'Billing', path: '/accounting/billing', icon: <LuFileText />, roles: ['super_admin', 'accounting'] },
      { label: 'Reports', path: '/accounting/reports', icon: <LuClipboardList />, roles: ['super_admin', 'accounting'] },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { label: 'Purchase Orders', path: '/procurement/purchase-orders', icon: <LuFileText />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Job Orders', path: '/procurement/job-orders', icon: <LuClipboardList />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Work Orders', path: '/procurement/work-orders', icon: <LuWrench />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Accreditations', path: '/procurement/accreditations', icon: <LuShieldCheck />, roles: ['super_admin', 'admin', 'agent'] },
      { label: 'Suppliers', path: '/procurement/suppliers', icon: <LuTruck />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Supplies', path: '/inventory/supplies', icon: <LuPackage />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Fleet', path: '/inventory/fleet', icon: <LuBus />, roles: ['super_admin', 'admin', 'agent'] },
      { label: 'Bus Accreditation', path: '/inventory/bus-accreditation', icon: <LuShieldCheck />, roles: ['super_admin', 'admin'] },
      { label: 'PMS', path: '/inventory/pms', icon: <LuActivity />, roles: ['super_admin', 'admin', 'agent'] },
    ],
  },
  {
    title: 'Travel',
    items: [
      { label: 'Passporting', path: '/travel/passporting', icon: <LuStamp />, roles: ['super_admin', 'admin', 'agent'] },
      { label: 'Visa Processing', path: '/travel/visa-processing', icon: <LuGlobe />, roles: ['super_admin', 'admin', 'agent'] },
      { label: 'Customers', path: '/travel/customers', icon: <LuUsers />, roles: ['super_admin', 'admin', 'agent'] },
      { label: 'Documents', path: '/travel/documents', icon: <LuFileCheck />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
    ],
  },
  {
    title: 'HR',
    items: [
      { label: 'Employees', path: '/hr/employees', icon: <LuCircleUser />, roles: ['super_admin', 'admin', 'human_resource'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', path: '/admin/users', icon: <LuUserCog />, roles: ['super_admin', 'admin'] },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <LuScrollText />, roles: ['super_admin', 'admin'] },
      { label: 'Settings', path: '/admin/settings', icon: <LuSettings />, roles: ['super_admin', 'admin'] },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();

  if (!user) return null;

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(user.role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-30">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800 shrink-0">
        <img
          src="/JVD 3D.png"
          alt="JVD Logo"
          className="h-9 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div>
          <p className="text-sm font-bold text-white leading-none">JVD ETMS</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Management Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {filteredNavigation.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`
                    }
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800 shrink-0">
        <p className="text-[10px] text-gray-600 text-center">JVD Events & Travels</p>
        <p className="text-[10px] text-gray-700 text-center">Management Co. — Confidential</p>
      </div>
    </aside>
  );
}

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { settingsApi } from '../../api/settings';
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
  LuChevronDown,
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
      { label: 'POS', path: '/accounting/pos', icon: <LuReceipt />, roles: ['super_admin', 'accounting'] },
      { label: 'Billing', path: '/accounting/billing', icon: <LuFileText />, roles: ['super_admin', 'accounting'] },
      { label: 'Reports', path: '/accounting/reports', icon: <LuClipboardList />, roles: ['super_admin', 'accounting'] },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { label: 'Work Orders', path: '/procurement/work-orders', icon: <LuWrench />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Job Orders', path: '/procurement/job-orders', icon: <LuClipboardList />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Purchase Orders', path: '/procurement/purchase-orders', icon: <LuFileText />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Suppliers', path: '/procurement/suppliers', icon: <LuTruck />, roles: ['super_admin', 'admin', 'accounting', 'agent'] },
      { label: 'Accreditations', path: '/procurement/accreditations', icon: <LuShieldCheck />, roles: ['super_admin', 'admin', 'agent'] },
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
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <LuScrollText />, roles: ['super_admin', 'admin', 'human_resource'] },
      { label: 'Settings', path: '/admin/settings', icon: <LuSettings />, roles: ['super_admin', 'admin'] },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Overview': true,
  });
  const [systemName, setSystemName] = useState(() => localStorage.getItem('jvd_page_title') || 'JVD ETMS');

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
      items: section.items.filter((item) => item.roles.includes(user.role)),
    }))
    .filter((section) => section.items.length > 0);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

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
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                )}
              </button>
              
              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'
                }`}
              >
                <ul className="min-h-0 space-y-1.5 overflow-hidden mt-1">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                            isActive
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
        <p className="text-[10px] text-gray-600 text-center">JVD Events & Travels</p>
        <p className="text-[10px] text-gray-700 text-center">Management Co. — Confidential</p>
      </div>
    </aside>
  );
}

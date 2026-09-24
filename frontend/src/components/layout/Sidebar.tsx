import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { settingsApi } from '../../api/settings';
import { LuChevronDown } from 'react-icons/lu';
import { navigation } from './navigationData';
import type { UserRole } from '../../types/auth';

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

  const hasGeneralAccess = !!(
    user.role === 'super_admin' ||
    user.role === 'executive_vice_president' ||
    user.role === 'operations_manager' ||
    user.role === 'accounting_executive' ||
    user.tags?.includes('access:general') ||
    user.tags?.includes('access:commissions:general')
  );

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => {
          // The Driver section is a personal workspace. Supervisors use Logistics.
          if (section.title === 'Driver' && user.role !== 'driver') {
            return false;
          }

          // Hide commissions routes completely from sidebar for general employees
          if (!hasGeneralAccess && (item.path === '/accounting/commissions' || item.path === '/driver/commissions')) {
            return false;
          }

          // Super admin bypasses permission checks except exact-role workspaces above.
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

      <aside className={`fixed left-0 top-0 bottom-0 jvd w-64 bg-surface border-r border-border flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
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
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border shrink-0">
          <img
            src="/JVD 3D.png"
            alt="JVD Logo"
            className="h-8 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <p className="text-sm font-semibold text-ink leading-none select-none">{systemName}</p>
            <p className="text-[11px] text-muted mt-0.5">Management Platform</p>
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
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted hover:text-ink transition-colors"
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
                            `relative flex items-center gap-3 px-3 py-2 rounded-[var(--radius-control)] text-sm transition-colors ${isActive
                              ? 'bg-surface-muted text-ink font-medium'
                              : 'text-muted hover:bg-surface-muted hover:text-ink'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand rounded-r-full" />
                              )}
                              <span className={`text-[17px] shrink-0 ${isActive ? 'text-brand' : ''}`}>{item.icon}</span>
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
        <div className="px-4 py-3 border-t border-border shrink-0">
          <p className="text-[11px] text-muted text-center">JVD Event & Travel Management Co.</p>
        </div>
      </aside>
    </>
  );
}

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Sidebar, { navigation } from './Sidebar';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';
import { Suspense, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/** Lightweight in-content fallback while a lazily-loaded route chunk resolves (roadmap 3.4).
 *  Constrained to the content area so the sidebar/header shell stays put. */
function RouteFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-600" />
    </div>
  );
}

/**
 * PageWrapper wraps all authenticated pages with the sidebar + header shell.
 */
export default function PageWrapper() {
  const { theme } = useTheme();
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filter navigation sections based on permission & role (mirroring Sidebar logic)
  const filteredNavigation = user
    ? navigation
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (item.module) return hasPermission(item.module, 'can_view');
            return item.roles.includes(user.role);
          }),
        }))
        .filter((section) => section.items.length > 0)
    : [];

  // Determine active section (department) based on current route path
  const currentPath = location.pathname;
  let activeSection = filteredNavigation.find(
    (section) =>
      section.title !== 'Overview' &&
      section.items.some((item) => currentPath.startsWith(item.path))
  );

  // If we are on /dashboard or an unrecognized route, default to the first available non-Overview department section
  if (!activeSection && user) {
    activeSection = filteredNavigation.find((section) => section.title !== 'Overview');
  }

  // Find the Dashboard/Home item
  const dashboardItem = filteredNavigation
    .find((s) => s.title === 'Overview')
    ?.items.find((item) => item.path === '/dashboard');

  // Build the bottom navigation items list
  const bottomNavItems = [];
  if (dashboardItem) {
    bottomNavItems.push({
      label: 'Home',
      path: dashboardItem.path,
      icon: dashboardItem.icon,
    });
  }

  if (activeSection) {
    const sectionItems = activeSection.items
      .filter((item) => item.path !== '/dashboard')
      .slice(0, 4) // Show up to 4 items from the active department to prevent overcrowding
      .map((item) => ({
        label: item.label,
        path: item.path,
        icon: item.icon,
      }));
    bottomNavItems.push(...sectionItems);
  }

  return (
    <div className={`h-screen overflow-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <main className="md:ml-64 pt-16 pb-20 md:pb-0 h-screen overflow-y-auto">
        <div className="px-4 md:px-8 py-6 md:py-10">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center z-40 px-2 pb-safe shadow-lg">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 h-full touch-target transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`
            }
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-[9px] font-medium tracking-tight whitespace-nowrap text-center max-w-[60px] truncate">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

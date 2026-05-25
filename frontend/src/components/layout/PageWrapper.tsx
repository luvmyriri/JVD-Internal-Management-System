import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';
import { useState } from 'react';
import { LuLayoutDashboard, LuReceipt, LuFileText, LuMenu } from 'react-icons/lu';

/**
 * PageWrapper wraps all authenticated pages with the sidebar + header shell.
 */
export default function PageWrapper() {
  const { theme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={`h-screen overflow-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <main className="md:ml-64 pt-16 pb-20 md:pb-0 h-screen overflow-y-auto">
        <div className="px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center z-40 px-2 pb-safe">
        <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full touch-target transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
          <LuLayoutDashboard className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>
        <NavLink to="/accounting/pos" className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full touch-target transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
          <LuReceipt className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">POS</span>
        </NavLink>
        <NavLink to="/accounting/billing" className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full touch-target transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
          <LuFileText className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Billing</span>
        </NavLink>
        <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center justify-center w-16 h-full touch-target transition-colors text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
          <LuMenu className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </div>
  );
}

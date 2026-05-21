import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

/**
 * PageWrapper wraps all authenticated pages with the sidebar + header shell.
 */
export default function PageWrapper() {
  const { theme } = useTheme();

  return (
    <div className={`h-screen overflow-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16 h-screen overflow-y-auto">
        <div className="px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

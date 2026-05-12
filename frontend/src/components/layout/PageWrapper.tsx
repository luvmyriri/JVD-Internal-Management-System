import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * PageWrapper wraps all authenticated pages with the sidebar + header shell.
 */
export default function PageWrapper() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16 px-8 py-10 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

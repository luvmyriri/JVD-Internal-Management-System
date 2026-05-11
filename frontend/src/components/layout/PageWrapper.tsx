import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * PageWrapper wraps all authenticated pages with the sidebar + header shell.
 */
export default function PageWrapper() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Sidebar />
      <Header />
      <main className="ml-64 p-6">
        <Outlet />
      </main>
    </div>
  );
}

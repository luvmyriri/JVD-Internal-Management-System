import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { LuSun, LuMoon, LuHouse } from 'react-icons/lu';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [landingPage, setLandingPage] = useState('/dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('jvd_landing_page');
    if (saved) {
      setLandingPage(saved);
    }
  }, []);

  const handleLandingPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setLandingPage(value);
    localStorage.setItem('jvd_landing_page', value);
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl max-w-2xl mx-auto">
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">System Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-medium">Manage your portal appearance and theme settings here.</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'}`}>
              {theme === 'dark' ? <LuMoon className="w-6 h-6" /> : <LuSun className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Switch between light and dark themes.</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-emerald-500 text-white">
              <LuHouse className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Landing Page</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Set your default start page upon login.</p>
            </div>
          </div>
          <div className="relative">
            <select
              value={landingPage}
              onChange={handleLandingPageChange}
              className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-4 pr-10 py-2 transition-colors cursor-pointer outline-none"
            >
              <option value="/dashboard">Dashboard</option>
              <option value="/accounting/billing">Accounting / Billing</option>
              <option value="/procurement/overview">Procurement / Overview</option>
              <option value="/inventory/supplies">Inventory / Supplies</option>
              <option value="/travel/passporting">Travel / Passporting</option>
              <option value="/hr/employees">HR / Employees</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">JVD ETMS v1.2.0-stable</p>
      </div>
    </div>
  );
}

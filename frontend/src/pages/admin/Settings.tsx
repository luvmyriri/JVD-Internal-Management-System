import { useTheme } from '../../context/ThemeContext';
import { LuSun, LuMoon, LuPalette, LuShield, LuMonitor } from 'react-icons/lu';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl max-w-2xl mx-auto">
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">System Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-medium">Manage your portal appearance and theme settings here.</p>

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

      <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">JVD ETMS v1.2.0-stable</p>
      </div>
    </div>
  );
}

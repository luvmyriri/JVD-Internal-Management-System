import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getInitials, getAvatarUrl } from '../../utils';
import { LuBell, LuChevronDown, LuLogOut, LuUser, LuSettings } from 'react-icons/lu';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const initials = getInitials(user.first_name, user.last_name);

  // Determine page title and subtitle based on path
  const getPageContext = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return {
        title: 'Dashboard',
        subtitle: `Welcome back, ${user.first_name} ${user.last_name}. Here's what's happening.`
      };
    }

    if (path === '/profile') {
      return {
        title: 'Account Settings',
        subtitle: 'Manage your personal information and preferences.'
      };
    }
    
    // Map other paths (simplified)
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return { title: '', subtitle: '' };

    if (path.startsWith('/travel/customers/') && !isNaN(Number(segments[segments.length - 1]))) {
      return {
        title: 'Customer Profile',
        subtitle: 'Management / Travel'
      };
    }

    const format = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    return {
      title: format(segments[segments.length - 1]),
      subtitle: segments.length > 1 ? `Management / ${format(segments[0])}` : 'Internal Management System'
    };
  };

  const { title, subtitle } = getPageContext();

  return (
    <header className={`h-16 border-b flex items-center justify-between px-8 ml-64 fixed top-0 right-0 left-0 z-20 transition-colors ${
      theme === 'dark' 
        ? 'bg-gray-900 border-gray-800' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Left: page context */}
      <div className="flex flex-col">
        <h1 className={`text-lg font-bold leading-none tracking-tight ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-[11px] mt-1 font-medium truncate max-w-[400px] ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          id="header-notifications"
          className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          title="Notifications"
        >
          <LuBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            id="header-user-menu"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center shrink-0">
              {user.avatar_url ? (
                <img src={getAvatarUrl(user.avatar_url) || ''} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">{initials}</span>
              )}
            </div>
            {/* Role Display */}
            <div className="hidden sm:block text-right mr-1">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                {user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">Authorized Session</p>
            </div>
            <LuChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border z-20 py-1 overflow-hidden ${
                theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
              }`}>
                <div className={`px-4 py-3 border-b ${
                  theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{user.first_name} {user.last_name}</p>
                  <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{user.email}</p>
                </div>
                <button
                  id="header-profile"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <LuUser className="w-4 h-4 text-blue-600" />
                  My Profile
                </button>
                <button
                  id="header-settings"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/admin/settings');
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                    theme === 'dark' 
                      ? 'text-gray-300 hover:bg-gray-800' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LuSettings className="w-4 h-4 text-blue-600" />
                  Settings
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  id="header-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LuLogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../../utils';
import { LuBell, LuChevronDown, LuLogOut } from 'react-icons/lu';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const initials = getInitials(user.first_name, user.last_name);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 ml-64 fixed top-0 right-0 left-0 z-20">
      {/* Left: page context (empty, page title is in the page itself) */}
      <div />

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
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-gray-100 transition"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            {/* Name & email */}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-none">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{user.email}</p>
            </div>
            <LuChevronDown className="w-4 h-4 text-gray-400 ml-1" />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
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

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../../constants';
import { getInitials } from '../../utils';
import { LuLogOut, LuBell } from 'react-icons/lu';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 ml-64 sticky top-0 z-20">
      {/* Left: Breadcrumb area (placeholder) */}
      <div />

      {/* Right: Actions + User */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          id="header-notifications"
          className="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
          title="Notifications"
        >
          <LuBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-xs font-semibold text-white">
              {getInitials(user.first_name, user.last_name)}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-200 leading-none">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {ROLE_LABELS[user.role] || user.role}
            </p>
          </div>
          <button
            id="header-logout"
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
            title="Sign Out"
          >
            <LuLogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

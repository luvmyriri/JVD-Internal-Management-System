import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LuUsers,
  LuDollarSign,
  LuUserCheck,
  LuTrendingUp,
  LuArrowUpRight,
  LuPlus,
  LuActivity,
  LuFileText,
  LuSettings,
  LuCircle,
} from 'react-icons/lu';

const stats = [
  {
    label: 'Total Employees',
    value: '234',
    change: '+12%',
    icon: <LuUsers className="w-6 h-6 text-white" />,
    iconBg: 'bg-blue-500',
    positive: true,
  },
  {
    label: 'Monthly Revenue',
    value: '₱2.3M',
    change: '+8%',
    icon: <LuDollarSign className="w-6 h-6 text-white" />,
    iconBg: 'bg-emerald-500',
    positive: true,
  },
  {
    label: 'Active Agents',
    value: '89',
    change: '+5%',
    icon: <LuUserCheck className="w-6 h-6 text-white" />,
    iconBg: 'bg-violet-500',
    positive: true,
  },
  {
    label: 'Total Customers',
    value: '1,456',
    change: '+15%',
    icon: <LuTrendingUp className="w-6 h-6 text-white" />,
    iconBg: 'bg-orange-500',
    positive: true,
  },
];

const recentActivity = [
  { id: 1, label: 'Activity item 1', time: '2 hours ago' },
  { id: 2, label: 'Activity item 2', time: '2 hours ago' },
  { id: 3, label: 'Activity item 3', time: '2 hours ago' },
  { id: 4, label: 'Activity item 4', time: '2 hours ago' },
];

const quickActions = [
  { label: 'Add New User', icon: <LuPlus className="w-4 h-4" />, path: '/admin/users' },
  { label: 'Generate Report', icon: <LuActivity className="w-4 h-4" />, path: '/accounting/reports' },
  { label: 'View Analytics', icon: <LuFileText className="w-4 h-4" />, path: '/accounting/reports' },
  { label: 'Settings', icon: <LuSettings className="w-4 h-4" />, path: '/admin/settings' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-sm`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-bold flex items-center gap-0.5 ${stat.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                <LuArrowUpRight className="w-3.5 h-3.5" />
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-5">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 group">
                <div className="mt-1 shrink-0">
                  <LuCircle className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors cursor-pointer">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-all text-xs font-semibold text-center group"
              >
                <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

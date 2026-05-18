import {
  LuShoppingCart,
  LuTruck,
  LuClock,
  LuArrowUpRight,
  LuArrowDownRight,
  LuShieldCheck,
  LuShieldAlert,
  LuLoaderCircle,
} from 'react-icons/lu';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

export interface ProcurementStats {
  stats: {
    active_pos: number;
    total_suppliers: number;
    pending_pos: number;
    pending_accreditations: number;
    active_accreditations: number;
  };
  volume: { name: string; pos: number }[];
  distribution: { name: string; value: number }[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function ProcurementOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-overview'],
    queryFn: () => api.get<{ data: ProcurementStats }>('/procurement/overview'),
    refetchInterval: 60000,
  });

  const statsData = data?.data?.data;

  const stats = [
    { label: 'Active POs', value: statsData?.stats.active_pos ?? 0, change: '+0', positive: true, icon: <LuShoppingCart />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Suppliers', value: statsData?.stats.total_suppliers ?? 0, change: '+0', positive: true, icon: <LuTruck />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending POs', value: statsData?.stats.pending_pos ?? 0, change: '0', positive: true, icon: <LuClock />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending KYC / Accreditations', value: statsData?.stats.pending_accreditations ?? 0, change: '+0', positive: false, icon: <LuShieldAlert />, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Active Accreditations', value: statsData?.stats.active_accreditations ?? 0, change: '+0', positive: true, icon: <LuShieldCheck />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LuLoaderCircle className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div className="px-2 py-1 bg-gray-50 dark:bg-gray-800/60 rounded-full text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {stat.positive ? <LuArrowUpRight /> : <LuArrowDownRight />}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PO Volume Chart */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">Weekly PO Volume</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData?.volume ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="pos" fill="#3b82f6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">Top Suppliers (POs)</h2>
          <div className="h-[300px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statsData?.distribution ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {(statsData?.distribution ?? []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-8 w-1/3">
              {(statsData?.distribution ?? []).map((item: any, index: number) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase truncate" title={item.name}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-overview'],
    queryFn: () => api.get<{ data: ProcurementStats }>('/procurement/overview'),
    refetchInterval: 60000,
  });

  const statsData = data?.data?.data;

  const stats = [
    { label: 'Active POs', value: statsData?.stats.active_pos ?? 0, change: '+0', positive: true, icon: <LuShoppingCart />, gradient: 'from-blue-500 to-blue-700', shadow: 'shadow-lg shadow-blue-300/30 dark:shadow-blue-900/30' },
    { label: 'Total Suppliers', value: statsData?.stats.total_suppliers ?? 0, change: '+0', positive: true, icon: <LuTruck />, gradient: 'from-indigo-500 to-indigo-700', shadow: 'shadow-lg shadow-indigo-300/30 dark:shadow-indigo-900/30' },
    { label: 'Pending POs', value: statsData?.stats.pending_pos ?? 0, change: '0', positive: true, icon: <LuClock />, gradient: 'from-amber-400 to-orange-600', shadow: 'shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30' },
    { label: 'Pending KYC / Accreditations', value: statsData?.stats.pending_accreditations ?? 0, change: '+0', positive: false, icon: <LuShieldAlert />, gradient: 'from-red-500 to-rose-600', shadow: 'shadow-lg shadow-red-300/30 dark:shadow-red-900/30' },
    { label: 'Active Accreditations', value: statsData?.stats.active_accreditations ?? 0, change: '+0', positive: true, icon: <LuShieldCheck />, gradient: 'from-emerald-400 to-teal-600', shadow: 'shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30' },
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
          <div key={stat.label} className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} text-white p-6 rounded-[2rem] ${stat.shadow} hover:scale-[1.02] transition-all group cursor-default`}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 rounded-2xl bg-white/20 text-white transition-transform group-hover:scale-110">
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-white flex items-center gap-1">
                {stat.positive ? <LuArrowUpRight /> : <LuArrowDownRight />}
                {stat.change}
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-white tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PO Volume Chart */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">Weekly PO Volume</h2>
          <div className="h-[300px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={statsData?.volume ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="pos" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">Top Suppliers (POs)</h2>
          <div className="h-[300px] w-full flex items-center">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
            )}
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

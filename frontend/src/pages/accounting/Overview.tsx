import { useState, useEffect } from 'react';
import {
  LuFileText,
  LuTrendingUp,
  LuTrendingDown,
  LuDollarSign,
  LuArrowUpRight,
  LuActivity,
} from 'react-icons/lu';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { billingApi } from '../../api/billing';

export default function AccountingOverview() {
  const [isMounted, setIsMounted] = useState(false);
  const [kpis, setKpis] = useState({
    revenue: 0,
    transactions: 0,
    avg_ticket: 0,
    profit_margin: 0
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await billingApi.getReportsSummary('month');
      const data = res.data.data;
      
      setKpis(data.kpis);
      
      const mappedTrend = data.trend.map((t: any) => ({
        name: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        revenue: parseFloat(t.total),
      }));
      setTrendData(mappedTrend);

      const mappedCategories = data.categories.map((c: any) => ({
        name: c.category || 'Uncategorized',
        value: parseFloat(c.total),
      }));
      setCategoryData(mappedCategories);
      
    } catch (error) {
      console.error("Failed to fetch overview data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `₱${(val / 1000).toFixed(1)}K`;
    return `₱${val.toLocaleString()}`;
  };

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(kpis.revenue), change: '+12.5%', positive: true, icon: <LuDollarSign />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Transactions', value: kpis.transactions.toString(), change: '+8.4%', positive: true, icon: <LuActivity />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Ticket Size', value: formatCurrency(kpis.avg_ticket), change: '+2.4%', positive: true, icon: <LuTrendingUp />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Net Profit (Est)', value: formatCurrency(kpis.revenue * kpis.profit_margin), change: '+18.2%', positive: true, icon: <LuFileText />, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading overview data...</div>;
  }

  return (
    <div className="space-y-10 pb-12">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${stat.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.positive ? <LuArrowUpRight /> : <LuTrendingDown />}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Financial Pulse</h2>
              <p className="text-[11px] text-gray-400 font-medium">Daily revenue trend for the month</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₱${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 800, color: '#111827' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Revenue by Category</h2>
              <p className="text-[11px] text-gray-400 font-medium">Distribution of billing by service category</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₱${val/1000}k`} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

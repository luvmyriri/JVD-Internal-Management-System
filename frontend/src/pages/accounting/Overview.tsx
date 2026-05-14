import {
  LuFileText,
  LuTrendingUp,
  LuTrendingDown,
  LuDollarSign,
  LuArrowUpRight,
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

const stats = [
  { label: 'Total Revenue', value: '₱4.2M', change: '+12.5%', positive: true, icon: <LuDollarSign />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Outstanding', value: '₱850K', change: '+2.4%', positive: false, icon: <LuFileText />, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Net Profit', value: '₱1.8M', change: '+18.2%', positive: true, icon: <LuTrendingUp />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Expenses', value: '₱2.4M', change: '-4.1%', positive: true, icon: <LuTrendingDown />, color: 'text-rose-600', bg: 'bg-rose-50' },
];

const revenueData = [
  { name: 'Mon', revenue: 120000, expenses: 80000 },
  { name: 'Tue', revenue: 150000, expenses: 95000 },
  { name: 'Wed', revenue: 110000, expenses: 75000 },
  { name: 'Thu', revenue: 190000, expenses: 110000 },
  { name: 'Fri', revenue: 240000, expenses: 130000 },
  { name: 'Sat', revenue: 180000, expenses: 90000 },
  { name: 'Sun', revenue: 140000, expenses: 85000 },
];

export default function AccountingOverview() {
  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
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
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Financial Pulse</h2>
              <p className="text-[11px] text-gray-400 font-medium">Daily revenue vs operational expenses</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Invoice Status</h2>
              <p className="text-[11px] text-gray-400 font-medium">Distribution of billing by department</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Travel', value: 400 },
                { name: 'Procure', value: 300 },
                { name: 'Inventory', value: 200 },
                { name: 'HR', value: 100 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {[0, 1, 2, 3].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

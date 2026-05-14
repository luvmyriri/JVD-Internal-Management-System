import {
  LuShoppingCart,
  LuTruck,
  LuClock,
  LuArrowUpRight,
  LuShieldCheck,
  LuShieldAlert,
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

const stats = [
  { label: 'Active POs', value: '142', change: '+8', positive: true, icon: <LuShoppingCart />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Total Suppliers', value: '48', change: '+2', positive: true, icon: <LuTruck />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Pending POs', value: '12', change: '-3', positive: true, icon: <LuClock />, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Pending KYC / Accreditations', value: '8', change: '+2', positive: false, icon: <LuShieldAlert />, color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Active Accreditations', value: '40', change: '+5', positive: true, icon: <LuShieldCheck />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const categoryData = [
  { name: 'Vehicle Parts', value: 45 },
  { name: 'Office Supplies', value: 25 },
  { name: 'Electronics', value: 20 },
  { name: 'Maintenance', value: 10 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function ProcurementOverview() {
  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div className="px-2 py-1 bg-gray-50 rounded-full text-[10px] font-bold text-gray-500 flex items-center gap-1">
                <LuArrowUpRight />
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
        {/* PO Volume Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Order Volume</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'W1', pos: 20 },
                { name: 'W2', pos: 35 },
                { name: 'W3', pos: 42 },
                { name: 'W4', pos: 30 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="pos" fill="#3b82f6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Expense Distribution</h2>
          <div className="h-[300px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-8">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-[10px] font-bold text-gray-600 uppercase">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

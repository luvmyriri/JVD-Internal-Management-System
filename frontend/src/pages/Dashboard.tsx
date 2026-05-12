import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LuUsers,
  LuDollarSign,
  LuShoppingCart,
  LuPackage,
  LuGlobe,
  LuArrowUpRight,
  LuActivity,
  LuCircle,
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
  LineChart,
  Line,
} from 'recharts';

// Mock data for different branches
const branchData = {
  accounting: [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 5000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
    { name: 'Sun', value: 3490 },
  ],
  procurement: [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 19 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 22 },
    { name: 'Fri', value: 30 },
    { name: 'Sat', value: 10 },
    { name: 'Sun', value: 18 },
  ],
  inventory: [
    { name: 'Mon', value: 85 },
    { name: 'Tue', value: 88 },
    { name: 'Wed', value: 82 },
    { name: 'Thu', value: 90 },
    { name: 'Fri', value: 95 },
    { name: 'Sat', value: 80 },
    { name: 'Sun', value: 85 },
  ],
  travel: [
    { name: 'Mon', value: 5 },
    { name: 'Tue', value: 8 },
    { name: 'Wed', value: 12 },
    { name: 'Thu', value: 7 },
    { name: 'Fri', value: 15 },
    { name: 'Sat', value: 20 },
    { name: 'Sun', value: 12 },
  ],
};

const mainChartData = [
  { name: 'Jan', revenue: 1.2, performance: 0.8 },
  { name: 'Feb', revenue: 1.5, performance: 1.1 },
  { name: 'Mar', revenue: 1.3, performance: 0.9 },
  { name: 'Apr', revenue: 1.8, performance: 1.4 },
  { name: 'May', revenue: 2.1, performance: 1.7 },
  { name: 'Jun', revenue: 2.3, performance: 1.9 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="space-y-10 pb-12 pt-4">
      {/* Top Row: Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-xl transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
              <LuUsers className="w-6 h-6" />
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
              <LuArrowUpRight className="w-3 h-3" />
              +12%
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Employees</p>
            <p className="text-3xl font-black text-gray-900">234</p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-xl transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
              <LuDollarSign className="w-6 h-6" />
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
              <LuArrowUpRight className="w-3 h-3" />
              +8%
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Monthly Revenue</p>
            <p className="text-3xl font-black text-gray-900">₱2.3M</p>
          </div>
        </div>

        {/* Active Agents */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-xl transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform">
              <LuActivity className="w-6 h-6" />
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
              <LuArrowUpRight className="w-3 h-3" />
              +5%
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Active Agents</p>
            <p className="text-3xl font-black text-gray-900">89</p>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-xl transition-all group">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
              <LuGlobe className="w-6 h-6" />
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
              <LuArrowUpRight className="w-3 h-3" />
              +15%
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Customers</p>
            <p className="text-3xl font-black text-gray-900">1,456</p>
          </div>
        </div>
      </div>

      {/* Main Performance Graph */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">System Performance</h2>
            <p className="text-xs text-gray-400 font-medium mt-1">Consolidated revenue overview in Millions (PHP)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue</span>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mainChartData}>
              <defs>
                <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                labelStyle={{ fontWeight: 800, color: '#1e293b' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorMain)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch Specific Grid */}
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] px-2">Branch Performance Matrix</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Accounting Branch */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer" onClick={() => navigate('/accounting/billing')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuDollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Accounting</p>
              <p className="text-xl font-black text-gray-900">₱4.2M</p>
            </div>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData.accounting}>
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Procurement Branch */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer" onClick={() => navigate('/procurement/purchase-orders')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuShoppingCart className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Procurement</p>
              <p className="text-xl font-black text-gray-900">142 POs</p>
            </div>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={branchData.procurement}>
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Branch */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer" onClick={() => navigate('/inventory/supplies')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuPackage className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Inventory</p>
              <p className="text-xl font-black text-gray-900">92% Stock</p>
            </div>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={branchData.inventory}>
                <Line type="stepAfter" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Travel Branch */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer" onClick={() => navigate('/travel/customers')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuGlobe className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">Travel</p>
              <p className="text-xl font-black text-gray-900">24 Bookings</p>
            </div>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={branchData.travel}>
                <Area type="basis" dataKey="value" stroke="#f43f5e" fill="#ffe4e6" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

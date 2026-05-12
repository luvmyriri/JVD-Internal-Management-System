import { useState } from 'react';
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
  LuDownload,
  LuFileText,
  LuFileSpreadsheet,
  LuSettings,
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
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF for autotable support
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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

  const mainChartData = {
    Day: [
      { name: '8 AM', revenue: 100000 },
      { name: '10 AM', revenue: 300000 },
      { name: '12 PM', revenue: 500000 },
      { name: '2 PM', revenue: 400000 },
      { name: '4 PM', revenue: 800000 },
      { name: '6 PM', revenue: 600000 },
    ],
    Week: [
      { name: 'Mon', revenue: 1200000 },
      { name: 'Tue', revenue: 1500000 },
      { name: 'Wed', revenue: 1100000 },
      { name: 'Thu', revenue: 1800000 },
      { name: 'Fri', revenue: 2100000 },
      { name: 'Sat', revenue: 2300000 },
      { name: 'Sun', revenue: 1900000 },
    ],
    Month: [
      { name: 'Jan', revenue: 1200000 },
      { name: 'Feb', revenue: 1500000 },
      { name: 'Mar', revenue: 1300000 },
      { name: 'Apr', revenue: 1800000 },
      { name: 'May', revenue: 2100000 },
      { name: 'Jun', revenue: 2300000 },
    ],
    Year: [
      { name: '2021', revenue: 10500000 },
      { name: '2022', revenue: 12800000 },
      { name: '2023', revenue: 15200000 },
      { name: '2024', revenue: 18500000 },
      { name: '2025', revenue: 22100000 },
      { name: '2026', revenue: 12800000 },
    ],
  };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<keyof typeof mainChartData>('Month');

  const exportToPDF = (title: string, data: any[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("JVD INTERNAL MANAGEMENT SYSTEM", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Official Branch Report: ${title}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);
    
    doc.autoTable({
      head: [Object.keys(data[0]).map(k => k.toUpperCase())],
      body: data.map(obj => Object.values(obj)),
      startY: 45,
      theme: 'grid',
      headStyles: { fillStyle: '#2563eb', textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillStyle: '#f8fafc' },
    });
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_report.pdf`);
  };

  const exportToExcel = (title: string, data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Branch Data");
    XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '_')}_report.xlsx`);
  };

  if (!user) return null;

  const DownloadActions = ({ title, data }: { title: string; data: any[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div 
        className="relative flex items-center"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="p-2 hover:bg-slate-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all opacity-0 group-hover:opacity-100"
        >
          <LuDownload className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in slide-in-from-top-1">
            <button 
              onClick={(e) => { e.stopPropagation(); exportToPDF(title, data); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
            >
              <LuFileText className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); exportToExcel(title, data); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2 transition-colors"
            >
              <LuFileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-12 pt-4">
      {/* Top Row: Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-xl transition-all group relative">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
              <LuUsers className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +12%
              </div>
              <DownloadActions title="Global Personnel" data={[{ Category: 'Total Employees', Value: 234, Growth: '+12%', Timestamp: new Date().toISOString() }]} />
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
            <div className="flex flex-col items-end gap-2">
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +8%
              </div>
              <DownloadActions title="Revenue Metrics" data={[{ Category: 'Monthly Revenue', Value: '₱2.3M', Growth: '+8%', Timestamp: new Date().toISOString() }]} />
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
            <div className="flex flex-col items-end gap-2">
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +5%
              </div>
              <DownloadActions title="Agent Activity" data={[{ Category: 'Active Agents', Value: 89, Growth: '+5%', Timestamp: new Date().toISOString() }]} />
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
            <div className="flex flex-col items-end gap-2">
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
                <LuArrowUpRight className="w-3 h-3" />
                +15%
              </div>
              <DownloadActions title="Customer Base" data={[{ Category: 'Total Customers', Value: 1456, Growth: '+15%', Timestamp: new Date().toISOString() }]} />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Customers</p>
            <p className="text-3xl font-black text-gray-900">1,456</p>
          </div>
        </div>
      </div>

      {/* Main Performance Graph */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 group">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">System Performance</h2>
              <DownloadActions title="System Performance Summary" data={mainChartData[activeFilter]} />
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">Consolidated revenue overview in Millions (PHP)</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              {(['Day', 'Week', 'Month', 'Year'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeFilter === filter
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue</span>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mainChartData[activeFilter]} key={activeFilter}>
              <defs>
                <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                domain={[0, 'auto']}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000)}K`;
                  return value;
                }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                labelStyle={{ fontWeight: 800, color: '#1e293b' }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorMain)"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch Specific Grid */}
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] px-2">Branch Performance Matrix</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Accounting Branch */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative" onClick={() => navigate('/accounting/billing')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuDollarSign className="w-6 h-6" />
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Accounting</p>
              <p className="text-xl font-black text-gray-900">₱4.2M</p>
              <DownloadActions title="Accounting Branch Report" data={branchData.accounting} />
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
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative" onClick={() => navigate('/procurement/purchase-orders')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuShoppingCart className="w-6 h-6" />
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Procurement</p>
              <p className="text-xl font-black text-gray-900">142 POs</p>
              <DownloadActions title="Procurement Branch Report" data={branchData.procurement} />
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
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative" onClick={() => navigate('/inventory/supplies')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuPackage className="w-6 h-6" />
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Inventory</p>
              <p className="text-xl font-black text-gray-900">92% Stock</p>
              <DownloadActions title="Inventory Branch Report" data={branchData.inventory} />
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
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative" onClick={() => navigate('/travel/customers')}>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
              <LuGlobe className="w-6 h-6" />
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">Travel</p>
              <p className="text-xl font-black text-gray-900">24 Bookings</p>
              <DownloadActions title="Travel Branch Report" data={branchData.travel} />
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

      {/* Bottom Section: Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 group relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Recent Activity</h3>
              <DownloadActions 
                title="Recent Operational Activity" 
                data={[
                  { Action: 'Operation #1025', User: 'Admin', Status: 'Success', Timestamp: '2 hours ago' },
                  { Action: 'Operation #1026', User: 'HR', Status: 'Pending', Timestamp: '1 hour ago' },
                  { Action: 'Operation #1027', User: 'Accounting', Status: 'Success', Timestamp: '30 mins ago' },
                  { Action: 'Operation #1028', User: 'Agent', Status: 'Updated', Timestamp: 'Just now' },
                ]} 
              />
            </div>
            <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline transition-all">View Full Log</button>
          </div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 group/item">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-blue-50 group-hover/item:text-blue-600 transition-colors">
                  <LuCircle className="w-2.5 h-2.5 fill-current" />
                </div>
                <div className="flex-1 border-b border-gray-50 pb-4 group-last:border-0">
                  <p className="text-sm font-bold text-gray-800">Operational Update #{1024 + i}</p>
                  <p className="text-xs text-gray-400 mt-0.5">System synchronized with branch node {i}</p>
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">2 hours ago</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8 text-center">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all group">
              <div className="p-3 rounded-xl bg-white shadow-sm text-slate-400 group-hover:text-blue-600 transition-colors">
                <LuUsers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">New User</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-white hover:shadow-xl transition-all group">
              <div className="p-3 rounded-xl bg-white shadow-sm text-slate-400 group-hover:text-emerald-600 transition-colors">
                <LuFileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Report</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-white hover:shadow-xl transition-all group">
              <div className="p-3 rounded-xl bg-white shadow-sm text-slate-400 group-hover:text-violet-600 transition-colors">
                <LuActivity className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Analytics</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-orange-200 hover:bg-white hover:shadow-xl transition-all group">
              <div className="p-3 rounded-xl bg-white shadow-sm text-slate-400 group-hover:text-orange-600 transition-colors">
                <LuSettings className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

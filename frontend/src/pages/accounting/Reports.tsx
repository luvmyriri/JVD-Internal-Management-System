import { useState, useEffect } from 'react';
import { 
  LuFileSpreadsheet, LuFileText, LuCalendar,
  LuTrendingUp, LuDollarSign, LuActivity
} from 'react-icons/lu';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { billingApi } from '../../api/billing';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState('month');

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const response = await billingApi.getReportsSummary(range);
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch report summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [range]);

  const exportToExcel = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data.trend);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Trend");
    XLSX.writeFile(wb, `JVD_Financial_Report_${range}.xlsx`);
  };

  const exportToPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("JVD Financial Summary Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Period: ${range.toUpperCase()}`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['KPI', 'Value']],
      body: [
        ['Total Revenue', `PHP ${data.kpis.revenue.toLocaleString()}`],
        ['Transactions', data.kpis.transactions],
        ['Avg Ticket Size', `PHP ${data.kpis.avg_ticket.toLocaleString()}`],
        ['Profit Margin', `${(data.kpis.profit_margin * 100)}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`JVD_Report_${range}.pdf`);
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 mt-10 animate-in fade-in duration-700">
      
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Financial Analytics</h1>
          <p className="text-[11px] text-gray-400 font-bold tracking-widest uppercase mt-1">Intelligence and reporting suite</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            {['month', 'year', 'all'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  range === r 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToPDF}
              className="p-3 bg-white border border-gray-100 rounded-2xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold text-xs"
            >
              <LuFileText className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={exportToExcel}
              className="p-3 bg-white border border-gray-100 rounded-2xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-bold text-xs"
            >
              <LuFileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <LuDollarSign className="w-6 h-6" />
            </div>
            <LuTrendingUp className="text-emerald-500 w-5 h-5" />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
          <h3 className="text-3xl font-black text-gray-900">₱{data?.kpis.revenue.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <LuActivity className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Transactions</p>
          <h3 className="text-3xl font-black text-gray-900">{data?.kpis.transactions}</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <LuCalendar className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Avg Ticket Size</p>
          <h3 className="text-2xl font-black text-gray-900">₱{Math.round(data?.kpis.avg_ticket || 0).toLocaleString()}</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <LuTrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Profit Margin</p>
          <h3 className="text-3xl font-black text-gray-900">{(data?.kpis.profit_margin * 100)}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Revenue Trend Chart */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="mb-10">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Revenue Trajectory</h2>
            <p className="text-[11px] text-gray-400 font-medium">Historical performance over the selected period</p>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₱${val >= 1000 ? val/1000 + 'k' : val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                  labelStyle={{ fontWeight: 800, color: '#111827', marginBottom: '8px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <div className="mb-10">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Service Distribution</h2>
            <p className="text-[11px] text-gray-400 font-medium">Revenue contribution by service category</p>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categories}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `₱${val >= 1000 ? val/1000 + 'k' : val}`} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                <Bar dataKey="total" radius={[15, 15, 0, 0]}>
                  {data?.categories?.map((_entry: any, index: number) => (
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

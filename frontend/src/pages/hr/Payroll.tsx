import { useState } from 'react';
import {
  Wallet,
  Users,
  CalendarDays,
  ClipboardCheck,
  ArrowUpRight,
  FileText,
  Search,
  Download,
  Filter,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Payroll() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'cycles' | 'employees'>('cycles');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const metrics = [
    {
      title: 'Current Cycle Budget',
      value: '₱485,200.00',
      change: '+4.2% vs last period',
      icon: <Wallet className="w-5 h-5 text-emerald-500" />,
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Active Employees',
      value: '48 Staff',
      change: '100% attendance rate',
      icon: <Users className="w-5 h-5 text-blue-500" />,
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Next Release Date',
      value: 'June 15, 2026',
      change: '12 days remaining',
      icon: <CalendarDays className="w-5 h-5 text-amber-500" />,
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Pending Approvals',
      value: '3 Timecards',
      change: 'Requires manager sign-off',
      icon: <ClipboardCheck className="w-5 h-5 text-purple-500" />,
      bg: 'bg-purple-500/10'
    }
  ];

  const cycles = [
    { id: 1, period: 'May 16, 2026 - May 31, 2026', gross: '₱242,600.00', tax: '₱24,260.00', net: '₱218,340.00', status: 'Released', date: 'May 31, 2026' },
    { id: 2, period: 'May 01, 2026 - May 15, 2026', gross: '₱238,400.00', tax: '₱23,840.00', net: '₱214,560.00', status: 'Released', date: 'May 15, 2026' },
    { id: 3, period: 'Apr 16, 2026 - Apr 30, 2026', gross: '₱240,100.00', tax: '₱24,010.00', net: '₱216,090.00', status: 'Released', date: 'Apr 30, 2026' },
  ];

  const employeeRates = [
    { name: 'Maria Santos', role: 'Operations Manager', base: '₱45,000.00', allowances: '₱5,000.00', deductions: '₱4,500.00', net: '₱45,500.00' },
    { name: 'John Doe', role: 'Dispatcher', base: '₱28,000.00', allowances: '₱2,500.00', deductions: '₱2,800.00', net: '₱27,700.00' },
    { name: 'Juana Dela Cruz', role: 'Accounting Executive', base: '₱35,000.00', allowances: '₱3,000.00', deductions: '₱3,500.00', net: '₱34,500.00' },
    { name: 'Alan Turing', role: 'Reservation Officer', base: '₱24,000.00', allowances: '₱2,000.00', deductions: '₱2,400.00', net: '₱23,600.00' },
  ];

  return (
    <div className={`p-8 space-y-8 animate-in fade-in duration-500 min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Payroll Management</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-widest">
            Configure employee compensation, salary disbursements, and tax reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/20 transition-all">
            Run Current Payroll <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((card, idx) => (
          <div
            key={idx}
            className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between group hover:border-blue-500 dark:hover:border-blue-800 transition-all cursor-default"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.title}</span>
              <div className={`p-3 rounded-2xl ${card.bg} transition-colors`}>
                {card.icon}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">{card.value}</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-tight">{card.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Section */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          {/* Tabs */}
          <div className="flex bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 w-fit">
            <button
              onClick={() => setActiveTab('cycles')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'cycles'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Payroll Cycles
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'employees'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Employee Salaries
            </button>
          </div>

          {/* Search / Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search payroll history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-11 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
              />
            </div>
            <button className="flex items-center gap-2 px-5 h-11 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button className="flex items-center gap-2 px-5 h-11 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'cycles' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pay Period</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Payroll</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax Deductions</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Disbursements</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="py-5 font-black text-xs">{cycle.period}</td>
                    <td className="py-5 font-medium text-xs text-gray-500 dark:text-gray-400">{cycle.gross}</td>
                    <td className="py-5 font-medium text-xs text-gray-500 dark:text-gray-400">{cycle.tax}</td>
                    <td className="py-5 font-black text-xs text-emerald-600 dark:text-emerald-400">{cycle.net}</td>
                    <td className="py-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> {cycle.status}
                      </span>
                    </td>
                    <td className="py-5 text-right">
                      <button className="inline-flex items-center gap-1.5 px-4 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                        <FileText className="w-3.5 h-3.5" /> View Slips
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Name</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Salary</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Allowances</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deductions</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Net</th>
                  <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {employeeRates.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                    <td className="py-5 font-black text-xs">{emp.name}</td>
                    <td className="py-5">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg text-[9px] font-black uppercase">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-5 font-medium text-xs text-gray-500 dark:text-gray-400">{emp.base}</td>
                    <td className="py-5 font-medium text-xs text-emerald-600 dark:text-emerald-400">{emp.allowances}</td>
                    <td className="py-5 font-medium text-xs text-rose-500">{emp.deductions}</td>
                    <td className="py-5 font-black text-xs text-blue-600 dark:text-blue-400">{emp.net}</td>
                    <td className="py-5 text-right">
                      <button className="inline-flex items-center gap-1.5 px-4 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                        Edit Schedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

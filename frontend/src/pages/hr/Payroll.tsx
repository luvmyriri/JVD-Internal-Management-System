import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Users,
  CalendarDays,
  ClipboardCheck,
  ArrowUpRight,
  FileText,
  Search,
  CheckCircle,
  Printer,
  Trash2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Modal, Button, StatusBadge } from '../../components/ui';
import { payrollApi } from '../../api/payroll';
import toast from 'react-hot-toast';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

export default function Payroll() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'cycles' | 'employees'>('cycles');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  
  // Selected entities
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  
  // Run Payroll Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Edit Salary Form State
  const [baseSalary, setBaseSalary] = useState<string>('0');
  const [allowances, setAllowances] = useState<string>('0');
  const [deductions, setDeductions] = useState<string>('0');

  // Adjust Payslip Form State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustCommissionPay, setAdjustCommissionPay] = useState('0');
  const [adjustOvertimePay, setAdjustOvertimePay] = useState('0');
  const [adjustHalfDayDeductions, setAdjustHalfDayDeductions] = useState('0');

  // Pre-Payroll Timesheet State
  const [prePayrollAdjustments, setPrePayrollAdjustments] = useState<Record<number, { commission_pay: string; overtime_pay: string; half_day_deductions: string }>>({});
  
  // Sub-modal Search
  const [payslipSearchTerm, setPayslipSearchTerm] = useState('');

  // 1. Fetch Cycles Query
  const { data: cyclesRes, isLoading: cyclesLoading } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: payrollApi.listCycles,
  });
  const cycles = cyclesRes?.data?.data || [];

  // 2. Fetch Employees Query
  const { data: employeesRes, isLoading: employeesLoading } = useQuery({
    queryKey: ['employee-salaries', searchTerm],
    queryFn: () => payrollApi.listEmployees({ search: searchTerm }),
  });
  const employees = employeesRes?.data?.data || [];

  // 3. Fetch Single Cycle Details Query
  const { data: cycleDetailsRes, isLoading: detailsLoading } = useQuery({
    queryKey: ['payroll-cycle-details', selectedCycleId],
    queryFn: () => payrollApi.getCycle(selectedCycleId!),
    enabled: !!selectedCycleId,
  });
  const cycleDetails = cycleDetailsRes?.data?.data;

  // 4. Mutations
  const runPayrollMutation = useMutation({
    mutationFn: payrollApi.runPayroll,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['employee-salaries'] });
      toast.success('Payroll cycle generated successfully.');
      setIsRunModalOpen(false);
      // Automatically show the newly generated cycle details
      if (res.data?.data?.id) {
        setSelectedCycleId(res.data.data.id);
        setIsCycleModalOpen(true);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to run payroll.');
    }
  });

  const updateSalaryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => payrollApi.updateEmployeeSalary(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salaries'] });
      toast.success('Salary profile updated successfully.');
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update salary configuration.');
    }
  });

  const releasePayrollMutation = useMutation({
    mutationFn: payrollApi.releasePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      if (selectedCycleId) {
        queryClient.invalidateQueries({ queryKey: ['payroll-cycle-details', selectedCycleId] });
      }
      toast.success('Payroll cycle and payslips released.');
      setIsCycleModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to release payroll.');
    }
  });

  const adjustPayslipMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => payrollApi.updatePayslip(id, data),
    onSuccess: () => {
      if (selectedCycleId) {
        queryClient.invalidateQueries({ queryKey: ['payroll-cycle-details', selectedCycleId] });
      }
      toast.success('Payslip adjusted successfully.');
      setIsAdjustModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to adjust payslip.');
    }
  });

  const deletePayrollMutation = useMutation({
    mutationFn: payrollApi.deleteCycle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      toast.success('Draft payroll cycle deleted.');
      setIsCycleModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete payroll cycle.');
    }
  });

  // Open run payroll modal and calculate default dates
  const handleOpenRunModal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    if (today.getDate() <= 15) {
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-15`);
    } else {
      setStartDate(`${year}-${month}-16`);
      const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
      setEndDate(`${year}-${month}-${lastDay}`);
    }
    
    setIsRunModalOpen(true);
  };

  const handleRunPayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const adjustmentsPayload = Object.entries(prePayrollAdjustments).map(([userId, adj]) => ({
      user_id: parseInt(userId),
      commission_pay: parseFloat(parseMoneyInput(adj.commission_pay)) || 0,
      overtime_pay: parseFloat(parseMoneyInput(adj.overtime_pay)) || 0,
      half_day_deductions: parseFloat(parseMoneyInput(adj.half_day_deductions)) || 0,
    })).filter(adj => adj.commission_pay > 0 || adj.overtime_pay > 0 || adj.half_day_deductions > 0);

    runPayrollMutation.mutate({
      start_date: startDate,
      end_date: endDate,
      adjustments: adjustmentsPayload
    });
  };

  // Open edit salary modal
  const handleOpenEditModal = (emp: any) => {
    setSelectedEmployee(emp);
    setBaseSalary(emp.salary?.base_salary !== undefined && emp.salary?.base_salary !== null ? formatMoneyInput(parseFloat(emp.salary.base_salary).toString()) : '0');
    setAllowances(emp.salary?.allowances !== undefined && emp.salary?.allowances !== null ? formatMoneyInput(parseFloat(emp.salary.allowances).toString()) : '0');
    setDeductions(emp.salary?.deductions !== undefined && emp.salary?.deductions !== null ? formatMoneyInput(parseFloat(emp.salary.deductions).toString()) : '0');
    setIsEditModalOpen(true);
  };

  const handleEditSalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployee) {
      updateSalaryMutation.mutate({
        id: selectedEmployee.id,
        data: {
          base_salary: parseFloat(parseMoneyInput(baseSalary)) || 0,
          allowances: parseFloat(parseMoneyInput(allowances)) || 0,
          deductions: parseFloat(parseMoneyInput(deductions)) || 0
        }
      });
    }
  };

  const handleOpenAdjustModal = (slip: any) => {
    setSelectedPayslip(slip);
    setAdjustCommissionPay(formatMoneyInput(parseFloat(slip.commission_pay || 0).toString()));
    setAdjustOvertimePay(formatMoneyInput(parseFloat(slip.overtime_pay || 0).toString()));
    setAdjustHalfDayDeductions(formatMoneyInput(parseFloat(slip.half_day_deductions || 0).toString()));
    setIsAdjustModalOpen(true);
  };

  const handleAdjustPayslipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayslip) {
      adjustPayslipMutation.mutate({
        id: selectedPayslip.id,
        data: {
          commission_pay: parseFloat(parseMoneyInput(adjustCommissionPay)) || 0,
          overtime_pay: parseFloat(parseMoneyInput(adjustOvertimePay)) || 0,
          half_day_deductions: parseFloat(parseMoneyInput(adjustHalfDayDeductions)) || 0
        }
      });
    }
  };

  /**
   * M-02: BIR TRAIN Law progressive withholding tax (semi-monthly share).
   * Mirrors the backend computeBirTax() for accurate live preview.
   */
  const computeBirTax = (monthlyBase: number): number => {
    const annual = monthlyBase * 12;
    let annualTax: number;
    if (annual <= 250000) {
      annualTax = 0;
    } else if (annual <= 400000) {
      annualTax = (annual - 250000) * 0.15;
    } else if (annual <= 800000) {
      annualTax = 22500 + (annual - 400000) * 0.20;
    } else if (annual <= 2000000) {
      annualTax = 102500 + (annual - 800000) * 0.25;
    } else if (annual <= 8000000) {
      annualTax = 402500 + (annual - 2000000) * 0.30;
    } else {
      annualTax = 2202500 + (annual - 8000000) * 0.35;
    }
    return Math.round((annualTax / 24) * 100) / 100;
  };

  // Helper formatting functions
  const formatCurrency = (val: any) => {
    const num = parseFloat(val || 0);
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculations for Metrics Cards
  const totalMonthlyBudget = employees.reduce((sum: number, emp: any) => {
    const base = parseFloat(emp.salary?.base_salary || 0);
    const allowances = parseFloat(emp.salary?.allowances || 0);
    return sum + base + allowances;
  }, 0);

  const activeEmployeesCount = employees.length;

  // Next Release Date estimation
  const today = new Date();
  const nextRelease = today.getDate() <= 15 
    ? `${today.toLocaleDateString('en-US', { month: 'long' })} 15, ${today.getFullYear()}`
    : `${today.toLocaleDateString('en-US', { month: 'long' })} ${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}, ${today.getFullYear()}`;

  const daysRemaining = today.getDate() <= 15
    ? 15 - today.getDate()
    : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();

  const draftCyclesCount = cycles.filter((c: any) => c.status === 'draft').length;

  const metrics = [
    {
      title: 'Current Monthly Gross Budget',
      value: formatCurrency(totalMonthlyBudget),
      change: `Est. ${formatCurrency(totalMonthlyBudget / 2)} per cycle`,
      icon: <Wallet className="w-5 h-5 text-emerald-500" />,
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Active Employees',
      value: `${activeEmployeesCount} Staff`,
      change: '100% active state list',
      icon: <Users className="w-5 h-5 text-blue-500" />,
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Next Release Date',
      value: nextRelease,
      change: `${daysRemaining} days remaining`,
      icon: <CalendarDays className="w-5 h-5 text-amber-500" />,
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Pending Approvals',
      value: `${draftCyclesCount} Draft Runs`,
      change: 'Requires administrator release',
      icon: <ClipboardCheck className="w-5 h-5 text-purple-500" />,
      bg: 'bg-purple-500/10'
    }
  ];

  // Filter payslips inside details modal
  const filteredPayslips = cycleDetails?.payslips?.filter((p: any) => {
    const search = payslipSearchTerm.toLowerCase();
    const fullName = `${p.user?.first_name || ''} ${p.user?.last_name || ''}`.toLowerCase();
    const role = (p.user?.role || '').toLowerCase();
    return fullName.includes(search) || role.includes(search);
  }) || [];

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
          <button 
            onClick={handleOpenRunModal}
            className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
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
                placeholder={activeTab === 'cycles' ? "Search cycles..." : "Search employees..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-11 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'cycles' ? (
          <div className="overflow-x-auto">
            {cyclesLoading ? (
              <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">Loading payroll cycles...</div>
            ) : cycles.length === 0 ? (
              <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">No payroll cycles run yet.</div>
            ) : (
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
                  {cycles.map((cycle: any) => (
                    <tr key={cycle.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                      <td className="py-5 font-black text-xs">
                        {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
                      </td>
                      <td className="py-5 font-medium text-xs text-gray-500 dark:text-gray-400">{formatCurrency(cycle.gross_amount)}</td>
                      <td className="py-5 font-medium text-xs text-gray-500 dark:text-gray-400">{formatCurrency(cycle.tax_amount)}</td>
                      <td className="py-5 font-black text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(cycle.net_amount)}</td>
                      <td className="py-5">
                        <StatusBadge 
                          status={cycle.status} 
                          variant={cycle.status === 'released' ? 'success' : 'warning'} 
                        />
                      </td>
                      <td className="py-5 text-right">
                        <button 
                          onClick={() => {
                            setSelectedCycleId(cycle.id);
                            setIsCycleModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Slips
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {employeesLoading ? (
              <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">Loading employee data...</div>
            ) : employees.length === 0 ? (
              <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">No employees found.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Name</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Base Salary</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Allowances</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Deductions</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Monthly Net</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {employees.map((emp: any) => {
                    const base = parseFloat(emp.salary?.base_salary || 0);
                    const allowance = parseFloat(emp.salary?.allowances || 0);
                    const deduction = parseFloat(emp.salary?.deductions || 0);
                    const tax = computeBirTax(base);
                    const net = Math.max(0, base + allowance - tax - deduction);

                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                        <td className="py-5 font-black text-xs">
                          {emp.first_name} {emp.last_name}
                          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{emp.employee_id}</div>
                        </td>
                        <td className="py-5">
                          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg text-[9px] font-black uppercase tracking-tight">
                            {emp.role?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-5 font-medium text-xs text-gray-500 dark:text-gray-400">{formatCurrency(base)}</td>
                        <td className="py-5 font-medium text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(allowance)}</td>
                        <td className="py-5 font-medium text-xs text-rose-500">{formatCurrency(deduction)}</td>
                        <td className="py-5 font-black text-xs text-blue-600 dark:text-blue-400">{formatCurrency(net)}</td>
                        <td className="py-5 text-right">
                          <button 
                            onClick={() => handleOpenEditModal(emp)}
                            className="inline-flex items-center gap-1.5 px-4 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                          >
                            Edit Schedule
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Run Payroll (Pre-Payroll Timesheet) */}
      <Modal isOpen={isRunModalOpen} onClose={() => setIsRunModalOpen(false)} title="Pre-Payroll Timesheet Worksheet" size="full">
        <form onSubmit={handleRunPayrollSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-2xl">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
                  <tr>
                    <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-64">Employee</th>
                    <th className="py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Base/Mo</th>
                    <th className="py-3 px-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Commission (+)</th>
                    <th className="py-3 px-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Overtime (+)</th>
                    <th className="py-3 px-4 text-[10px] font-black text-rose-500 uppercase tracking-widest">Lates / Half Days (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {employees.map((emp: any) => {
                    const adj = prePayrollAdjustments[emp.id] || { commission_pay: '', overtime_pay: '', half_day_deductions: '' };
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                        <td className="py-3 px-4">
                          <div className="font-black text-xs text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{emp.role?.replace(/_/g, ' ')}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-500">
                          {formatCurrency(parseFloat(emp.salary?.base_salary || 0))}
                        </td>
                        <td className="py-2 px-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/50 text-[10px] font-black">₱</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={adj.commission_pay}
                              onChange={(e) => {
                                const clean = parseMoneyInput(e.target.value);
                                if ((clean.split('.').length - 1) > 1) return;
                                setPrePayrollAdjustments(prev => ({
                                  ...prev,
                                  [emp.id]: { ...prev[emp.id], commission_pay: formatMoneyInput(e.target.value) }
                                }));
                              }}
                              className="w-full pl-6 pr-3 h-9 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-emerald-400 placeholder-emerald-600/30"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/50 text-[10px] font-black">₱</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={adj.overtime_pay}
                              onChange={(e) => {
                                const clean = parseMoneyInput(e.target.value);
                                if ((clean.split('.').length - 1) > 1) return;
                                setPrePayrollAdjustments(prev => ({
                                  ...prev,
                                  [emp.id]: { ...prev[emp.id], overtime_pay: formatMoneyInput(e.target.value) }
                                }));
                              }}
                              className="w-full pl-6 pr-3 h-9 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-emerald-400 placeholder-emerald-600/30"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500/50 text-[10px] font-black">₱</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={adj.half_day_deductions}
                              onChange={(e) => {
                                const clean = parseMoneyInput(e.target.value);
                                if ((clean.split('.').length - 1) > 1) return;
                                setPrePayrollAdjustments(prev => ({
                                  ...prev,
                                  [emp.id]: { ...prev[emp.id], half_day_deductions: formatMoneyInput(e.target.value) }
                                }));
                              }}
                              className="w-full pl-6 pr-3 h-9 bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-rose-500 transition-all dark:text-rose-400 placeholder-rose-500/30 text-rose-600"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-bold text-gray-400">
              Leave inputs blank or at 0.00 for employees with no adjustments.
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsRunModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={runPayrollMutation.isPending}>
                Generate Payroll
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit Employee Salary */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Employee Salary Profile" size="md">
        {selectedEmployee && (
          <form onSubmit={handleEditSalarySubmit} className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center font-black text-blue-600 text-lg">
                {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white">{selectedEmployee.first_name} {selectedEmployee.last_name}</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{selectedEmployee.employee_id} • {selectedEmployee.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Monthly Base Salary</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={baseSalary}
                    onChange={(e) => {
                      const clean = parseMoneyInput(e.target.value);
                      if ((clean.split('.').length - 1) > 1) return;
                      const formatted = formatMoneyInput(e.target.value);
                      setBaseSalary(formatted);
                    }}
                    className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Monthly Allowances</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={allowances}
                      onChange={(e) => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setAllowances(formatted);
                      }}
                      className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Monthly Deductions</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={deductions}
                      onChange={(e) => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setDeductions(formatted);
                      }}
                      className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Est. Monthly Net (after BIR tax)</span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400">
                {formatCurrency(Math.max(0, (parseFloat(parseMoneyInput(baseSalary)) || 0) + (parseFloat(parseMoneyInput(allowances)) || 0) - computeBirTax(parseFloat(parseMoneyInput(baseSalary)) || 0) * 2 - (parseFloat(parseMoneyInput(deductions)) || 0)))}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={updateSalaryMutation.isPending}>
                Save Profile
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 3: View Cycle Details & Slips */}
      <Modal 
        isOpen={isCycleModalOpen} 
        onClose={() => {
          setIsCycleModalOpen(false);
          setSelectedCycleId(null);
          setPayslipSearchTerm('');
        }} 
        title="Payroll Cycle Slips" 
        size="xl"
      >
        {detailsLoading ? (
          <div className="py-12 text-center text-gray-500 font-black text-xs uppercase tracking-widest">Loading cycle details...</div>
        ) : !cycleDetails ? (
          <div className="py-12 text-center text-gray-500 font-black text-xs uppercase tracking-widest">No details found.</div>
        ) : (
          <div className="space-y-6">
            
            {/* Header info card */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 gap-4">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Period Coverage</span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                  {formatDate(cycleDetails.start_date)} - {formatDate(cycleDetails.end_date)}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={cycleDetails.status} variant={cycleDetails.status === 'released' ? 'success' : 'warning'} />
                  {cycleDetails.released_at && (
                    <span className="text-[10px] text-gray-400 font-bold">Released on {formatDate(cycleDetails.released_at)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {cycleDetails.status === 'draft' && (
                  <>
                    <Button 
                      variant="danger" 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this draft payroll run?')) {
                          deletePayrollMutation.mutate(cycleDetails.id);
                        }
                      }}
                      isLoading={deletePayrollMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Draft
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => {
                        if (confirm('Are you sure you want to approve and release this payroll cycle? This will lock all calculations.')) {
                          releasePayrollMutation.mutate(cycleDetails.id);
                        }
                      }}
                      isLoading={releasePayrollMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Release Payroll
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Calculations breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Gross Disbursement</span>
                <div className="text-lg font-black text-gray-900 dark:text-white mt-1">{formatCurrency(cycleDetails.gross_amount)}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Tax Withheld</span>
                <div className="text-lg font-black text-gray-900 dark:text-white mt-1">{formatCurrency(cycleDetails.tax_amount)}</div>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/20 rounded-2xl">
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Total Net Paid</span>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(cycleDetails.net_amount)}</div>
              </div>
            </div>

            {/* Payslips List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Individual Payslip Sheets</h4>
                <div className="relative w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search sheets..."
                    value={payslipSearchTerm}
                    onChange={(e) => setPayslipSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                      <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Base</th>
                      <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Allowances</th>
                      <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Withholding Tax</th>
                      <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Deductions</th>
                      <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Net Pay</th>
                      <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
                    {filteredPayslips.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-500 text-xs font-bold uppercase tracking-wider">No payslips found.</td>
                      </tr>
                    ) : (
                      filteredPayslips.map((slip: any) => (
                        <tr key={slip.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                          <td className="py-3 px-4 font-black text-xs">
                            {slip.user?.first_name} {slip.user?.last_name}
                            <div className="text-[9px] text-gray-400 font-semibold mt-0.5">{slip.user?.role?.replace(/_/g, ' ')}</div>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">{formatCurrency(slip.base_salary)}</td>
                          <td className="py-3 px-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(slip.allowances)}</td>
                          <td className="py-3 px-4 text-xs font-medium text-rose-500">{formatCurrency(slip.tax_amount)}</td>
                          <td className="py-3 px-4 text-xs font-medium text-rose-500">{formatCurrency(slip.deductions)}</td>
                          <td className="py-3 px-4 text-xs font-black text-blue-600 dark:text-blue-400">{formatCurrency(slip.net_salary)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {cycleDetails?.status === 'draft' && (
                                <button
                                  onClick={() => handleOpenAdjustModal(slip)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
                                >
                                  Adjust
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedPayslip({ ...slip, cycle: cycleDetails });
                                  setIsPayslipModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                              >
                                <FileText className="w-3 h-3" /> Statement
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button variant="secondary" onClick={() => {
                setIsCycleModalOpen(false);
                setSelectedCycleId(null);
                setPayslipSearchTerm('');
              }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 4: Individual Payslip Sheet Print View */}
      <Modal isOpen={isPayslipModalOpen} onClose={() => setIsPayslipModalOpen(false)} title="Payslip Statement" size="lg">
        {selectedPayslip && (
          <div className="space-y-6">
            
            {/* Printable Payslip Card Container */}
            <div id="printable-payslip" className="p-8 border border-gray-300 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative font-sans">
              
              {/* Company Logo / Header */}
              <div className="flex justify-between items-start border-b border-gray-300 dark:border-gray-800 pb-6 mb-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">JVD Trans Logistics</h2>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Operations & Logistics Services Provider</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[9px] font-black uppercase tracking-widest rounded-lg">
                    Payslip Ref: #{selectedPayslip.id}
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                    Period: {formatDate(selectedPayslip.cycle?.start_date)} - {formatDate(selectedPayslip.cycle?.end_date)}
                  </p>
                </div>
              </div>

              {/* Employee Metadata */}
              <div className="grid grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/60 mb-6">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Employee Name</span>
                  <div className="text-sm font-black mt-0.5">{selectedPayslip.user?.first_name} {selectedPayslip.user?.last_name}</div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mt-3">Employee ID</span>
                  <div className="text-xs font-bold mt-0.5">{selectedPayslip.user?.employee_id || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Department & Role</span>
                  <div className="text-xs font-black mt-0.5 uppercase tracking-wide">{selectedPayslip.user?.department || 'Operations'}</div>
                  <div className="text-[10px] text-blue-500 font-black mt-1 uppercase tracking-widest">{selectedPayslip.user?.role?.replace(/_/g, ' ')}</div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mt-3">Release Status</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedPayslip.status} variant={selectedPayslip.status === 'released' ? 'success' : 'warning'} />
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Earnings Table */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 text-gray-500">
                    Earnings (Credit)
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Basic Pay (Cycle)</span>
                      <span className="font-bold">{formatCurrency(selectedPayslip.base_salary)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Allowances</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(selectedPayslip.allowances)}</span>
                    </div>
                    {parseFloat(selectedPayslip.commission_pay) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Commissions</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(selectedPayslip.commission_pay)}</span>
                      </div>
                    )}
                    {parseFloat(selectedPayslip.overtime_pay) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Overtime Pay</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(selectedPayslip.overtime_pay)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs pt-3 border-t border-dashed border-gray-300 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                      <span>Total Earnings (Gross)</span>
                      <span>{formatCurrency(parseFloat(selectedPayslip.base_salary) + parseFloat(selectedPayslip.allowances) + parseFloat(selectedPayslip.commission_pay || 0) + parseFloat(selectedPayslip.overtime_pay || 0))}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 text-gray-500">
                    Deductions (Debit)
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Withholding Tax (10%)</span>
                      <span className="font-bold text-rose-500">{formatCurrency(selectedPayslip.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">Fixed Deductions</span>
                      <span className="font-bold text-rose-500">{formatCurrency(selectedPayslip.deductions)}</span>
                    </div>
                    {parseFloat(selectedPayslip.half_day_deductions) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Lates / Half Days</span>
                        <span className="font-bold text-rose-500">{formatCurrency(selectedPayslip.half_day_deductions)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs pt-3 border-t border-dashed border-gray-300 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                      <span>Total Deductions</span>
                      <span>{formatCurrency(parseFloat(selectedPayslip.tax_amount) + parseFloat(selectedPayslip.deductions) + parseFloat(selectedPayslip.half_day_deductions || 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Disbursement Summary */}
              <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Net Pay Amount</span>
                  <span className="text-xs text-gray-400 font-semibold italic">Credited via Bank Transfer / Cash Disbursement</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {formatCurrency(selectedPayslip.net_salary)}
                  </span>
                </div>
              </div>

              {/* Footer notes */}
              <div className="mt-8 text-center text-[9px] text-gray-400 font-medium uppercase tracking-wide border-t border-gray-100 dark:border-gray-800 pt-6">
                This is a system-generated statement. No physical signature is required.
              </div>
            </div>

            {/* Print Trigger */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsPayslipModalOpen(false)}>
                Close
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  const printContents = document.getElementById('printable-payslip')?.innerHTML;
                  
                  // Setup clean print layout page
                  if (printContents) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Payslip Statement - JVD Trans Logistics</title>
                            <style>
                              body { font-family: sans-serif; padding: 40px; color: #111; }
                              .text-blue-600 { color: #2563eb; }
                              .text-emerald-600 { color: #059669; }
                              .text-rose-500 { color: #ef4444; }
                              .text-gray-400 { color: #9ca3af; }
                              .bg-gray-50 { background-color: #f9fafb; }
                              .bg-blue-50\\/50 { background-color: rgba(239, 246, 255, 0.5); }
                              .p-8 { padding: 32px; }
                              .p-5 { padding: 20px; }
                              .p-4 { padding: 16px; }
                              .pb-6 { padding-bottom: 24px; }
                              .mb-6 { margin-bottom: 24px; }
                              .mt-6 { margin-top: 24px; }
                              .mt-8 { margin-top: 32px; }
                              .pt-6 { padding-top: 24px; }
                              .grid { display: grid; }
                              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                              .gap-6 { gap: 24px; }
                              .border { border: 1px solid #e5e7eb; }
                              .border-b { border-bottom: 1px solid #e5e7eb; }
                              .border-t { border-top: 1px solid #e5e7eb; }
                              .rounded-3xl { rounded: 24px; border-radius: 24px; }
                              .rounded-2xl { rounded: 16px; border-radius: 16px; }
                              .flex { display: flex; }
                              .justify-between { justify-content: space-between; }
                              .font-black { font-weight: 900; }
                              .font-bold { font-weight: 700; }
                              .text-xl { font-size: 20px; }
                              .text-lg { font-size: 18px; }
                              .text-sm { font-size: 14px; }
                              .text-xs { font-size: 12px; }
                              .text-2xl { font-size: 24px; }
                              .text-center { text-align: center; }
                              .inline-block { display: inline-block; }
                              .px-3 { padding-left: 12px; padding-right: 12px; }
                              .py-1 { padding-top: 4px; padding-bottom: 4px; }
                              .space-y-3 > * + * { margin-top: 12px; }
                            </style>
                          </head>
                          <body>
                            ${printContents}
                            <script>
                              window.onload = function() {
                                window.print();
                                window.close();
                              }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }
                }}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Payslip
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* MODAL 5: Adjust Payslip */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Adjust Draft Payslip" size="md">
        {selectedPayslip && (
          <form onSubmit={handleAdjustPayslipSubmit} className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center font-black text-amber-600 text-lg">
                {selectedPayslip.user?.first_name?.[0]}{selectedPayslip.user?.last_name?.[0]}
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white">{selectedPayslip.user?.first_name} {selectedPayslip.user?.last_name}</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{selectedPayslip.user?.employee_id} • {selectedPayslip.user?.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Commission Pay (+)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={adjustCommissionPay}
                      onChange={(e) => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        setAdjustCommissionPay(formatMoneyInput(e.target.value));
                      }}
                      className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-amber-600/5 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Overtime Pay (+)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={adjustOvertimePay}
                      onChange={(e) => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        setAdjustOvertimePay(formatMoneyInput(e.target.value));
                      }}
                      className="w-full pl-8 pr-4 h-12 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-amber-600/5 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">Lates / Half Days Deduction (-)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-black">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={adjustHalfDayDeductions}
                    onChange={(e) => {
                      const clean = parseMoneyInput(e.target.value);
                      if ((clean.split('.').length - 1) > 1) return;
                      setAdjustHalfDayDeductions(formatMoneyInput(e.target.value));
                    }}
                    className="w-full pl-8 pr-4 h-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs font-semibold focus:ring-4 focus:ring-rose-600/5 transition-all dark:text-white text-rose-600 dark:text-rose-400"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preview Adjusted Net Pay</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(Math.max(0, 
                  parseFloat(selectedPayslip.base_salary) + 
                  parseFloat(selectedPayslip.allowances) + 
                  (parseFloat(parseMoneyInput(adjustCommissionPay)) || 0) + 
                  (parseFloat(parseMoneyInput(adjustOvertimePay)) || 0) - 
                  parseFloat(selectedPayslip.tax_amount) - 
                  parseFloat(selectedPayslip.deductions) - 
                  (parseFloat(parseMoneyInput(adjustHalfDayDeductions)) || 0)
                ))}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={adjustPayslipMutation.isPending} className="bg-amber-500 hover:bg-amber-600">
                Save Adjustments
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}

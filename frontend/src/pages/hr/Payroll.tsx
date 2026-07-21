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
  Trash2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Modal, Button, StatusBadge } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';
import { payrollApi } from '../../api/payroll';
import toast from 'react-hot-toast';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { computeBirTax } from './payrollTax';
import PrePayrollTimesheetModal from './PrePayrollTimesheetModal';
import EmployeeSalaryScheduleModal from './EmployeeSalaryScheduleModal';
import PayslipStatementModal from './PayslipStatementModal';
import AdjustPayslipModal from './AdjustPayslipModal';

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

  // Per-row salary computation shared across the Employee Salaries table columns
  const getEmpFinancials = (emp: any) => {
    const base = parseFloat(emp.salary?.base_salary || 0);
    const allowance = parseFloat(emp.salary?.allowances || 0);
    const deduction = parseFloat(emp.salary?.deductions || 0);
    const tax = computeBirTax(base);
    const net = Math.max(0, base + allowance - tax - deduction);
    return { base, allowance, deduction, tax, net };
  };

  const cycleColumns: Column<any>[] = [
    {
      key: 'period',
      header: 'Pay Period',
      render: (cycle) => (
        <span className="font-black text-xs">
          {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}
        </span>
      ),
    },
    {
      key: 'gross',
      header: 'Gross Payroll',
      render: (cycle) => (
        <span className="font-medium text-xs text-gray-500 dark:text-gray-400">{formatCurrency(cycle.gross_amount)}</span>
      ),
    },
    {
      key: 'tax',
      header: 'Tax Deductions',
      render: (cycle) => (
        <span className="font-medium text-xs text-gray-500 dark:text-gray-400">{formatCurrency(cycle.tax_amount)}</span>
      ),
    },
    {
      key: 'net',
      header: 'Net Disbursements',
      render: (cycle) => (
        <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(cycle.net_amount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (cycle) => (
        <StatusBadge status={cycle.status} variant={cycle.status === 'released' ? 'success' : 'warning'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (cycle) => (
        <button
          onClick={() => {
            setSelectedCycleId(cycle.id);
            setIsCycleModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
        >
          <FileText className="w-3.5 h-3.5" /> View Slips
        </button>
      ),
    },
  ];

  const employeeColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Employee Name',
      render: (emp) => (
        <div className="font-black text-xs">
          {emp.first_name} {emp.last_name}
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{emp.employee_id}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (emp) => (
        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg text-[9px] font-black uppercase tracking-tight">
          {emp.role?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'base',
      header: 'Monthly Base Salary',
      render: (emp) => (
        <span className="font-medium text-xs text-gray-500 dark:text-gray-400">{formatCurrency(getEmpFinancials(emp).base)}</span>
      ),
    },
    {
      key: 'allowance',
      header: 'Monthly Allowances',
      render: (emp) => (
        <span className="font-medium text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(getEmpFinancials(emp).allowance)}</span>
      ),
    },
    {
      key: 'deduction',
      header: 'Monthly Deductions',
      render: (emp) => (
        <span className="font-medium text-xs text-rose-500">{formatCurrency(getEmpFinancials(emp).deduction)}</span>
      ),
    },
    {
      key: 'net',
      header: 'Est. Monthly Net',
      render: (emp) => (
        <span className="font-black text-xs text-blue-600 dark:text-blue-400">{formatCurrency(getEmpFinancials(emp).net)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (emp) => (
        <button
          onClick={() => handleOpenEditModal(emp)}
          className="inline-flex items-center gap-1.5 px-4 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
        >
          Edit Schedule
        </button>
      ),
    },
  ];

  const payslipColumns: Column<any>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (slip) => (
        <div className="font-black text-xs">
          {slip.user?.first_name} {slip.user?.last_name}
          <div className="text-[9px] text-gray-400 font-semibold mt-0.5">{slip.user?.role?.replace(/_/g, ' ')}</div>
        </div>
      ),
    },
    {
      key: 'base',
      header: 'Base',
      render: (slip) => (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatCurrency(slip.base_salary)}</span>
      ),
    },
    {
      key: 'allowances',
      header: 'Allowances',
      render: (slip) => (
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(slip.allowances)}</span>
      ),
    },
    {
      key: 'tax',
      header: 'Withholding Tax',
      render: (slip) => (
        <span className="text-xs font-medium text-rose-500">{formatCurrency(slip.tax_amount)}</span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (slip) => (
        <span className="text-xs font-medium text-rose-500">{formatCurrency(slip.deductions)}</span>
      ),
    },
    {
      key: 'net',
      header: 'Net Pay',
      render: (slip) => (
        <span className="text-xs font-black text-blue-600 dark:text-blue-400">{formatCurrency(slip.net_salary)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (slip) => (
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
      ),
    },
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
          <DataTable
            columns={cycleColumns}
            data={cycles}
            rowKey={(cycle) => cycle.id}
            empty={
              cyclesLoading ? (
                <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">Loading payroll cycles...</div>
              ) : (
                <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">No payroll cycles run yet.</div>
              )
            }
          />
        ) : (
          <DataTable
            columns={employeeColumns}
            data={employees}
            rowKey={(emp) => emp.id}
            empty={
              employeesLoading ? (
                <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">Loading employee data...</div>
              ) : (
                <div className="py-8 text-center text-gray-500 font-bold text-xs uppercase tracking-widest">No employees found.</div>
              )
            }
          />
        )}
      </div>

      {/* MODAL 1: Run Payroll (Pre-Payroll Timesheet) */}
      <PrePayrollTimesheetModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        employees={employees}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        prePayrollAdjustments={prePayrollAdjustments}
        setPrePayrollAdjustments={setPrePayrollAdjustments}
        onSubmit={handleRunPayrollSubmit}
        isSubmitting={runPayrollMutation.isPending}
        formatCurrency={formatCurrency}
      />

      {/* MODAL 2: Edit Employee Salary */}
      <EmployeeSalaryScheduleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        selectedEmployee={selectedEmployee}
        baseSalary={baseSalary}
        setBaseSalary={setBaseSalary}
        allowances={allowances}
        setAllowances={setAllowances}
        deductions={deductions}
        setDeductions={setDeductions}
        onSubmit={handleEditSalarySubmit}
        isSubmitting={updateSalaryMutation.isPending}
        formatCurrency={formatCurrency}
      />

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

              <DataTable
                columns={payslipColumns}
                data={filteredPayslips}
                rowKey={(slip: any) => slip.id}
                empty={
                  <div className="py-6 text-center text-gray-500 text-xs font-bold uppercase tracking-wider">No payslips found.</div>
                }
              />
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
      <PayslipStatementModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        selectedPayslip={selectedPayslip}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* MODAL 5: Adjust Payslip */}
      <AdjustPayslipModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        selectedPayslip={selectedPayslip}
        adjustCommissionPay={adjustCommissionPay}
        setAdjustCommissionPay={setAdjustCommissionPay}
        adjustOvertimePay={adjustOvertimePay}
        setAdjustOvertimePay={setAdjustOvertimePay}
        adjustHalfDayDeductions={adjustHalfDayDeductions}
        setAdjustHalfDayDeductions={setAdjustHalfDayDeductions}
        onSubmit={handleAdjustPayslipSubmit}
        isSubmitting={adjustPayslipMutation.isPending}
        formatCurrency={formatCurrency}
      />

    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { accountingApi } from '../../api/accounting';
import type { Liquidation, LiquidationItem } from '../../api/accounting';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import {
  LuReceipt,
  LuCircleCheck,
  LuTriangleAlert,
  LuClock,
  LuSearch,
  LuSlidersHorizontal,
  LuUser,
  LuX,
  LuWallet,
  LuCoins,
  LuChevronUp,
  LuChevronDown
} from 'react-icons/lu';

export default function Liquidations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'liquidations' | 'soa'>('liquidations');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLiquidation, setSelectedLiquidation] = useState<Liquidation | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);

  // Fetch all liquidations
  const { data: liqRes, isLoading: isLoadingLiqs } = useQuery({
    queryKey: ['liquidations'],
    queryFn: accountingApi.getLiquidations,
    staleTime: 5000,
  });

  // Fetch all employee SOA profiles
  const { data: soaRes, isLoading: isLoadingSoa } = useQuery({
    queryKey: ['employee-soa'],
    queryFn: accountingApi.getEmployeeSoa,
    staleTime: 5000,
    enabled: activeTab === 'soa',
  });

  const liquidations = liqRes?.data || [];
  const employees = soaRes?.data || [];

  const hasGeneralAccess = !!(user?.role === 'super_admin' || user?.tags?.includes('access:general') || user?.tags?.includes('access:liquidations:general'));
  const canSettle = !!(user?.role === 'super_admin' || user?.tags?.includes('process:settle_liquidation') || user?.tags?.includes('access:general'));

  // Mutation to settle a liquidation
  const settleMutation = useMutation({
    mutationFn: ({ id, items, totalReturned, notes }: { id: number, items: Partial<LiquidationItem>[], totalReturned: number, notes?: string }) => 
      accountingApi.settleLiquidation(id, { items, total_returned: totalReturned, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidations'] });
      queryClient.invalidateQueries({ queryKey: ['employee-soa'] });
      toast.success('Liquidation settled and ledger updated successfully!');
      setSelectedLiquidation(null);
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to settle liquidation');
    }
  });

  // Filtered liquidations for Tab 1
  const filteredLiquidations = liquidations.filter(liq => {
    if (!hasGeneralAccess && liq.employee_id !== user?.id) {
      return false;
    }
    const driverName = `${liq.employee?.first_name || ''} ${liq.employee?.last_name || ''}`.toLowerCase();
    const controlNo = (liq.trip_ticket?.control_no || '').toLowerCase();
    const matchesSearch = driverName.includes(searchTerm.toLowerCase()) || controlNo.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : liq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered employees for Tab 2
  const filteredEmployees = employees.filter(emp => {
    if (!hasGeneralAccess && emp.id !== user?.id) {
      return false;
    }
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const employeeId = (emp.employee_id || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || employeeId.includes(searchTerm.toLowerCase());
  });

  // Stats calculation for Tab 1
  const pendingCount = liquidations.filter(l => l.status === 'pending' || l.status === 'under_review').length;
  const settledCount = liquidations.filter(l => l.status === 'settled').length;
  const disputedCount = liquidations.filter(l => l.status === 'disputed').length;

  // Stats calculation for Tab 2
  const totalOutstandingAdvances = employees.reduce((acc, emp) => acc + emp.shortage_amount, 0);
  const totalAdvanced = employees.reduce((acc, emp) => acc + emp.total_advanced, 0);
  const totalReturned = employees.reduce((acc, emp) => acc + emp.total_returned, 0);

  const handleOpenReview = (liq: Liquidation) => {
    const clonedItems = liq.items?.map(item => ({
      ...item,
      amount: item.amount !== undefined && item.amount !== null ? formatMoneyInput(String(item.amount)) : '',
      status: item.status || 'approved'
    })) || [];
    
    const defaultCategories: LiquidationItem['expense_category'][] = ['Fuel', 'Toll', 'Meals'];
    const finalItems = clonedItems.length > 0 ? clonedItems : defaultCategories.map(cat => ({
      expense_category: cat,
      amount: '',
      receipt_number: '',
      status: 'approved' as const,
      notes: ''
    }));

    setSelectedLiquidation({
      ...liq,
      items: finalItems as any,
      total_returned: liq.total_returned !== undefined && liq.total_returned !== null ? formatMoneyInput(String(liq.total_returned)) : ''
    } as any);
  };

  const toggleExpandEmployee = (id: number) => {
    setExpandedEmployeeId(prev => prev === id ? null : id);
  };

  // Dynamic Ledger calculations for active selectedLiquidation modal
  const ledgerEntries = (() => {
    if (!selectedLiquidation) return [];

    const categoryToAccountMap: Record<string, { code: string; name: string }> = {
      'Fuel': { code: '5000', name: 'Fuel Expense' },
      'Toll': { code: '5100', name: 'Toll Expense' },
      'Meals': { code: '5200', name: 'Meals Expense' },
      'Parts': { code: '5300', name: 'Parts & Maintenance' },
      'Other': { code: '5300', name: 'Parts & Maintenance' },
    };

    const totalAdvanced = selectedLiquidation.total_advanced || 0;
    const totalReturned = Number(parseMoneyInput(String(selectedLiquidation.total_returned || 0))) || 0;
    
    // Sum approved expense items by category
    const expenseGroup: Record<string, number> = {};
    selectedLiquidation.items?.forEach(item => {
      if (item.status === 'approved') {
        const cat = item.expense_category || 'Other';
        expenseGroup[cat] = (expenseGroup[cat] || 0) + (Number(parseMoneyInput(String(item.amount || 0))) || 0);
      }
    });

    const totalSpent = Object.values(expenseGroup).reduce((sum, amt) => sum + amt, 0);
    const shortage = totalAdvanced - (totalSpent + totalReturned);

    const rows: Array<{ code: string; name: string; debit: number; credit: number; type: 'debit' | 'credit' }> = [];

    // 1. Debits for expenses
    Object.entries(expenseGroup).forEach(([category, amount]) => {
      if (amount > 0) {
        const acc = categoryToAccountMap[category] || { code: '5300', name: 'Parts & Maintenance' };
        rows.push({
          code: acc.code,
          name: acc.name,
          debit: amount,
          credit: 0,
          type: 'debit'
        });
      }
    });

    // 2. Debit cash returned (if any)
    if (totalReturned > 0) {
      rows.push({
        code: '1100',
        name: 'Cash on Hand (Returned Change)',
        debit: totalReturned,
        credit: 0,
        type: 'debit'
      });
    }

    // 3. Debit cash shortage (if any)
    if (shortage > 0) {
      rows.push({
        code: '5900',
        name: 'Cash Shortage (Driver Account)',
        debit: shortage,
        credit: 0,
        type: 'debit'
      });
    }

    // 3b. Credit Due to Employees for reimbursement (if shortage < 0)
    if (shortage < 0) {
      rows.push({
        code: '2100',
        name: 'Due to Employees (Reimbursement)',
        debit: 0,
        credit: Math.abs(shortage),
        type: 'credit'
      });
    }

    // 4. Credit Employee Advances for the entire advanced amount
    if (totalAdvanced > 0) {
      rows.push({
        code: '1200',
        name: 'Employee Advances (Float Clear)',
        debit: 0,
        credit: totalAdvanced,
        type: 'credit'
      });
    }

    // Sort rows: Debits first, then Credits
    rows.sort((a, b) => {
      if (a.type === b.type) return Number(a.code) - Number(b.code);
      return a.type === 'debit' ? -1 : 1;
    });

    return rows;
  })();

  const ledgerTotalDebits = ledgerEntries.reduce((sum, r) => sum + r.debit, 0);
  const ledgerTotalCredits = ledgerEntries.reduce((sum, r) => sum + r.credit, 0);
  const ledgerIsBalanced = Math.abs(ledgerTotalDebits - ledgerTotalCredits) < 0.01;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ── Top Header and Actions Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 relative z-30 no-print">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800 shadow-sm font-display">
            Accounting
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em] font-display">
            Liquidations & Employee Floats SOA Manager
          </p>
        </div>

        {/* Tab switcher using pill layout */}
        <div className="flex overflow-x-auto hide-scrollbar flex-nowrap w-full md:w-auto bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner backdrop-blur-md">
          <button
            onClick={() => {
              setActiveTab('liquidations');
              setSearchTerm('');
            }}
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
              activeTab === 'liquidations'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md scale-[1.03]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:scale-[1.01]'
            }`}
          >
            Trip Liquidations
          </button>
          <button
            onClick={() => {
              setActiveTab('soa');
              setSearchTerm('');
            }}
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
              activeTab === 'soa'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md scale-[1.03]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:scale-[1.01]'
            }`}
          >
            Employee Float SOA
          </button>
        </div>
      </div>

      {/* Tab 1: KPI Cards */}
      {activeTab === 'liquidations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0 relative z-20 no-print">
          <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
            <div className="flex items-start justify-between">
              <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LuClock className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider font-display">
                Pending
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5 font-display">Pending Review</p>
              <p className="text-2xl font-black leading-none font-display">{pendingCount}</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
            <div className="flex items-start justify-between">
              <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LuCircleCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider font-display">
                Settled
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5 font-display font-black">Settled Clean</p>
              <p className="text-2xl font-black leading-none font-display">{settledCount}</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-300/30 dark:shadow-rose-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
            <div className="flex items-start justify-between">
              <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LuTriangleAlert className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider font-display">
                Disputed
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5 font-display">Disputed & Shortage</p>
              <p className="text-2xl font-black leading-none font-display">{disputedCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SOA KPI Cards */}
      {activeTab === 'soa' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0 relative z-20 no-print">
          <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-300/30 dark:shadow-blue-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
            <div className="flex items-start justify-between">
              <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LuWallet className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider font-display">
                Float
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5 font-display">Total Advanced</p>
              <p className="text-xl font-black font-sans leading-none">
                ₱{totalAdvanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
            <div className="flex items-start justify-between">
              <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LuCoins className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider font-display">
                Returned
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5 font-display">Total Cash Returned</p>
              <p className="text-xl font-black font-sans leading-none">
                ₱{totalReturned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-300/30 dark:shadow-rose-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
            <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
            <div className="flex items-start justify-between">
              <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <LuTriangleAlert className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider font-display">
                Owed
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5 font-display">Outstanding Shortages</p>
              <p className="text-xl font-black font-sans leading-none">
                ₱{totalOutstandingAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-md p-6 sm:p-8 space-y-6">
        
        {/* Tab 1 Content */}
        {activeTab === 'liquidations' && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-full sm:w-72">
                <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search driver or trip control no..."
                  className="pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <LuSlidersHorizontal className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  <option value="all">All States</option>
                  <option value="pending">Pending Review</option>
                  <option value="under_review">Under Review</option>
                  <option value="settled">Settled</option>
                  <option value="disputed">Disputed / Shortage</option>
                </select>
              </div>
            </div>

            {/* Liquidations Data Table */}
            <div className={`relative overflow-x-auto custom-scrollbar ${filteredLiquidations.length > 0 ? 'min-h-[350px]' : ''}`}>
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-l-2xl">Driver / Employee</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trip Control No.</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Advanced</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Liquidated Spent</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Cash Returned</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Shortage / Dispute</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right rounded-r-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingLiqs ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="px-6 py-8"><div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredLiquidations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</td>
                    </tr>
                  ) : (
                    filteredLiquidations.map((liq) => {
                      const employeeName = liq.employee 
                        ? `${liq.employee.first_name} ${liq.employee.last_name}`
                        : 'Unassigned';
                      
                      return (
                        <tr key={liq.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 shadow-sm">
                                <LuUser className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">{employeeName}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize mt-0.5">{liq.employee?.role?.replace('_', ' ') || 'Staff'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-bold text-blue-600 dark:text-blue-400">
                            {liq.trip_ticket?.control_no || `Ref #${liq.id}`}
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-gray-955 dark:text-white">
                            ₱{liq.total_advanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-right text-gray-650 dark:text-gray-400">
                            ₱{liq.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-right text-emerald-600 dark:text-emerald-450 font-bold">
                            ₱{liq.total_returned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-6 py-5 text-right font-bold ${liq.shortage_amount > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-gray-450 dark:text-gray-655'}`}>
                            ₱{liq.shortage_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              liq.status === 'settled' 
                                ? 'bg-emerald-50 text-emerald-650 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                                : liq.status === 'disputed'
                                ? 'bg-rose-50 text-rose-650 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50'
                                : 'bg-amber-50 text-amber-650 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
                            }`}>
                              {liq.status === 'settled' && <LuCircleCheck className="w-3.5 h-3.5" />}
                              {liq.status === 'disputed' && <LuTriangleAlert className="w-3.5 h-3.5" />}
                              {(liq.status === 'pending' || liq.status === 'under_review') && <LuClock className="w-3.5 h-3.5" />}
                              {liq.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() => handleOpenReview(liq)}
                              className={`px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                                liq.status === 'pending' || liq.status === 'under_review' || liq.status === 'disputed'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 active:scale-95'
                                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95'
                              }`}
                            >
                              {liq.status === 'settled' ? 'Re-Review' : 'Review'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 2 Content */}
        {activeTab === 'soa' && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-full sm:w-72">
                <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search driver by name or ID..."
                  className="pl-11 pr-4 py-3 bg-gray-55 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* SOA List Grid */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoadingSoa ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-450 font-bold uppercase tracking-wider animate-pulse flex flex-col items-center gap-2">
                  <LuUser className="w-8 h-8 text-blue-505 animate-spin" /> Loading Profiles...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-16 text-center text-gray-450 dark:text-gray-600 flex flex-col items-center gap-3">
                  <LuUser className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                  <p className="text-sm font-bold uppercase tracking-wider">No employee accounts found</p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const fullName = `${emp.first_name} ${emp.last_name}`;
                  const isBlocked = emp.shortage_amount >= 5000;
                  const isExpanded = expandedEmployeeId === emp.id;

                  return (
                    <div key={emp.id} className="transition-all">
                      {/* Summary Bar Row */}
                      <div
                        onClick={() => toggleExpandEmployee(emp.id)}
                        className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-gray-55/40 dark:hover:bg-gray-805/30 transition-colors select-none"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 shadow-sm">
                            <LuUser className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h4 className="font-bold text-gray-950 dark:text-white text-base leading-tight">{fullName}</h4>
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">({emp.employee_id || 'No ID'})</span>
                              
                              {/* Stop-Work Blocked Flag */}
                              {isBlocked && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-650 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-450 text-[9px] font-black uppercase rounded-lg tracking-wider animate-pulse">
                                  <LuTriangleAlert className="w-3.5 h-3.5" /> Blocked (&ge; ₱5,000)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-450 mt-1 capitalize font-medium">{emp.role.replace('_', ' ')} • {emp.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 lg:gap-8 text-xs font-semibold">
                          <div className="text-right">
                            <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Advanced</p>
                            <p className="font-bold text-gray-800 dark:text-gray-300">
                              ₱{emp.total_advanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Spent</p>
                            <p className="font-bold text-gray-600 dark:text-gray-450">
                              ₱{emp.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-0.5">Returned</p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-450">
                              ₱{emp.total_returned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest mb-0.5">Balance / Shortage</p>
                            <p className={`font-black ${emp.shortage_amount > 0 ? 'text-rose-650 dark:text-rose-400' : 'text-gray-450'}`}>
                              ₱{emp.shortage_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="text-gray-400 dark:text-gray-600 pl-2">
                            {isExpanded ? <LuChevronUp className="w-5 h-5" /> : <LuChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Liquidation Details */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 bg-gray-50/20 dark:bg-gray-800/10 border-t border-gray-100 dark:border-gray-800">
                          <h5 className="font-black text-[9px] uppercase tracking-widest text-gray-450 mb-4 mt-2">Liquidation History</h5>
                          
                          {emp.liquidations.length === 0 ? (
                            <p className="text-xs text-gray-450 dark:text-gray-500 italic">No liquidations submitted yet.</p>
                          ) : (
                            <div className="space-y-4">
                              {emp.liquidations.map((liq) => (
                                <div key={liq.id} className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                                  {/* Summary info */}
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-blue-600 dark:text-blue-400">
                                        Trip {liq.trip_ticket?.control_no || 'Ref #' + liq.id}
                                      </span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        liq.status === 'settled' 
                                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-450'
                                          : liq.status === 'disputed'
                                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-450'
                                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-450'
                                      }`}>
                                        {liq.status}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-550 font-medium">
                                      Submitted on: {new Date(liq.updated_at).toLocaleDateString()}
                                    </div>
                                  </div>

                                  {/* Details list */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
                                    <div>
                                      <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest">Advanced Amount</p>
                                      <p className="font-bold text-gray-850 dark:text-gray-355 mt-0.5">
                                        ₱{liq.total_advanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest">Spent Amount</p>
                                      <p className="font-bold text-gray-650 dark:text-gray-400 mt-0.5">
                                        ₱{liq.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest">Returned Amount</p>
                                      <p className="font-bold text-emerald-600 dark:text-emerald-450 mt-0.5">
                                        ₱{liq.total_returned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest">Shortage / Receivable</p>
                                      <p className={`font-black mt-0.5 ${liq.shortage_amount > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-gray-400'}`}>
                                        ₱{liq.shortage_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Receipts Breakdowns */}
                                  {liq.items && liq.items.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                      <p className="text-[9px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider">Itemized Receipts</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {liq.items.map((item) => (
                                          <div key={item.id} className="p-3 bg-gray-55 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                                            <div>
                                              <span className="font-bold text-gray-800 dark:text-gray-300">{item.expense_category}</span>
                                              <p className="text-[10px] text-gray-450 mt-0.5">Receipt: {item.receipt_number || 'N/A'}</p>
                                            </div>
                                            <div className="text-right">
                                              <span className="font-bold">
                                                ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              <span className={`block text-[8px] font-black uppercase tracking-wider mt-0.5 ${
                                                item.status === 'approved' 
                                                  ? 'text-emerald-500' 
                                                  : item.status === 'disputed'
                                                  ? 'text-rose-500 animate-pulse'
                                                  : 'text-gray-455'
                                              }`}>
                                                {item.status}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Notes */}
                                  {liq.notes && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-55 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/60">
                                      <span className="font-bold uppercase tracking-wider text-[9px] text-gray-450 block mb-0.5">Remarks / Audit Notes:</span>
                                      {liq.notes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

      </div>

      {/* Review & Settlement Modal */}
      {selectedLiquidation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-[scaleUp_0.2s_ease-out]">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5 font-display">
                  <LuReceipt className="w-6 h-6 text-blue-600" /> Settle Liquidation
                </h3>
                <p className="text-xs text-gray-400 mt-1 font-display">
                  Trip {selectedLiquidation.trip_ticket?.control_no || 'Ref #' + selectedLiquidation.id} — Driver: {selectedLiquidation.employee ? `${selectedLiquidation.employee.first_name} ${selectedLiquidation.employee.last_name}` : 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLiquidation(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1 text-sm text-gray-800 dark:text-gray-200 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* ── Left Column: Receipts Audit ── */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-3 font-display">Audit Details</h4>
                    
                    {/* Advance Overview Box */}
                    <div className="grid grid-cols-2 gap-4 p-5 bg-blue-50/30 dark:bg-blue-950/10 rounded-2xl border border-blue-100/30 dark:border-blue-900/20">
                      <div>
                        <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest font-display">Total Advanced</p>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 font-sans">
                          ₱{selectedLiquidation.total_advanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest font-display">Calculated Spent</p>
                        <p className="text-2xl font-black font-sans text-gray-900 dark:text-white">
                          ₱{(
                            selectedLiquidation.items?.filter(i => i.status === 'approved').reduce((acc, i) => acc + Number(parseMoneyInput(String(i.amount || 0))), 0) || 0
                          ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receipts List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 font-display">Driver Receipts / Line Items</h4>
                      {canSettle && (
                        <button
                          onClick={() => {
                            const updatedItems = [...(selectedLiquidation.items || [])];
                            updatedItems.push({
                              expense_category: 'Fuel',
                              amount: 0,
                              receipt_number: '',
                              status: 'approved',
                              notes: ''
                            });
                            setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer font-display"
                        >
                          + Add Receipt Item
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {selectedLiquidation.items?.length === 0 ? (
                        <p className="text-xs text-gray-405 italic py-4">No receipts added. Click "+ Add Receipt Item" above to add.</p>
                      ) : (
                        selectedLiquidation.items?.map((item, idx) => (
                          <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            
                            {/* Category Selector */}
                            <div className="md:col-span-3">
                              <select
                                value={item.expense_category}
                                disabled={!canSettle}
                                onChange={(e) => {
                                  const updatedItems = [...(selectedLiquidation.items || [])];
                                  updatedItems[idx].expense_category = e.target.value as any;
                                  setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                                }}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                              >
                                <option value="Fuel">Fuel</option>
                                <option value="Toll">Toll</option>
                                <option value="Meals">Meals</option>
                                <option value="Parts">Parts</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            {/* Receipt No */}
                            <div className="md:col-span-3">
                              <input
                                type="text"
                                placeholder="Receipt No."
                                value={item.receipt_number || ''}
                                disabled={!canSettle}
                                onChange={(e) => {
                                  const updatedItems = [...(selectedLiquidation.items || [])];
                                  updatedItems[idx].receipt_number = e.target.value;
                                  setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                                }}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-2xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* Amount */}
                            <div className="md:col-span-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Amount"
                                value={item.amount || ''}
                                disabled={!canSettle}
                                onChange={(e) => {
                                  const clean = parseMoneyInput(e.target.value);
                                  if ((clean.split('.').length - 1) > 1) return;
                                  const formatted = formatMoneyInput(e.target.value);
                                  const updatedItems = [...(selectedLiquidation.items || [])];
                                  updatedItems[idx].amount = formatted as any;
                                  setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                                }}
                                onKeyDown={(e) => {
                                  if (e.ctrlKey || e.metaKey) return;
                                  if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-255 dark:border-gray-700 rounded-2xl px-3 py-2.5 text-xs font-bold font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                              />
                            </div>

                            {/* Approve / Dispute Toggles */}
                            <div className="md:col-span-2 flex gap-1">
                              <button
                                type="button"
                                disabled={!canSettle}
                                onClick={() => {
                                  const updatedItems = [...(selectedLiquidation.items || [])];
                                  updatedItems[idx].status = 'approved';
                                  setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                                }}
                                className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  item.status === 'approved'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-655'
                                }`}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={!canSettle}
                                onClick={() => {
                                  const updatedItems = [...(selectedLiquidation.items || [])];
                                  updatedItems[idx].status = 'disputed';
                                  setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                                }}
                                className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  item.status === 'disputed'
                                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-655'
                                }`}
                              >
                                Dispute
                              </button>
                            </div>

                            {/* Remove Action Button */}
                            <div className="md:col-span-1 flex justify-center">
                              {canSettle && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedItems = (selectedLiquidation.items || []).filter((_, i) => i !== idx);
                                    setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                                  }}
                                  className="text-gray-450 hover:text-rose-600 cursor-pointer p-1 transition-all"
                                >
                                  <LuX className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Cash Returned and Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-450 dark:text-gray-500 mb-2 uppercase tracking-widest font-display">Actual Cash Returned (₱)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-450">₱</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={selectedLiquidation.total_returned ?? ''}
                          onChange={(e) => {
                            const clean = parseMoneyInput(e.target.value);
                            if ((clean.split('.').length - 1) > 1) return;
                            const formatted = formatMoneyInput(e.target.value);
                            setSelectedLiquidation({
                              ...selectedLiquidation,
                              total_returned: formatted as any
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.ctrlKey || e.metaKey) return;
                            if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-700/50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-855 transition-all focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-450 dark:text-gray-500 mb-2 uppercase tracking-widest font-display">Notes / Remarks</label>
                      <input
                        type="text"
                        placeholder="Enter audit notes..."
                        value={selectedLiquidation.notes || ''}
                        onChange={(e) => {
                          setSelectedLiquidation({
                            ...selectedLiquidation,
                            notes: e.target.value
                          });
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-700/50 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-850 transition-all focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Right Column: Dynamic Double-Entry Journal Ledger ── */}
                <div className="lg:col-span-5 bg-gray-55/40 dark:bg-gray-950/40 p-6 rounded-[2rem] border border-gray-150 dark:border-gray-800/80 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50 dark:border-gray-800">
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white font-display">
                          Journal Ledger Preview
                        </h4>
                        <p className="text-[9px] text-gray-455 dark:text-gray-500 uppercase font-black tracking-wider mt-0.5 font-display">
                          Balanced Double-Entry Posting
                        </p>
                      </div>
                      
                      {/* Balanced Badge Indicator */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider font-display ${
                        ledgerIsBalanced 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' 
                          : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/50'
                      }`}>
                        {ledgerIsBalanced ? (
                          <>
                            <LuCircleCheck className="w-3 h-3" /> Balanced
                          </>
                        ) : (
                          <>
                            <LuTriangleAlert className="w-3 h-3 animate-pulse" /> Out of Balance
                          </>
                        )}
                      </span>
                    </div>

                    {/* Ledger Grid Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse select-none">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800">
                            <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest w-[18%]">Code</th>
                            <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest w-[46%]">Account Title</th>
                            <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest w-[18%] text-right">Debit (₱)</th>
                            <th className="py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest w-[18%] text-right">Credit (₱)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/30 dark:divide-gray-800/30 font-sans text-xs">
                          {ledgerEntries.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-450 dark:text-gray-600 italic font-sans">
                                Add approved receipts to see ledger entry
                              </td>
                            </tr>
                          ) : (
                            ledgerEntries.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-100/30 dark:hover:bg-gray-800/20 transition-colors">
                                <td className="py-2.5 text-gray-400 dark:text-gray-550 font-bold">{row.code}</td>
                                <td className={`py-2.5 font-sans font-bold text-gray-950 dark:text-gray-200 truncate max-w-[140px] ${
                                  row.type === 'credit' ? 'pl-5 text-gray-500 dark:text-gray-450 font-medium' : ''
                                }`}>
                                  {row.type === 'credit' && <span className="text-gray-300 dark:text-gray-700 mr-1">↳</span>}
                                  {row.name}
                                </td>
                                <td className="py-2.5 text-right font-bold text-gray-955 dark:text-white">
                                  {row.debit > 0 ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                </td>
                                <td className="py-2.5 text-right font-bold text-gray-955 dark:text-white">
                                  {row.credit > 0 ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        
                        {/* Summary Totals Row */}
                        <tfoot>
                          <tr className="border-t border-gray-250 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-900/40">
                            <td colSpan={2} className="py-3 font-sans font-black text-[10px] text-gray-500 uppercase tracking-wider pl-2">
                              Total Postings
                            </td>
                            <td className="py-3 text-right font-black text-blue-600 dark:text-blue-400">
                              ₱{ledgerTotalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-right font-black text-blue-600 dark:text-blue-400">
                              ₱{ledgerTotalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Accounting Policy Alert */}
                  <div className="mt-4 p-4 bg-blue-50/20 dark:bg-blue-950/10 rounded-2xl border border-blue-100/30 dark:border-blue-900/20 text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed font-semibold">
                    <p className="uppercase tracking-widest text-[8px] font-black mb-1 font-display">System Posting Memo:</p>
                    Float clearing crediting Employee Advances (1200) balances with approved categories (Fuel, Toll, Meals, Parts), returned change (1100), and shortages (5900) or payable reimbursements (2100).
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLiquidation(null)}
                className="px-5 py-3 bg-gray-150 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-750 dark:text-gray-200 font-bold text-xs tracking-wider rounded-2xl uppercase cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  settleMutation.mutate({
                    id: selectedLiquidation.id,
                    items: (selectedLiquidation.items || []).map(item => ({
                      ...item,
                      amount: Number(parseMoneyInput(String(item.amount || 0)))
                    })),
                    totalReturned: Number(parseMoneyInput(String(selectedLiquidation.total_returned || 0))),
                    notes: selectedLiquidation.notes
                  });
                }}
                disabled={settleMutation.isPending || !canSettle}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs tracking-wider rounded-2xl uppercase shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer transition-all"
              >
                {settleMutation.isPending ? 'Settling...' : 'Complete Review & Settle'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

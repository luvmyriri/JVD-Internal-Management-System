import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuBookOpen,
  LuSearch,
  LuUser,
  LuAlertTriangle,
  LuCheckCircle,
  LuClock,
  LuChevronDown,
  LuChevronUp,
  LuCoins,
  LuWallet,
  LuReceipt,
  LuX,
} from 'react-icons/lu';
import { accountingApi, EmployeeSoa } from '../../api/accounting';

export default function EmployeeSOA() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);

  // Fetch all employee statement of accounts
  const { data, isLoading } = useQuery({
    queryKey: ['employee-soa'],
    queryFn: accountingApi.getEmployeeSoa,
    staleTime: 5000,
  });

  const employees = data?.data || [];

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const employeeId = (emp.employee_id || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || employeeId.includes(searchTerm.toLowerCase());
  });

  // Calculate totals
  const totalOutstandingAdvances = employees.reduce((acc, emp) => acc + emp.shortage_amount, 0);
  const totalAdvanced = employees.reduce((acc, emp) => acc + emp.total_advanced, 0);
  const totalReturned = employees.reduce((acc, emp) => acc + emp.total_returned, 0);

  const toggleExpandEmployee = (id: number) => {
    if (expandedEmployeeId === id) {
      setExpandedEmployeeId(null);
    } else {
      setExpandedEmployeeId(id);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
          <LuBookOpen className="w-8 h-8 text-indigo-500" /> Employee Statements of Account
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor employee floats, track outstanding balances, and check stop-work flags for driver cash advances.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest mb-1">Total Advanced (Float)</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight font-mono">
              ₱{totalAdvanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500">
            <LuWallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest mb-1">Total Cash Returned</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight font-mono">
              ₱{totalReturned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500">
            <LuCoins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest mb-1">Outstanding Receivables</p>
            <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
              ₱{totalOutstandingAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-505">
            <LuAlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-gray-950 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-450 dark:text-gray-500">
              <LuSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search driver by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white text-sm rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* List Grid */}
        <div className="divide-y divide-gray-100 dark:divide-gray-850">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-450 font-bold uppercase tracking-wider animate-pulse flex flex-col items-center gap-2">
              <LuBookOpen className="w-8 h-8 text-indigo-500 animate-spin" /> Loading Profiles...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-16 text-center text-gray-450 dark:text-gray-600 flex flex-col items-center gap-3">
              <LuBookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-bold uppercase tracking-wider">No employee accounts found</p>
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const fullName = `${emp.first_name} ${emp.last_name}`;
              const isBlocked = emp.shortage_amount >= 5000;
              const isExpanded = expandedEmployeeId === emp.id;

              return (
                <div key={emp.id} className="transition-all">
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleExpandEmployee(emp.id)}
                    className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl">
                        <LuUser className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-bold text-gray-900 dark:text-white text-base">{fullName}</h4>
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">({emp.employee_id || 'No ID'})</span>
                          
                          {/* Stop-Work Blocked Flag */}
                          {isBlocked && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-450 text-[10px] font-black uppercase rounded-lg tracking-wider animate-pulse">
                              <LuAlertTriangle className="w-3.5 h-3.5" /> Blocked (&ge; ₱5,000)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 capitalize font-medium">{emp.role.replace('_', ' ')} • {emp.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 lg:gap-8 font-mono text-sm">
                      <div className="text-right">
                        <p className="text-[9px] font-bold font-sans text-gray-400 uppercase tracking-widest mb-0.5">Total Advanced</p>
                        <p className="font-bold text-gray-800 dark:text-gray-250">
                          ₱{emp.total_advanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] font-bold font-sans text-gray-400 uppercase tracking-widest mb-0.5">Total Spent</p>
                        <p className="font-bold text-gray-600 dark:text-gray-400">
                          ₱{emp.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] font-bold font-sans text-gray-400 uppercase tracking-widest mb-0.5">Returned</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-450">
                          ₱{emp.total_returned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] font-bold font-sans text-gray-400 uppercase tracking-widest mb-0.5">Balance / Shortage</p>
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
                    <div className="px-8 pb-8 pt-2 bg-gray-50/30 dark:bg-gray-900/10 border-t border-gray-50 dark:border-gray-850">
                      <h5 className="font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-4">Liquidation History</h5>
                      
                      {emp.liquidations.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-550 italic">No liquidations submitted yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {emp.liquidations.map((liq) => (
                            <div key={liq.id} className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm space-y-4">
                              {/* Summary info */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-850 pb-3">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    Trip {liq.trip_ticket?.control_no || 'Ref #' + liq.id}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    liq.status === 'settled' 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                                      : liq.status === 'disputed'
                                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'
                                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                                  }`}>
                                    {liq.status}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 font-medium">
                                  Submitted on: {new Date(liq.updated_at).toLocaleDateString()}
                                </div>
                              </div>

                              {/* Details list */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                                <div>
                                  <p className="text-[9px] font-sans font-bold text-gray-400 uppercase tracking-widest">Advanced Amount</p>
                                  <p className="font-bold text-gray-850 dark:text-gray-300 mt-0.5">
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
                                  <p className={`font-black mt-0.5 ${liq.shortage_amount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`}>
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
                                      <div key={item.id} className="p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-150 dark:border-gray-850 flex items-center justify-between text-xs">
                                        <div>
                                          <span className="font-bold text-gray-800 dark:text-gray-300">{item.expense_category}</span>
                                          <p className="text-[10px] text-gray-400 mt-0.5">Receipt: {item.receipt_number || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-bold font-mono">
                                            ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                          <span className={`block text-[9px] font-bold uppercase ${
                                            item.status === 'approved' 
                                              ? 'text-emerald-500' 
                                              : item.status === 'disputed'
                                              ? 'text-rose-500 animate-pulse'
                                              : 'text-gray-450'
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
                                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 p-3 rounded-xl border border-gray-100 dark:border-gray-850/50">
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
      </div>
    </div>
  );
}

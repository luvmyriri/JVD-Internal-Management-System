import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { accountingApi, Liquidation, LiquidationItem } from '../../api/accounting';

// Actually let's import the icons from 'react-icons/lu' to keep consistent
import {
  LuReceipt as IconReceipt,
  LuCheckCircle as IconCheckCircle,
  LuAlertTriangle as IconAlertTriangle,
  LuClock as IconClock,
  LuSearch as IconSearch,
  LuSlidersHorizontal as IconSliders,
  LuChevronRight as IconChevronRight,
  LuFileText as IconFileText,
  LuWallet as IconWallet,
  LuCoins as IconCoins,
  LuFileSpreadsheet as IconFileSpreadsheet,
  LuArrowDownLeft as IconArrowDownLeft,
  LuEdit3 as IconEdit,
  LuUser as IconUser,
  LuX as IconX,
} from 'react-icons/lu';

export default function Liquidations() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLiquidation, setSelectedLiquidation] = useState<Liquidation | null>(null);

  // Fetch all liquidations
  const { data, isLoading } = useQuery({
    queryKey: ['liquidations'],
    queryFn: accountingApi.getLiquidations,
    staleTime: 5000,
  });

  const liquidations = data?.data || [];

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

  // Filtered liquidations
  const filteredLiquidations = liquidations.filter(liq => {
    const driverName = `${liq.employee?.first_name || ''} ${liq.employee?.last_name || ''}`.toLowerCase();
    const controlNo = (liq.trip_ticket?.control_no || '').toLowerCase();
    const matchesSearch = driverName.includes(searchTerm.toLowerCase()) || controlNo.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : liq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats calculation
  const pendingCount = liquidations.filter(l => l.status === 'pending' || l.status === 'under_review').length;
  const settledCount = liquidations.filter(l => l.status === 'settled').length;
  const disputedCount = liquidations.filter(l => l.status === 'disputed').length;

  const handleOpenReview = (liq: Liquidation) => {
    // Clone items and ensure they have a status
    const clonedItems = liq.items?.map(item => ({
      ...item,
      status: item.status || 'approved'
    })) || [];
    
    // Add default categories if empty
    const defaultCategories: LiquidationItem['expense_category'][] = ['Fuel', 'Toll', 'Meals'];
    const finalItems = clonedItems.length > 0 ? clonedItems : defaultCategories.map(cat => ({
      expense_category: cat,
      amount: 0,
      receipt_number: '',
      status: 'approved' as const,
      notes: ''
    }));

    setSelectedLiquidation({
      ...liq,
      items: finalItems as LiquidationItem[]
    });
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <IconReceipt className="w-8 h-8 text-indigo-500" /> Trip & Expense Liquidations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review driver receipts, verify advances, resolve shortages, and record ledger lines.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Pending Review</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{pendingCount}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500">
            <IconClock className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest mb-1">Settled (Clean)</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{settledCount}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500">
            <IconCheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest mb-1">Disputed / Shortage</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{disputedCount}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500">
            <IconAlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-white dark:bg-gray-950 rounded-[2rem] border border-gray-150 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Table Header / Filters */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-450 dark:text-gray-500">
              <IconSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search driver or trip control no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white text-sm rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <IconSliders className="w-4 h-4 text-gray-450 dark:text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-gray-200 text-sm font-semibold rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:border-indigo-500 transition-colors"
            >
              <option value="all">All States</option>
              <option value="pending">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="settled">Settled</option>
              <option value="disputed">Disputed / Shortage</option>
            </select>
          </div>
        </div>

        {/* Liquidations List */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-450 font-bold uppercase tracking-wider animate-pulse flex flex-col items-center gap-2">
              <IconReceipt className="w-8 h-8 text-indigo-500 animate-spin" /> Fetching Liquidations...
            </div>
          ) : filteredLiquidations.length === 0 ? (
            <div className="p-16 text-center text-gray-400 dark:text-gray-600 flex flex-col items-center gap-3">
              <IconReceipt className="w-12 h-12 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-bold uppercase tracking-wider">No liquidations found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/10 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest">
                  <th className="py-4 px-6">Driver / Employee</th>
                  <th className="py-4 px-6">Trip Control No.</th>
                  <th className="py-4 px-6 text-right">Advanced</th>
                  <th className="py-4 px-6 text-right">Liquidated Spent</th>
                  <th className="py-4 px-6 text-right">Cash Returned</th>
                  <th className="py-4 px-6 text-right">Shortage / Dispute</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-medium">
                {filteredLiquidations.map((liq) => {
                  const employeeName = liq.employee 
                    ? `${liq.employee.first_name} ${liq.employee.last_name}`
                    : 'Unassigned';
                  
                  return (
                    <tr key={liq.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/20 transition-all">
                      <td className="py-5 px-6">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <IconUser className="w-3.5 h-3.5 text-gray-400" />
                            {employeeName}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{liq.employee?.role || 'Staff'}</div>
                        </div>
                      </td>
                      <td className="py-5 px-6 font-bold text-indigo-600 dark:text-indigo-400">
                        {liq.trip_ticket?.control_no || `Ref #${liq.id}`}
                      </td>
                      <td className="py-5 px-6 text-right font-mono font-bold text-gray-900 dark:text-white">
                        ₱{liq.total_advanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-5 px-6 text-right font-mono text-gray-600 dark:text-gray-400">
                        ₱{liq.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-5 px-6 text-right font-mono text-emerald-600 dark:text-emerald-450">
                        ₱{liq.total_returned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-5 px-6 text-right font-mono font-bold ${liq.shortage_amount > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-gray-400 dark:text-gray-600'}`}>
                        ₱{liq.shortage_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          liq.status === 'settled' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            : liq.status === 'disputed'
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                            : liq.status === 'under_review'
                            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {liq.status === 'settled' && <IconCheckCircle className="w-3 h-3" />}
                          {liq.status === 'disputed' && <IconAlertTriangle className="w-3 h-3" />}
                          {liq.status === 'under_review' && <IconClock className="w-3 h-3" />}
                          {liq.status === 'pending' && <IconClock className="w-3 h-3" />}
                          {liq.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <button
                          onClick={() => handleOpenReview(liq)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide transition-all uppercase cursor-pointer ${
                            liq.status === 'pending' || liq.status === 'under_review' || liq.status === 'disputed'
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                              : 'bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {liq.status === 'settled' ? 'Re-Review' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review & Settlement Modal */}
      {selectedLiquidation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-100 dark:border-gray-850 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-[scaleUp_0.2s_ease-out]">
            {/* Modal Header */}
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                  <IconReceipt className="w-6 h-6 text-indigo-500" /> Settle Liquidation
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Trip {selectedLiquidation.trip_ticket?.control_no || 'Ref #' + selectedLiquidation.id} — Driver: {selectedLiquidation.employee ? `${selectedLiquidation.employee.first_name} ${selectedLiquidation.employee.last_name}` : 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLiquidation(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 text-sm text-gray-800 dark:text-gray-200">
              {/* Advance Overview Box */}
              <div className="grid grid-cols-2 gap-4 p-5 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/20">
                <div>
                  <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest">Total Advanced</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    ₱{selectedLiquidation.total_advanced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest">Calculated Balance</p>
                  <p className="text-2xl font-black font-mono text-gray-800 dark:text-gray-200">
                    ₱{(
                      selectedLiquidation.total_advanced - 
                      (selectedLiquidation.items?.filter(i => i.status === 'approved').reduce((acc, i) => acc + Number(i.amount), 0) || 0) -
                      selectedLiquidation.total_returned
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Receipts List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-450">Driver Receipts / Line Items</h4>
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
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-450 cursor-pointer"
                  >
                    + Add Receipt Item
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedLiquidation.items?.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200/50 dark:border-gray-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Category */}
                      <div className="md:col-span-3">
                        <select
                          value={item.expense_category}
                          onChange={(e) => {
                            const updatedItems = [...(selectedLiquidation.items || [])];
                            updatedItems[idx].expense_category = e.target.value as any;
                            setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                          }}
                          className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
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
                          onChange={(e) => {
                            const updatedItems = [...(selectedLiquidation.items || [])];
                            updatedItems[idx].receipt_number = e.target.value;
                            setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                          }}
                          className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none"
                        />
                      </div>

                      {/* Amount */}
                      <div className="md:col-span-3">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={item.amount || ''}
                          onChange={(e) => {
                            const updatedItems = [...(selectedLiquidation.items || [])];
                            updatedItems[idx].amount = parseFloat(e.target.value) || 0;
                            setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                          }}
                          className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none"
                        />
                      </div>

                      {/* Status / Toggle */}
                      <div className="md:col-span-2 flex justify-center gap-2">
                        <button
                          onClick={() => {
                            const updatedItems = [...(selectedLiquidation.items || [])];
                            updatedItems[idx].status = 'approved';
                            setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                          }}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] tracking-wide uppercase cursor-pointer transition-all ${
                            item.status === 'approved'
                              ? 'bg-emerald-600 text-white shadow shadow-emerald-600/15'
                              : 'bg-gray-250 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const updatedItems = [...(selectedLiquidation.items || [])];
                            updatedItems[idx].status = 'disputed';
                            setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                          }}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] tracking-wide uppercase cursor-pointer transition-all ${
                            item.status === 'disputed'
                              ? 'bg-rose-650 text-white shadow shadow-rose-650/15'
                              : 'bg-gray-255 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          Dispute
                        </button>
                      </div>

                      {/* Remove item */}
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          onClick={() => {
                            const updatedItems = (selectedLiquidation.items || []).filter((_, i) => i !== idx);
                            setSelectedLiquidation({ ...selectedLiquidation, items: updatedItems });
                          }}
                          className="text-rose-500 hover:text-rose-700 font-black cursor-pointer"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Returned Field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-450 dark:text-gray-500 mb-2 uppercase tracking-wide">Actual Cash Returned (₱)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-450">₱</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={selectedLiquidation.total_returned || ''}
                      onChange={(e) => {
                        setSelectedLiquidation({
                          ...selectedLiquidation,
                          total_returned: parseFloat(e.target.value) || 0
                        });
                      }}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold font-mono rounded-xl focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-450 dark:text-gray-500 mb-2 uppercase tracking-wide">Liquidation Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="Enter remarks..."
                    value={selectedLiquidation.notes || ''}
                    onChange={(e) => {
                      setSelectedLiquidation({
                        ...selectedLiquidation,
                        notes: e.target.value
                      });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedLiquidation(null)}
                className="px-5 py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-750 dark:text-gray-200 font-bold text-xs tracking-wider rounded-xl uppercase cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  settleMutation.mutate({
                    id: selectedLiquidation.id,
                    items: selectedLiquidation.items || [],
                    totalReturned: selectedLiquidation.total_returned,
                    notes: selectedLiquidation.notes
                  });
                }}
                disabled={settleMutation.isPending}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs tracking-wider rounded-xl uppercase shadow-md shadow-indigo-600/10 cursor-pointer transition-all"
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

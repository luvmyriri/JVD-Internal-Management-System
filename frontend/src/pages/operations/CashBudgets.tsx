import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { LuWallet, LuSearch, LuPlus, LuX, LuNavigation, LuCoins, LuChevronRight } from 'react-icons/lu';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { cashBudgetApi } from '../../api/operations';
import type { CashBudgetRequest } from '../../types';
import { Modal, Button } from '../../components/ui';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  disbursed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function CashBudgetDetailModal({ budget, onClose }: { budget: CashBudgetRequest; onClose: () => void }) {
  const qc = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => cashBudgetApi.update(budget.id, { status: 'approved' }),
    onSuccess: () => {
      toast.success('Budget Request approved! Invoice generated in Billing.');
      qc.invalidateQueries({ queryKey: ['cash-budgets'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to approve budget request.');
    }
  });

  const declineMutation = useMutation({
    mutationFn: () => cashBudgetApi.delete(budget.id),
    onSuccess: () => {
      toast.success('Budget Request declined successfully.');
      qc.invalidateQueries({ queryKey: ['cash-budgets'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to decline budget request.');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-sm">
              <LuWallet size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Budget Request #{budget.id}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={budget.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
            <LuX size={20} />
          </button>
        </div>

        <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            {budget.purchase_order_id ? (
              <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Linked Purchase Order</p>
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">P.O. #{budget.purchase_order_id}</h3>
              </div>
            ) : null}
            
            {budget.travel_date && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Date</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{budget.travel_date}</h3>
              </div>
            )}
            
            {budget.destination && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destination</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{budget.destination}</h3>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              {budget.purchase_order_id ? 'P.O. Line Items Breakdown' : 'Budget Breakdown'}
            </p>
            <div className="space-y-3">
              {budget.purchase_order_id ? (
                <>
                  {budget.purchase_order?.line_items && budget.purchase_order.line_items.length > 0 ? (
                    budget.purchase_order.line_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{item.item_name}</span>
                          {item.description && (
                            <span className="text-xs text-gray-400">{item.description}</span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.quantity} x ₱ {item.unit_price?.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">PO Total Value</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {budget.total_amount?.toLocaleString() || 0}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Diesel</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {budget.diesel?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Meal Allowance</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {budget.meal_allowance?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">SOP</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {budget.sop?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Tolls (Autosweep/Easytrip)</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {((budget.autosweep || 0) + (budget.easytrip || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Coach Captain Salary</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {budget.coach_captain_salary?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Spare Driver Salary</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {budget.spare_driver_salary?.toLocaleString() || 0}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-gray-900 dark:text-white uppercase">Total Amount</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">₱ {budget.total_amount?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3 flex-wrap">
          {budget.status === 'draft' && (
            <>
              <button 
                onClick={() => declineMutation.mutate()} 
                disabled={declineMutation.isPending || approveMutation.isPending}
                className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline'}
              </button>
              <button 
                onClick={() => approveMutation.mutate()} 
                disabled={approveMutation.isPending || declineMutation.isPending}
                className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
            </>
          )}
          <button onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateCashBudgetModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    travel_date: new Date().toISOString().split('T')[0],
    plate_number: '',
    destination: '',
    diesel: 0,
    meal_allowance: 0,
    sop: 0,
    autosweep: 0,
    easytrip: 0,
    coach_captain_salary: 0,
    spare_driver_salary: 0,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => cashBudgetApi.create(data),
    onSuccess: () => {
      toast.success('Cash Budget Request created successfully');
      qc.invalidateQueries({ queryKey: ['cash-budgets'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create request');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare payload, casting optional and required numeric values
    const payload = {
      ...form,
      diesel: Number(form.diesel),
      meal_allowance: Number(form.meal_allowance),
      sop: Number(form.sop),
      autosweep: Number(form.autosweep),
      easytrip: Number(form.easytrip),
      coach_captain_salary: Number(form.coach_captain_salary),
      spare_driver_salary: Number(form.spare_driver_salary),
    };

    mutation.mutate(payload);
  };

  // Compute live sum reactively
  const liveTotal =
    Number(form.diesel) +
    Number(form.meal_allowance) +
    Number(form.sop) +
    Number(form.autosweep) +
    Number(form.easytrip) +
    Number(form.coach_captain_salary) +
    Number(form.spare_driver_salary);

  return (
    <Modal isOpen={true} onClose={onClose} title="New Cash Budget Request" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {/* Section 1: Travel Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-indigo-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuNavigation size={14} /> Travel Details</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prepared Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Travel Date</label>
                <input
                  type="date"
                  required
                  value={form.travel_date}
                  onChange={e => setForm(p => ({ ...p, travel_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination</label>
                <input
                  type="text"
                  required
                  value={form.destination}
                  onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Vigan, Ilocos Sur"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plate Number</label>
                <input
                  type="text"
                  value={form.plate_number}
                  onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. NDG-5818"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Section 2: Budget Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-indigo-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuCoins size={14} /> Budget Breakdown (₱)</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Diesel Allocation</label>
                <input
                  type="number"
                  min="0"
                  value={form.diesel}
                  onChange={e => setForm(p => ({ ...p, diesel: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal Allowance</label>
                <input
                  type="number"
                  min="0"
                  value={form.meal_allowance}
                  onChange={e => setForm(p => ({ ...p, meal_allowance: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOP</label>
                <input
                  type="number"
                  min="0"
                  value={form.sop}
                  onChange={e => setForm(p => ({ ...p, sop: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Easytrip Toll</label>
                <input
                  type="number"
                  min="0"
                  value={form.easytrip}
                  onChange={e => setForm(p => ({ ...p, easytrip: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Autosweep Toll</label>
                <input
                  type="number"
                  min="0"
                  value={form.autosweep}
                  onChange={e => setForm(p => ({ ...p, autosweep: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coach Captain Salary</label>
                <input
                  type="number"
                  min="0"
                  value={form.coach_captain_salary}
                  onChange={e => setForm(p => ({ ...p, coach_captain_salary: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Spare Driver Salary</label>
                <input
                  type="number"
                  min="0"
                  value={form.spare_driver_salary}
                  onChange={e => setForm(p => ({ ...p, spare_driver_salary: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Live Total Display */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 rounded-[1.5rem] p-5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Estimated Request Total</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sum of all diesel, allowance, toll, and crew costs</p>
          </div>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₱ {liveTotal.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CashBudgets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBudget, setSelectedBudget] = useState<CashBudgetRequest | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['cash-budgets'],
    queryFn: () => cashBudgetApi.getAll(),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const budgets: CashBudgetRequest[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = budgets.filter((b) =>
    b.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(b.purchase_order_id ?? '').includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-indigo-600 dark:text-indigo-500 mb-2 uppercase tracking-widest">
            <LuWallet size={18} /> Operations Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Cash Budgets</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="relative group w-full sm:w-auto">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search destination or plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-full sm:w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer">
            <LuPlus size={18} /> New Request
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-6 rounded-tl-[2rem]">ID</th>
                <th className="px-8 py-6">Source</th>
                <th className="px-8 py-6">Travel Date</th>
                <th className="px-8 py-6">Destination</th>
                <th className="px-8 py-6">Plate No</th>
                <th className="px-8 py-6 text-right">Total Amount</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right rounded-tr-[2rem]">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">Loading requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">No requests found.</td></tr>
              ) : (
                filtered.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">#{budget.id}</td>
                    <td className="px-8 py-5">
                      {budget.purchase_order_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          P.O. #{budget.purchase_order_id}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                          Trip
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">{budget.travel_date || '—'}</td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">{budget.destination || '—'}</td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">{budget.plate_number || '—'}</td>
                    <td className="px-8 py-5 text-right font-bold text-gray-900 dark:text-white">₱ {budget.total_amount?.toLocaleString() || 0}</td>
                    <td className="px-8 py-5"><StatusBadge status={budget.status} /></td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setSelectedBudget(budget)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBudget && (
        <CashBudgetDetailModal budget={selectedBudget} onClose={() => setSelectedBudget(null)} />
      )}

      {showCreate && (
        <CreateCashBudgetModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

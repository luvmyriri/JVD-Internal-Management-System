import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cashBudgetApi } from '../../api/operations';
import type { CashBudgetRequest } from '../../types';
import { Modal, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

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

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft — Awaiting Operations Approval',
  pending_accounting: 'Forwarded to Accounting',
  approved: 'Approved — Ready for Disbursement',
  disbursed: 'Disbursed',
};

function CashBudgetDetailModal({ budget, onClose }: { budget: CashBudgetRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const isAccountingOrAdmin = ['accounting', 'accounting_executive', 'super_admin'].includes(user?.role ?? '');
  const isOperationsOrAdmin = ['admin', 'super_admin', 'operations_manager', 'logistics_in_charge'].includes(user?.role ?? '');

  const [form, setForm] = useState({
    diesel: Number(budget.diesel) || 0,
    meal_allowance: Number(budget.meal_allowance) || 0,
    sop: Number(budget.sop) || 0,
    autosweep: Number(budget.autosweep) || 0,
    easytrip: Number(budget.easytrip) || 0,
    coach_captain_salary: Number(budget.coach_captain_salary) || 0,
    spare_driver_salary: Number(budget.spare_driver_salary) || 0,
  });

  const canEdit = 
    !budget.purchase_order_id && 
    ((budget.status === 'draft' && isOperationsOrAdmin) ||
     (budget.status === 'pending_accounting' && isAccountingOrAdmin) ||
     (budget.status === 'approved' && isOperationsOrAdmin));

  // Compute live sum reactively
  const liveTotal =
    Number(form.diesel) +
    Number(form.meal_allowance) +
    Number(form.sop) +
    Number(form.autosweep) +
    Number(form.easytrip) +
    Number(form.coach_captain_salary) +
    Number(form.spare_driver_salary);

  const [disbursedAmount, setDisbursedAmount] = useState<number>(Number(budget.disbursed_amount) || Number(budget.total_amount) || liveTotal);

  // Sync disbursedAmount with liveTotal when it changes, only if the budget is not already disbursed.
  useEffect(() => {
    if (budget.status !== 'disbursed') {
      setDisbursedAmount(liveTotal);
    }
  }, [liveTotal, budget.status]);

  // Step 1: Operations forwards to accounting
  const forwardMutation = useMutation({
    mutationFn: () => cashBudgetApi.update(budget.id, { 
      status: 'pending_accounting',
      ...form
    }),
    onSuccess: () => {
      toast.success('Budget forwarded to Accounting for approval.');
      qc.invalidateQueries({ queryKey: ['cash-budgets'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to forward budget request.');
    }
  });

  // Step 2: Accounting approves
  const approveMutation = useMutation({
    mutationFn: () => cashBudgetApi.update(budget.id, { 
      status: 'approved',
      ...form
    }),
    onSuccess: () => {
      toast.success('Budget approved! Ready for disbursement.');
      qc.invalidateQueries({ queryKey: ['cash-budgets'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to approve budget request.');
    }
  });

  // Step 2: Accounting disburses → creates invoice in billing
  const disburseMutation = useMutation({
    mutationFn: () => cashBudgetApi.update(budget.id, { 
      status: 'disbursed',
      disbursed_amount: Number(disbursedAmount),
      ...form
    }),
    onSuccess: () => {
      toast.success('Budget disbursed! Invoice created in Billing.');
      qc.invalidateQueries({ queryKey: ['cash-budgets'] });
      qc.invalidateQueries({ queryKey: ['billing-invoices'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to disburse budget request.');
    }
  });

  const declineMutation = useMutation({
    mutationFn: () => cashBudgetApi.delete(budget.id),
    onSuccess: () => {
      toast.success('Budget Request declined.');
      qc.invalidateQueries({ queryKey: ['cash-budgets'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to decline budget request.');
    }
  });

  const isPending = forwardMutation.isPending || approveMutation.isPending || disburseMutation.isPending || declineMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Budget Request #{budget.id}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={budget.status} />
              <span className="text-xs text-gray-400 font-medium">{STATUS_LABEL[budget.status]}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-450 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Workflow Progress Banner */}
        <div className="px-10 pt-6">
          <div className="flex items-center gap-0">
            {['Draft', 'Pending Accounting', 'Approved', 'Disbursed'].map((step, i) => {
              const stepStatus = ['draft', 'pending_accounting', 'approved', 'disbursed'];
              const currentIdx = stepStatus.indexOf(budget.status);
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      done ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      {i + 1}
                    </div>
                    <span className={`text-[9px] font-bold mt-1 text-center leading-tight ${
                      active ? 'text-blue-600 dark:text-blue-400' : done ? 'text-gray-500' : 'text-gray-300 dark:text-gray-600'
                    }`}>
                      {step}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className={`h-0.5 flex-1 mx-2 mb-4 ${
                      i < currentIdx ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>

              );
            })}
          </div>
        </div>

        <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            {budget.purchase_order_id ? (
              <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Linked Purchase Order</p>
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">P.O. #{budget.purchase_order_id}</h3>
              </div>
            ) : budget.trip_ticket_id ? (
              <div className="col-span-2 bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Linked Trip Ticket</p>
                    <h3 className="text-lg font-black text-blue-900 dark:text-white mt-1">DTT #{budget.tripTicket?.control_no || budget.trip_ticket_id}</h3>
                  </div>
                  {budget.tripTicket?.status && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      DTT {budget.tripTicket.status}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mt-2 border-t border-blue-100/10 dark:border-blue-900/20 pt-4">
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Coach Captain</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{budget.tripTicket?.driver?.name || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Vehicle (Plate)</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{budget.tripTicket?.bus?.plate_number || budget.tripTicket?.plate_no || budget.plate_number || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Passengers</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{budget.tripTicket?.no_of_passengers || 0} pax</span>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Route</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {budget.tripTicket?.pick_up || 'TBA'} to {budget.tripTicket?.drop_off || budget.destination || 'TBA'}
                    </span>
                  </div>
                </div>
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
                  {budget.purchaseOrder?.lineItems && budget.purchaseOrder.lineItems.length > 0 ? (
                    budget.purchaseOrder.lineItems.map((item: any, idx: number) => (
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
              ) : canEdit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diesel (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.diesel}
                        onChange={e => setForm(p => ({ ...p, diesel: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meal Allowance (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.meal_allowance}
                        onChange={e => setForm(p => ({ ...p, meal_allowance: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SOP (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.sop}
                        onChange={e => setForm(p => ({ ...p, sop: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Autosweep (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.autosweep}
                        onChange={e => setForm(p => ({ ...p, autosweep: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Easytrip (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.easytrip}
                        onChange={e => setForm(p => ({ ...p, easytrip: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coach Captain Salary (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.coach_captain_salary}
                        onChange={e => setForm(p => ({ ...p, coach_captain_salary: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spare Driver Salary (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.spare_driver_salary}
                        onChange={e => setForm(p => ({ ...p, spare_driver_salary: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
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
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">₱ {(canEdit ? liveTotal : budget.total_amount)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Disbursement Details Input (For Disbursing Users) */}
          {budget.status === 'approved' && isOperationsOrAdmin && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-3">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Disbursement Details</p>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-450 uppercase tracking-widest ml-1">Actual Cash Disbursed (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={disbursedAmount}
                  onChange={e => setDisbursedAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[9px] text-gray-400 italic">
                  Defaults to the requested total of ₱{liveTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                </p>
              </div>
            </div>
          )}

          {/* Disbursement / Invoice Card - shown when disbursed */}
          {budget.status === 'disbursed' && budget.invoice && (
            <div className="space-y-4">
              <div className="bg-emerald-50/40 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100/60 dark:border-emerald-800/30 space-y-3">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Disbursement Summary</p>
                <div className="flex justify-between items-center text-xs font-bold text-gray-600 dark:text-gray-400">
                  <span>Requested Amount:</span>
                  <span>₱ {budget.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-600 dark:text-gray-400">
                  <span>Disbursed Cash:</span>
                  <span>₱ {(budget.disbursed_amount ?? budget.total_amount)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {budget.disbursed_amount && Number(budget.disbursed_amount) !== Number(budget.total_amount) && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    {Number(budget.disbursed_amount) > Number(budget.total_amount) ? (
                      <>
                        <span className="text-blue-600 dark:text-blue-400">Change to be returned:</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          ₱ {(Number(budget.disbursed_amount) - Number(budget.total_amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-600 dark:text-amber-400">Shortage / Reimbursement due:</span>
                        <span className="text-amber-600 dark:text-amber-400">
                          ₱ {(Number(budget.total_amount) - Number(budget.disbursed_amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-150 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest mb-3">Disbursement Invoice</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-black text-gray-900 dark:text-white">{budget.invoice.invoice_number}</p>
                    <p className="text-xs text-gray-500 mt-1">Status: <span className="font-bold capitalize">{budget.invoice.status?.replace('_', ' ')}</span></p>
                    {budget.disbursedBy && (
                      <p className="text-xs text-gray-400 mt-0.5">Disbursed by {budget.disbursedBy.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₱ {budget.invoice.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-widest">Check Accounting › Billing</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit trail */}
          <div className="text-xs text-gray-400 space-y-1">
            {budget.preparedBy && <p>Prepared by: <span className="font-bold text-gray-600 dark:text-gray-300">{budget.preparedBy.name || `${(budget.preparedBy as any).first_name || ''} ${(budget.preparedBy as any).last_name || ''}`.trim()}</span></p>}
            {budget.approvedBy && <p>Approved by: <span className="font-bold text-gray-600 dark:text-gray-300">{budget.approvedBy.name}</span></p>}
            {budget.disbursedBy && <p>Disbursed by: <span className="font-bold text-gray-600 dark:text-gray-300">{budget.disbursedBy.name}</span></p>}
          </div>
        </div>

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3 flex-wrap">
          {/* Operations: Approve (forward to accounting) */}
          {budget.status === 'draft' && isOperationsOrAdmin && (
            <>
              <button 
                onClick={() => declineMutation.mutate()} 
                disabled={isPending}
                className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline'}
              </button>
              <button 
                onClick={() => forwardMutation.mutate()} 
                disabled={isPending}
                className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95"
              >
                {forwardMutation.isPending ? 'Forwarding...' : 'Forward to Accounting'}
              </button>
            </>
          )}

          {/* Accounting: Approve */}
          {budget.status === 'pending_accounting' && isAccountingOrAdmin && (
            <button 
              onClick={() => approveMutation.mutate()} 
              disabled={isPending}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve Budget'}
            </button>
          )}

          {/* Operations / Cash Budgets: Disburse */}
          {budget.status === 'approved' && isOperationsOrAdmin && (
            <button 
              onClick={() => disburseMutation.mutate()} 
              disabled={isPending}
              className="px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              {disburseMutation.isPending ? 'Disbursing...' : 'Disburse & Create Invoice'}
            </button>
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
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Travel Details</span>
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Travel Date</label>
                <input
                  type="date"
                  required
                  value={form.travel_date}
                  onChange={e => setForm(p => ({ ...p, travel_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Vigan, Ilocos Sur"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plate Number</label>
                <input
                  type="text"
                  value={form.plate_number}
                  onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. NDG-5818"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Section 2: Budget Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Budget Breakdown (₱)</span>
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal Allowance</label>
                <input
                  type="number"
                  min="0"
                  value={form.meal_allowance}
                  onChange={e => setForm(p => ({ ...p, meal_allowance: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOP</label>
                <input
                  type="number"
                  min="0"
                  value={form.sop}
                  onChange={e => setForm(p => ({ ...p, sop: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Easytrip Toll</label>
                <input
                  type="number"
                  min="0"
                  value={form.easytrip}
                  onChange={e => setForm(p => ({ ...p, easytrip: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Autosweep Toll</label>
                <input
                  type="number"
                  min="0"
                  value={form.autosweep}
                  onChange={e => setForm(p => ({ ...p, autosweep: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coach Captain Salary</label>
                <input
                  type="number"
                  min="0"
                  value={form.coach_captain_salary}
                  onChange={e => setForm(p => ({ ...p, coach_captain_salary: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Spare Driver Salary</label>
                <input
                  type="number"
                  min="0"
                  value={form.spare_driver_salary}
                  onChange={e => setForm(p => ({ ...p, spare_driver_salary: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Live Total Display */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/50 rounded-[1.5rem] p-5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Estimated Request Total</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sum of all diesel, allowance, toll, and crew costs</p>
          </div>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₱ {liveTotal.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Submit Request
          </button>
        </div>
      </form>
    </Modal>
  );
}

const STATUS_FILTERS = ['all', 'draft', 'approved', 'disbursed'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function CashBudgets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBudget, setSelectedBudget] = useState<CashBudgetRequest | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['cash-budgets'],
    queryFn: () => cashBudgetApi.getAll(),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const budgets: CashBudgetRequest[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = budgets.filter((b) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      b.destination?.toLowerCase().includes(q) ||
      b.plate_number?.toLowerCase().includes(q) ||
      String(b.purchase_order_id ?? '').includes(q) ||
      b.tripTicket?.control_no?.toLowerCase().includes(q) ||
      b.preparedBy?.name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary counts
  const counts = {
    all: budgets.length,
    draft: budgets.filter(b => b.status === 'draft').length,
    approved: budgets.filter(b => b.status === 'approved').length,
    disbursed: budgets.filter(b => b.status === 'disbursed').length,
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-widest">
            Operations Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Cash Budgets</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">System-wide budget requests — from Trip Tickets, Purchase Orders, and manual entries</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="relative group w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search destination, plate, DTT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-5 py-3 w-full sm:w-72 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl shrink-0">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                  statusFilter === s
                    ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-white shadow font-black'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                {s === 'all' ? `All (${counts.all})` : `${s} (${counts[s]})`}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer shrink-0">
            + New Request
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
                <tr><td colSpan={8} className="px-8 py-12 text-center text-gray-500">Loading requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-8 py-12 text-center text-gray-500">No requests found.</td></tr>
              ) : (
                filtered.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">#{budget.id}</td>
                    <td className="px-8 py-5">
                      {budget.purchase_order_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          P.O. #{budget.purchase_order_id}
                        </span>
                      ) : budget.trip_ticket_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          DTT #{budget.tripTicket?.control_no || budget.trip_ticket_id}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-605 dark:bg-blue-900/30 dark:text-blue-400">
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
                      <button onClick={() => setSelectedBudget(budget)} className="px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer">
                        Details
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

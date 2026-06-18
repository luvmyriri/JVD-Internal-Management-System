import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuSearch, LuEye, LuClock,
  LuActivity, LuPlus,
  LuFileCheck, LuWallet, LuLink
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { cashBudgetApi, tripTicketApi } from '../../api/operations';
import { purchaseOrderApi } from '../../api/purchaseOrders';
import { workOrderApi } from '../../api/workOrders';
import type { CashBudgetRequest } from '../../types';
import { Modal, Button, PipelineVisualizer } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

// Pre-defined regex to avoid bundler parser ambiguity inside JSX attribute handlers
const NUMERIC_KEY_RE = /^[0-9.]$/;

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    disbursed: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    draft: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
    approved: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
    pending_accounting: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50',
  };
  const icons: any = {
    disbursed: <LuFileCheck className="w-3 h-3" />,
    draft: <LuClock className="w-3 h-3" />,
    approved: <LuActivity className="w-3.5 h-3.5" />,
    pending_accounting: <LuClock className="w-3 h-3" />,
  };

  const s = status || 'draft';

  return (
    <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[s] || styles.draft}`}>
      {icons[s] || icons.draft}
      {s.replace('_', ' ')}
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

  const isAccountingOrAdmin = !!(user?.role === 'super_admin' || user?.tags?.includes('process:approve_cash_budget') || user?.tags?.includes('access:general'));
  const isOperationsOrAdmin = !!(user?.role === 'super_admin' || user?.tags?.includes('process:disburse_cash_budget') || user?.tags?.includes('access:general'));

  const [form, setForm] = useState({
    diesel: budget.diesel ? formatMoneyInput(parseFloat(budget.diesel as any).toString()) : '',
    meal_allowance: budget.meal_allowance ? formatMoneyInput(parseFloat(budget.meal_allowance as any).toString()) : '',
    sop: budget.sop ? formatMoneyInput(parseFloat(budget.sop as any).toString()) : '',
    autosweep: budget.autosweep ? formatMoneyInput(parseFloat(budget.autosweep as any).toString()) : '',
    easytrip: budget.easytrip ? formatMoneyInput(parseFloat(budget.easytrip as any).toString()) : '',
    coach_captain_salary: budget.coach_captain_salary ? formatMoneyInput(parseFloat(budget.coach_captain_salary as any).toString()) : '',
    spare_driver_salary: budget.spare_driver_salary ? formatMoneyInput(parseFloat(budget.spare_driver_salary as any).toString()) : '',
  });

  const canEdit = 
    !budget.purchase_order_id && 
    !budget.work_order_id && 
    ((budget.status === 'draft' && isOperationsOrAdmin) ||
     (budget.status === 'pending_accounting' && isAccountingOrAdmin) ||
     (budget.status === 'approved' && isOperationsOrAdmin));

  // Compute live sum reactively
  const liveTotal =
    Number(parseMoneyInput(form.diesel) || 0) +
    Number(parseMoneyInput(form.meal_allowance) || 0) +
    Number(parseMoneyInput(form.sop) || 0) +
    Number(parseMoneyInput(form.autosweep) || 0) +
    Number(parseMoneyInput(form.easytrip) || 0) +
    Number(parseMoneyInput(form.coach_captain_salary) || 0) +
    Number(parseMoneyInput(form.spare_driver_salary) || 0);

  const [disbursedAmount, setDisbursedAmount] = useState<string>(
    budget.disbursed_amount 
      ? formatMoneyInput(parseFloat(budget.disbursed_amount as any).toString()) 
      : (budget.total_amount 
          ? formatMoneyInput(parseFloat(budget.total_amount as any).toString()) 
          : formatMoneyInput(liveTotal.toString()))
  );

  // Sync disbursedAmount with liveTotal when it changes, only if the budget is not already disbursed.
  useEffect(() => {
    if (budget.status !== 'disbursed') {
      setDisbursedAmount(formatMoneyInput(liveTotal.toString()));
    }
  }, [liveTotal, budget.status]);

  const getPayload = () => ({
    diesel: Number(parseMoneyInput(form.diesel) || 0),
    meal_allowance: Number(parseMoneyInput(form.meal_allowance) || 0),
    sop: Number(parseMoneyInput(form.sop) || 0),
    autosweep: Number(parseMoneyInput(form.autosweep) || 0),
    easytrip: Number(parseMoneyInput(form.easytrip) || 0),
    coach_captain_salary: Number(parseMoneyInput(form.coach_captain_salary) || 0),
    spare_driver_salary: Number(parseMoneyInput(form.spare_driver_salary) || 0),
  });

  // Step 1: Operations forwards to accounting
  const forwardMutation = useMutation({
    mutationFn: () => cashBudgetApi.update(budget.id, { 
      status: 'pending_accounting',
      ...getPayload()
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
      ...getPayload()
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
      disbursed_amount: Number(parseMoneyInput(disbursedAmount) || 0),
      ...getPayload()
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

        {/* Pipeline Visualizer */}
        <div className="px-10 pt-6">
          <PipelineVisualizer
            pipelineType={!!budget.purchase_order_id ? 'maintenance' : 'transaction'}
            currentStatus={
              !!budget.purchase_order_id
                ? (budget.status === 'disbursed' ? 'disbursed' : 'budget_pending')
                : (budget.status === 'draft' || budget.status === 'pending_accounting'
                    ? 'draft'
                    : (budget.status === 'approved' ? 'approved' : 'disbursed'))
            }
            metadata={{
              approved_by: budget.approvedBy?.name,
              bus_plate: (budget.trip_ticket ?? budget.tripTicket)?.bus?.plate_number || (budget.trip_ticket ?? budget.tripTicket)?.plate_no || budget.plate_number,
              driver_name: (budget.trip_ticket ?? budget.tripTicket)?.driver?.name,
              ticket_no: (budget.trip_ticket ?? budget.tripTicket)?.control_no,
              po_no: (budget.purchase_order ?? budget.purchaseOrder)?.po_number,
              wo_no: (budget.work_order ?? budget.workOrder)?.wo_number,
            }}
          />
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
                    <h3 className="text-lg font-black text-blue-900 dark:text-white mt-1">DTT #{(budget.trip_ticket ?? budget.tripTicket)?.control_no || budget.trip_ticket_id}</h3>
                    {budget.work_order_id && (
                      <p className="text-xs font-bold text-gray-500 mt-1">Work Order: {(budget.work_order ?? budget.workOrder)?.wo_number || budget.work_order_id}</p>
                    )}
                  </div>
                  {(budget.trip_ticket ?? budget.tripTicket)?.status && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      DTT {(budget.trip_ticket ?? budget.tripTicket)!.status}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mt-2 border-t border-blue-100/10 dark:border-blue-900/20 pt-4">
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Coach Captain</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{(budget.trip_ticket ?? budget.tripTicket)?.driver?.name || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Vehicle (Plate)</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{(budget.trip_ticket ?? budget.tripTicket)?.bus?.plate_number || (budget.trip_ticket ?? budget.tripTicket)?.plate_no || budget.plate_number || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Passengers</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{(budget.trip_ticket ?? budget.tripTicket)?.no_of_passengers || 0} pax</span>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Route</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {(budget.trip_ticket ?? budget.tripTicket)?.pick_up || 'TBA'} to {(budget.trip_ticket ?? budget.tripTicket)?.drop_off || budget.destination || 'TBA'}
                    </span>
                  </div>
                </div>
              </div>
            ) : budget.work_order_id ? (
              <div className="col-span-2 bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Linked Work Order</p>
                    <h3 className="text-lg font-black text-emerald-900 dark:text-white mt-1">W.O. #{(budget.work_order ?? budget.workOrder)?.wo_number || budget.work_order_id}</h3>
                  </div>
                  {(budget.work_order ?? budget.workOrder)?.status && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {(budget.work_order ?? budget.workOrder)!.status}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs mt-2 border-t border-emerald-100/10 dark:border-emerald-900/20 pt-4">
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Type</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{(budget.work_order ?? budget.workOrder)?.type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Priority</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{(budget.work_order ?? budget.workOrder)?.priority || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Description</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {(budget.work_order ?? budget.workOrder)?.description || 'No description provided.'}
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

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              {budget.purchase_order_id ? 'P.O. Line Items Breakdown' : (budget.trip_ticket_id || budget.diesel || budget.meal_allowance ? 'Budget Breakdown' : 'Budget Details')}
            </p>
            <div className="space-y-3">
              {budget.purchase_order_id ? (
                <>
                  {/* Support both snake_case (API) and camelCase (legacy) line items */}
                  {(() => {
                    const po = budget.purchase_order ?? budget.purchaseOrder;
                    const items = (po as any)?.line_items ?? (po as any)?.lineItems;
                    return items && items.length > 0 ? (
                      items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.item_name}</span>
                            {item.description && (
                              <span className="text-xs text-gray-400">{item.description}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {item.quantity} × ₱{Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            {item.total_price != null && (
                              <p className="text-xs text-gray-500">= ₱{Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">PO Total Value</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {budget.total_amount?.toLocaleString() || 0}</span>
                      </div>
                    );
                  })()}
                </>
              ) : canEdit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Diesel (₱)</label>
                      <input
                         type="text"
                         inputMode="decimal"
                         value={form.diesel}
                         onChange={e => {
                           const clean = parseMoneyInput(e.target.value);
                           if ((clean.split('.').length - 1) > 1) return;
                           const formatted = formatMoneyInput(e.target.value);
                           setForm(p => ({ ...p, diesel: formatted }));
                         }}
                         onKeyDown={(e) => {
                           if (e.ctrlKey || e.metaKey) return;
                           if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                             e.preventDefault();
                           }
                         }}
                         className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meal Allowance (₱)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.meal_allowance}
                        onChange={e => {
                          const clean = parseMoneyInput(e.target.value);
                          if ((clean.split('.').length - 1) > 1) return;
                          const formatted = formatMoneyInput(e.target.value);
                          setForm(p => ({ ...p, meal_allowance: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey) return;
                          if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SOP (₱)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.sop}
                        onChange={e => {
                          const clean = parseMoneyInput(e.target.value);
                          if ((clean.split('.').length - 1) > 1) return;
                          const formatted = formatMoneyInput(e.target.value);
                          setForm(p => ({ ...p, sop: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey) return;
                          if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Autosweep (₱)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.autosweep}
                        onChange={e => {
                          const clean = parseMoneyInput(e.target.value);
                          if ((clean.split('.').length - 1) > 1) return;
                          const formatted = formatMoneyInput(e.target.value);
                          setForm(p => ({ ...p, autosweep: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey) return;
                          if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Easytrip (₱)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.easytrip}
                        onChange={e => {
                          const clean = parseMoneyInput(e.target.value);
                          if ((clean.split('.').length - 1) > 1) return;
                          const formatted = formatMoneyInput(e.target.value);
                          setForm(p => ({ ...p, easytrip: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey) return;
                          if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coach Captain Salary (₱)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.coach_captain_salary}
                        onChange={e => {
                          const clean = parseMoneyInput(e.target.value);
                          if ((clean.split('.').length - 1) > 1) return;
                          const formatted = formatMoneyInput(e.target.value);
                          setForm(p => ({ ...p, coach_captain_salary: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey) return;
                          if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spare Driver Salary (₱)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.spare_driver_salary}
                        onChange={e => {
                          const clean = parseMoneyInput(e.target.value);
                          if ((clean.split('.').length - 1) > 1) return;
                          const formatted = formatMoneyInput(e.target.value);
                          setForm(p => ({ ...p, spare_driver_salary: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey) return;
                          if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-250 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : budget.trip_ticket_id || budget.diesel || budget.meal_allowance || budget.sop || budget.autosweep || budget.easytrip || budget.coach_captain_salary || budget.spare_driver_salary ? (
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
              ) : (
                <div className="flex justify-between items-center pb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Requested Amount</span>
                  <span className="text-sm font-bold text-gray-905 dark:text-white">₱ {Number(budget.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-gray-900 dark:text-white uppercase">Total Amount</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">₱ {(canEdit ? liveTotal : budget.total_amount)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              </div>

          {/* Disbursement Details Input (For Disbursing Users) */}
          {budget.status === 'approved' && isOperationsOrAdmin && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-3">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Disbursement Details</p>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-455 uppercase tracking-widest ml-1">Actual Cash Disbursed (₱)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={disbursedAmount}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setDisbursedAmount(formatted);
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
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
            {budget.preparedBy && (() => {
              const pb = budget.preparedBy as any;
              const preparedByName = pb.name || `${pb.first_name || ''} ${pb.last_name || ''}`.trim();
              return <p>Prepared by: <span className="font-bold text-gray-600 dark:text-gray-300">{preparedByName}</span></p>;
            })()}
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
  const [requestType, setRequestType] = useState<'dtt' | 'po' | 'wo' | 'general'>('dtt');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    travel_date: new Date().toISOString().split('T')[0],
    plate_number: '',
    destination: '',
    diesel: '',
    meal_allowance: '',
    sop: '',
    autosweep: '',
    easytrip: '',
    coach_captain_salary: '',
    spare_driver_salary: '',
    trip_ticket_id: '',
    work_order_id: '',
    purchase_order_id: '',
    total_amount: '',
  });

  // Fetch trip tickets for linking
  const { data: tripTicketsRaw } = useQuery({
    queryKey: ['trip-tickets-for-budget'],
    queryFn: () => tripTicketApi.getAll(),
    staleTime: 30_000,
  });
  const tripTickets = Array.isArray(tripTicketsRaw) ? tripTicketsRaw : (tripTicketsRaw as any)?.data || [];

  // Fetch approved purchase orders for linking
  const { data: purchaseOrdersRaw } = useQuery({
    queryKey: ['purchase-orders-for-budget'],
    queryFn: () => purchaseOrderApi.list({ status: 'approved', per_page: 100 }),
    staleTime: 30_000,
  });
  const purchaseOrders = purchaseOrdersRaw?.data?.data || [];

  // Fetch open / in-progress work orders for linking
  const { data: workOrdersRaw } = useQuery({
    queryKey: ['work-orders-for-budget'],
    queryFn: () => workOrderApi.list({ per_page: 100 }),
    staleTime: 30_000,
  });
  const workOrders = (workOrdersRaw?.data?.data || []).filter(
    (w: any) => w.status === 'open' || w.status === 'in_progress'
  );

  const selectedPO = purchaseOrders.find((p: any) => String(p.id) === form.purchase_order_id);
  const selectedWO = workOrders.find((w: any) => String(w.id) === form.work_order_id);

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

    let payload: any = {
      date: form.date,
      travel_date: form.travel_date || null,
      plate_number: form.plate_number || null,
      destination: form.destination || null,
    };

    if (requestType === 'dtt') {
      payload = {
        ...payload,
        diesel: Number(parseMoneyInput(form.diesel) || 0),
        meal_allowance: Number(parseMoneyInput(form.meal_allowance) || 0),
        sop: Number(parseMoneyInput(form.sop) || 0),
        autosweep: Number(parseMoneyInput(form.autosweep) || 0),
        easytrip: Number(parseMoneyInput(form.easytrip) || 0),
        coach_captain_salary: Number(parseMoneyInput(form.coach_captain_salary) || 0),
        spare_driver_salary: Number(parseMoneyInput(form.spare_driver_salary) || 0),
      };
      if (form.trip_ticket_id) payload.trip_ticket_id = Number(form.trip_ticket_id);
    } else if (requestType === 'po') {
      payload.purchase_order_id = Number(form.purchase_order_id);
      payload.total_amount = Number(selectedPO?.total_amount || 0);
    } else if (requestType === 'wo') {
      payload.work_order_id = Number(form.work_order_id);
      payload.total_amount = Number(selectedWO?.cost || 0);
    } else if (requestType === 'general') {
      payload.total_amount = Number(parseMoneyInput(form.total_amount) || 0);
    }

    mutation.mutate(payload);
  };

  // Compute live sum reactively
  const dttTotal =
    Number(parseMoneyInput(form.diesel) || 0) +
    Number(parseMoneyInput(form.meal_allowance) || 0) +
    Number(parseMoneyInput(form.sop) || 0) +
    Number(parseMoneyInput(form.autosweep) || 0) +
    Number(parseMoneyInput(form.easytrip) || 0) +
    Number(parseMoneyInput(form.coach_captain_salary) || 0) +
    Number(parseMoneyInput(form.spare_driver_salary) || 0);

  const liveTotal =
    requestType === 'dtt'
      ? dttTotal
      : requestType === 'po'
      ? Number(selectedPO?.total_amount || 0)
      : requestType === 'wo'
      ? Number(selectedWO?.cost || 0)
      : Number(parseMoneyInput(form.total_amount) || 0);

  return (
    <Modal isOpen={true} onClose={onClose} title="New Cash Budget Request" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        
        {/* Sleek Tabs Switcher */}
        <div className="flex overflow-x-auto hide-scrollbar flex-nowrap w-full bg-gray-50 dark:bg-gray-800/70 p-1.5 rounded-2xl border border-gray-100/50 dark:border-gray-700/30 mb-6">
          {(['dtt', 'po', 'wo', 'general'] as const).map((type) => {
            const labels = {
              dtt: 'Trip Ticket',
              po: 'Purchase Order',
              wo: 'Work Order',
              general: 'General / Manual',
            };
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setRequestType(type);
                  // Reset linking IDs when switching tabs
                  setForm(p => ({
                    ...p,
                    trip_ticket_id: '',
                    purchase_order_id: '',
                    work_order_id: '',
                    plate_number: '',
                    destination: '',
                    total_amount: '',
                  }));
                }}
                className={`flex-1 shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  requestType === type
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-gray-400 hover:text-gray-950 dark:hover:text-gray-200'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>

        {/* 1. Driver Trip Ticket Budget Tab */}
        {requestType === 'dtt' && (
          <>
            {tripTickets.length > 0 && (
              <details className="group border border-blue-100 dark:border-blue-900/50 rounded-2xl bg-blue-50/30 dark:bg-blue-950/20" open>
                <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
                  <span className="flex items-center gap-2"><LuLink className="w-3.5 h-3.5" /> Link to Operations Flow (Optional)</span>
                </summary>
                <div className="p-4 pt-0 space-y-4">
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium italic">
                    Link this budget to an existing Driver Trip Ticket to connect it to the JO → DTT → WO → Cash Budget flow.
                  </p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Driver Trip Ticket (DTT)</label>
                    <select
                      value={form.trip_ticket_id}
                      onChange={e => {
                        const selectedId = e.target.value;
                        const selectedTicket = tripTickets.find((t: any) => String(t.id) === selectedId);
                        setForm(p => ({
                          ...p,
                          trip_ticket_id: selectedId,
                          plate_number: selectedTicket?.bus?.plate_number || selectedTicket?.plate_no || p.plate_number,
                          destination: selectedTicket?.drop_off || p.destination,
                          travel_date: selectedTicket?.trip_date || p.travel_date,
                        }));
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— No Trip Ticket linked (manual entry) —</option>
                      {tripTickets.map((ticket: any) => (
                        <option key={ticket.id} value={ticket.id}>
                          DTT #{ticket.control_no || ticket.id} — {ticket.drop_off || 'N/A'} ({ticket.trip_date || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>
            )}

            {/* Travel Details */}
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

            {/* Budget Breakdown */}
            <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
              <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
                <span>Budget Breakdown (₱)</span>
              </summary>
              <div className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Diesel Allocation</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.diesel}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setForm(p => ({ ...p, diesel: formatted }));
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey) return;
                        if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal Allowance</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.meal_allowance}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setForm(p => ({ ...p, meal_allowance: formatted }));
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey) return;
                        if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOP</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.sop}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setForm(p => ({ ...p, sop: formatted }));
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey) return;
                        if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Easytrip Toll</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.easytrip}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setForm(p => ({ ...p, easytrip: formatted }));
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey) return;
                        if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Autosweep Toll</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.autosweep}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setForm(p => ({ ...p, autosweep: formatted }));
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey) return;
                        if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coach Captain Salary</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.coach_captain_salary}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setForm(p => ({ ...p, coach_captain_salary: formatted }));
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey) return;
                        if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Spare Driver Salary</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.spare_driver_salary}
                      onChange={e => {
                        const clean = parseMoneyInput(e.target.value);
                        if ((clean.split('.').length - 1) > 1) return;
                        const formatted = formatMoneyInput(e.target.value);
                        setForm(p => ({ ...p, spare_driver_salary: formatted }));
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey || e.metaKey) return;
                        if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </details>
          </>
        )}

        {/* 2. Purchase Order Budget Tab */}
        {requestType === 'po' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Approved Purchase Order</label>
              <select
                required
                value={form.purchase_order_id}
                onChange={e => {
                  const selectedId = e.target.value;
                  const po = purchaseOrders.find((p: any) => String(p.id) === selectedId);
                  setForm(p => ({
                    ...p,
                    purchase_order_id: selectedId,
                    destination: po ? `Maintenance/Repair PO #${po.po_number}` : '',
                    plate_number: (po as any)?.plate_number || '',
                  }));
                }}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select an Approved PO —</option>
                {purchaseOrders.map((po: any) => (
                  <option key={po.id} value={po.id}>
                    PO #{po.po_number} — {po.supplier?.company_name || 'N/A'} (₱{Number(po.total_amount || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {selectedPO && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-200/50 dark:border-gray-800 space-y-4">
                <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">P.O. Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">Supplier</span>
                    <span className="font-bold text-gray-900 dark:text-gray-150">{selectedPO.supplier?.company_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">Total Value</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">₱{Number(selectedPO.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {selectedPO.line_items && selectedPO.line_items.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800/80 pt-3">
                    <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider mb-2">Line Items</span>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                      {selectedPO.line_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs pb-1 border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                          <span className="text-gray-600 dark:text-gray-400">{item.item_name} (x{item.quantity})</span>
                          <span className="font-bold text-gray-950 dark:text-white">₱{Number(item.total_price || (item.unit_price * item.quantity)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination / Purpose Description</label>
              <input
                type="text"
                required
                value={form.destination}
                onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Parts procurement details"
              />
            </div>
          </div>
        )}

        {/* 3. Work Order Budget Tab */}
        {requestType === 'wo' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Approved Work Order</label>
              <select
                required
                value={form.work_order_id}
                onChange={e => {
                  const selectedId = e.target.value;
                  const wo = workOrders.find((w: any) => String(w.id) === selectedId);
                  setForm(p => ({
                    ...p,
                    work_order_id: selectedId,
                    destination: wo ? `Maintenance/Repair WO #${wo.wo_number}` : '',
                    plate_number: (wo as any)?.bus?.plate_number || (wo as any)?.plate_no || '',
                  }));
                }}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select an Approved Work Order —</option>
                {workOrders.map((wo: any) => (
                  <option key={wo.id} value={wo.id}>
                    WO #{wo.wo_number} — {wo.bus?.plate_number || 'No Bus'} ({wo.type || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            {selectedWO && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-200/50 dark:border-gray-800 space-y-4">
                <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">W.O. Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">Type / Priority</span>
                    <span className="font-bold text-gray-900 dark:text-gray-150">{selectedWO.type} / {selectedWO.priority}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">Estimated Cost</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{Number(selectedWO.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">Description</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedWO.description || 'No description provided.'}</span>
                  </div>
                </div>
              </div>
            )}

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
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination / Purpose Description</label>
              <input
                type="text"
                required
                value={form.destination}
                onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. WO maintenance purpose details"
              />
            </div>
          </div>
        )}

        {/* 4. General Request Tab */}
        {requestType === 'general' && (
          <div className="space-y-4">
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Travel Date (Optional)</label>
                <input
                  type="date"
                  value={form.travel_date}
                  onChange={e => setForm(p => ({ ...p, travel_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination / Purpose</label>
                <input
                  type="text"
                  required
                  value={form.destination}
                  onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Office Supplies, Cash Advance"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plate Number (Optional)</label>
                <input
                  type="text"
                  value={form.plate_number}
                  onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. NDG-5818"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Requested Amount (₱)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={form.total_amount}
                onChange={e => {
                  const clean = parseMoneyInput(e.target.value);
                  if ((clean.split('.').length - 1) > 1) return;
                  const formatted = formatMoneyInput(e.target.value);
                  setForm(p => ({ ...p, total_amount: formatted }));
                }}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey) return;
                  if (!NUMERIC_KEY_RE.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/50 rounded-[1.5rem] p-5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Estimated Request Total</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {requestType === 'dtt' ? 'Sum of all diesel, allowance, toll, and crew costs' : 'Amount to be disbursed for this request'}
            </p>
          </div>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₱ {liveTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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

type StatusFilter = 'all' | 'draft' | 'pending_accounting' | 'approved' | 'disbursed';
const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'pending_accounting', 'approved', 'disbursed'];

export default function CashBudgets() {
  const { user } = useAuth();
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

  const hasGeneralAccess = !!(user?.role === 'super_admin' || user?.tags?.includes('access:general') || user?.tags?.includes('access:cash_budgets:general'));

  const filtered = budgets.filter((b) => {
    if (!hasGeneralAccess && b.prepared_by !== user?.id) {
      return false;
    }
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

  const getRowIndicatorStyle = (_status?: string) => {
    return '';
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Cash Budgets</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
        >
          <LuPlus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0 relative z-20 no-print">

        {/* KPI 1: Draft */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuClock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Draft
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Pending Approval</p>
            <p className="text-2xl font-black leading-none">{counts.draft || 0}</p>
          </div>
        </div>

        {/* KPI 2: Approved */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-300/30 dark:shadow-blue-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuActivity className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Approved
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Ready to Disburse</p>
            <p className="text-2xl font-black leading-none">{counts.approved || 0}</p>
          </div>
        </div>

        {/* KPI 3: Disbursed */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuFileCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Disbursed
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Released Budgets</p>
            <p className="text-2xl font-black leading-none">{counts.disbursed || 0}</p>
          </div>
        </div>

        {/* KPI 4: Total */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-lg shadow-purple-300/30 dark:shadow-purple-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuWallet className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Total
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Total Requests</p>
            <p className="text-2xl font-black leading-none">{counts.all || 0}</p>
          </div>
        </div>

      </div>

      {/* Main Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full sm:w-72">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search destination, plate, DTT..."
              className="pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto hide-scrollbar flex-nowrap w-full sm:w-auto bg-gray-50 dark:bg-gray-800/70 p-1.5 rounded-full border border-gray-100/50 dark:border-gray-700/30">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className={`relative overflow-x-auto custom-scrollbar ${filtered.length > 0 ? 'min-h-[350px]' : ''}`}>
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-l-2xl">ID & Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Destination</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plate No</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right rounded-r-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className={`transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8"><div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</td>
                </tr>
              ) : (
                filtered.map((budget) => (
                  <tr key={budget.id} className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${getRowIndicatorStyle(budget.status)}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <LuWallet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">#{budget.id}</p>
                          {budget.purchase_order_id ? (
                            <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 uppercase tracking-widest">
                              P.O. #{budget.purchase_order_id}
                            </span>
                          ) : budget.work_order_id ? (
                            <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-widest">
                              W.O. #{(budget.workOrder as any)?.wo_number || budget.work_order_id}
                            </span>
                          ) : budget.trip_ticket_id ? (
                            <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-widest">
                              DTT #{(budget.trip_ticket ?? budget.tripTicket)?.control_no || budget.trip_ticket_id}
                            </span>
                          ) : (
                            <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 uppercase tracking-widest">
                              General
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">
                        {budget.travel_date || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">
                        {budget.destination || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">
                        {budget.plate_number || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-gray-950 dark:text-white leading-tight">
                        ₱{Number(budget.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={budget.status} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedBudget(budget)}
                      >
                        <LuEye className="w-4 h-4 mr-2" /> Details
                      </Button>
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
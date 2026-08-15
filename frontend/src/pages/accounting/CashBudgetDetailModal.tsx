import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cashBudgetApi } from '../../api/operations';
import type { CashBudgetRequest } from '../../types';
import { PipelineVisualizer } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { StatusBadge } from './CashBudgets';

// Pre-defined regex to avoid bundler parser ambiguity inside JSX attribute handlers
const NUMERIC_KEY_RE = /^[0-9.]$/;

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft — Awaiting Operations Approval',
  pending_accounting: 'Forwarded to Accounting',
  pending_super_admin: 'Awaiting Super Admin Approval',
  approved: 'Approved — Ready for Disbursement',
  disbursed: 'Disbursed',
};

export default function CashBudgetDetailModal({ budget, onClose }: { budget: CashBudgetRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const canReviewAccounting = user?.role === 'super_admin' || user?.role === 'accounting_executive';
  const canFinalize = user?.role === 'super_admin' || user?.role === 'executive_vice_president';
  const canForwardDraft = !!user && [
    'super_admin',
    'executive_vice_president',
    'operations_manager',
    'dispatcher',
    'service_adviser',
    'logistics_in_charge',
    'purchasing_manager',
    'accounting_executive',
  ].includes(user.role);
  const isOwner = Number(budget.prepared_by) === Number(user?.id);

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
    budget.status === 'draft' &&
    (isOwner || canFinalize);

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

  // Draft edits follow the live breakdown. Once submitted, the approved total
  // is the source of truth (linked PO/WO budgets may have no local breakdown).
  useEffect(() => {
    if (budget.status === 'draft' && canEdit) {
      setDisbursedAmount(formatMoneyInput(liveTotal.toString()));
    } else if (budget.status !== 'disbursed') {
      setDisbursedAmount(formatMoneyInput(Number(budget.total_amount || 0).toString()));
    }
  }, [liveTotal, budget.status, budget.total_amount, canEdit]);

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
      ...(canEdit ? getPayload() : {}),
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
    }),
    onSuccess: () => {
      toast.success('Budget disbursed! Financial transaction created.');
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
            pipelineType={budget.purchase_order_id ? 'maintenance' : 'transaction'}
            currentStatus={
              budget.purchase_order_id
                ? (budget.status === 'disbursed' ? 'disbursed' : 'budget_pending')
                : (budget.status === 'draft' || budget.status === 'pending_accounting' || (budget.status as string) === 'pending_super_admin'
                    ? 'budget_pending'
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
                    <span className="block font-bold text-gray-400 uppercase text-[9px] tracking-wider">Route (Pickup → Destination → Dropoff)</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {[(budget.trip_ticket ?? budget.tripTicket)?.pick_up, (budget.trip_ticket ?? budget.tripTicket)?.destination, (budget.trip_ticket ?? budget.tripTicket)?.drop_off].filter(x => x && x !== 'TBD' && x !== 'TBA').join(' → ') || budget.destination || 'TBA'}
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
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₱ {(Number(budget.autosweep || 0) + Number(budget.easytrip || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
          {budget.status === 'approved' && canFinalize && (
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
                    <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-widest">Internal disbursement invoice</p>
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
          {budget.status === 'draft' && canForwardDraft && (
            <>
              {(isOwner || canFinalize) && (
                <button
                  onClick={() => declineMutation.mutate()}
                  disabled={isPending}
                  className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                >
                  {declineMutation.isPending ? 'Deleting...' : 'Delete Draft'}
                </button>
              )}
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
          {budget.status === 'pending_accounting' && canReviewAccounting && (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={isPending}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95"
            >
              {approveMutation.isPending ? 'Forwarding...' : 'Approve & Forward to Super Admin'}
            </button>
          )}

          {/* Super Admin: Approve */}
          {(budget.status as string) === 'pending_super_admin' && canFinalize && (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={isPending}
              className="px-6 py-3 bg-fuchsia-600 text-white hover:bg-fuchsia-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-fuchsia-600/20 active:scale-95"
            >
              {approveMutation.isPending ? 'Approving...' : 'Final Approval'}
            </button>
          )}

          {/* Operations / Cash Budgets: Disburse */}
          {budget.status === 'approved' && canFinalize && (
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

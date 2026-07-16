import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuLink } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { cashBudgetApi, tripTicketApi } from '../../api/operations';
import { purchaseOrderApi } from '../../api/purchaseOrders';
import { workOrderApi } from '../../api/workOrders';
import { Modal, Button } from '../../components/ui';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

// Pre-defined regex to avoid bundler parser ambiguity inside JSX attribute handlers
const NUMERIC_KEY_RE = /^[0-9.]$/;

export default function CreateCashBudgetModal({ onClose }: { onClose: () => void }) {
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

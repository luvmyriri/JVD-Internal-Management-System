import { useMemo, useState } from 'react';
import {
  LuArrowLeft,
  LuCalendarRange,
  LuCircleAlert,
  LuClipboardCheck,
  LuPackageCheck,
  LuPlus,
  LuReceiptText,
  LuTrash2,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { formatMoneyInput, parseMoneyInput } from '../../../utils';
import type { PreparedServiceLine, ServiceWorkflowProps } from './workflowTypes';
import { toIsoDateTime } from './workflowTypes';

interface DeliverableRow {
  id: string;
  description: string;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';
const labelClass = 'block text-xs font-bold text-ink';

const makeDeliverable = (): DeliverableRow => ({
  id: globalThis.crypto?.randomUUID?.() || `deliverable-${Date.now()}-${Math.random()}`,
  description: '',
});

const numericMoney = (value: string): number => Number(parseMoneyInput(value)) || 0;

export function CustomArrangementWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const [arrangementName, setArrangementName] = useState('');
  const [requirements, setRequirements] = useState('');
  const [targetStartsAt, setTargetStartsAt] = useState('');
  const [targetEndsAt, setTargetEndsAt] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [supplierCost, setSupplierCost] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([makeDeliverable()]);

  const quotedAmount = numericMoney(quotedPrice);
  const supplierAmount = numericMoney(supplierCost);
  const margin = quotedAmount - supplierAmount;
  const completeDeliverables = useMemo(
    () => deliverables.map((item) => item.description.trim()).filter(Boolean),
    [deliverables],
  );

  const updateDeliverable = (id: string, description: string) => {
    setDeliverables((current) => current.map((item) => item.id === id ? { ...item, description } : item));
  };

  const removeDeliverable = (id: string) => {
    setDeliverables((current) => current.filter((item) => item.id !== id));
  };

  const validate = (): string | null => {
    if (!arrangementName.trim()) return 'Give this arrangement a specific name.';
    if (!requirements.trim()) return 'Document the customer requirements and scope boundaries.';
    if (requirements.trim().length > 5000) return 'Requirements must be 5,000 characters or fewer.';
    if (completeDeliverables.length < 1) return 'Add at least one concrete deliverable.';
    if (deliverables.some((item) => item.description.length > 500)) return 'Each deliverable must be 500 characters or fewer.';
    if (Boolean(targetStartsAt) !== Boolean(targetEndsAt)) return 'Set both target dates, or leave both unassigned.';
    if (targetStartsAt && targetEndsAt && new Date(targetEndsAt) <= new Date(targetStartsAt)) return 'The target end must be after the target start.';
    if (supplierReference.length > 100) return 'Supplier reference must be 100 characters or fewer.';
    if (supplierCost && supplierAmount < 0) return 'Supplier cost cannot be negative.';
    if (quotedAmount <= 0) return 'Enter a positive customer price.';
    return null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const metadata: Record<string, unknown> = {
      arrangement_name: arrangementName.trim(),
      requirements: requirements.trim(),
      target_starts_at: toIsoDateTime(targetStartsAt),
      target_ends_at: toIsoDateTime(targetEndsAt),
      supplier_reference: supplierReference.trim() || undefined,
      deliverables: completeDeliverables,
      supplier_cost: supplierCost ? supplierAmount : undefined,
    };

    const line: PreparedServiceLine = {
      title: arrangementName.trim(),
      description: requirements.trim(),
      price: quotedAmount,
      serviceType: 'custom_arrangement',
      metadata,
      customDetail: {
        category: 'Custom Arrangement',
        booking_reference_code: supplierReference.trim() || undefined,
        booking_details: requirements.trim(),
        category_meta: metadata,
        additional_remarks: `Deliverables: ${completeDeliverables.join('; ')}`,
      },
      serviceDate: toIsoDateTime(targetStartsAt),
    };

    onAdd(line);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <header className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-950 via-slate-950 to-slate-900 p-5 text-white shadow-sm sm:p-6">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-violet-200 transition hover:text-white">
          <LuArrowLeft className="h-4 w-4" /> All service workflows
        </button>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">Scoped custom arrangement</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Turn an exception into a controlled commitment.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Record exactly what the customer asked for, what JVD will deliver, and the commercial terms attached to it.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-slate-200">
            <span className="block text-[9px] font-black uppercase tracking-widest text-violet-200">Workflow boundary</span>
            Use only when no dedicated service engine fits
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40"><LuClipboardCheck className="h-5 w-5" /></span>
              <div><h3 className="font-black text-ink">Customer requirement brief</h3><p className="text-xs text-muted">Define the requested outcome and explicitly state the limits of the engagement.</p></div>
            </div>
            <label className={labelClass}>Arrangement name<input maxLength={160} className={inputClass} value={arrangementName} onChange={(event) => setArrangementName(event.target.value)} placeholder="e.g. Executive delegation arrival support" /></label>
            <label className={`${labelClass} mt-4`}>Requirements and scope<textarea maxLength={5000} rows={8} className={inputClass} value={requirements} onChange={(event) => setRequirements(event.target.value)} placeholder="State the requested outcome, included work, constraints, assumptions, and anything explicitly outside scope." /></label>
            <div className="mt-2 flex justify-between text-[10px] text-muted"><span>Write this so another staff member can fulfill it without guessing.</span><span>{requirements.length}/5,000</span></div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><LuPackageCheck className="h-5 w-5" /></span><div><h3 className="font-black text-ink">Concrete deliverables</h3><p className="text-xs text-muted">Each row is a customer-visible outcome, not an internal activity.</p></div></div>
              <button type="button" onClick={() => setDeliverables((current) => [...current, makeDeliverable()])} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-violet-600 transition hover:border-violet-300"><LuPlus /> Deliverable</button>
            </div>
            <div className="space-y-3">
              {deliverables.map((deliverable, index) => (
                <div key={deliverable.id} className="grid grid-cols-[36px_1fr_36px] items-start gap-3 rounded-2xl border border-border bg-surface-alt p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-xs font-black text-violet-600">{index + 1}</span>
                  <label className={labelClass}>Committed outcome<textarea maxLength={500} rows={2} className={inputClass} value={deliverable.description} onChange={(event) => updateDeliverable(deliverable.id, event.target.value)} placeholder="e.g. Airport representative present before the confirmed arrival time" /></label>
                  <button type="button" aria-label={`Remove deliverable ${index + 1}`} disabled={deliverables.length === 1} onClick={() => removeDeliverable(deliverable.id)} className="mt-6 grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><LuTrash2 /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40"><LuCalendarRange className="h-5 w-5" /></span>
              <div><h3 className="font-black text-ink">Target delivery window</h3><p className="text-xs text-muted">Use a target window only when the arrangement is tied to a concrete schedule.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Target start<input type="datetime-local" className={inputClass} value={targetStartsAt} onChange={(event) => setTargetStartsAt(event.target.value)} /></label>
              <label className={labelClass}>Target completion<input type="datetime-local" min={targetStartsAt || undefined} className={inputClass} value={targetEndsAt} onChange={(event) => setTargetEndsAt(event.target.value)} /></label>
            </div>
            <label className={`${labelClass} mt-4`}>Supplier reference<input maxLength={100} className={inputClass} value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} placeholder="Optional supplier quote, confirmation, or case reference" /></label>
            {Boolean(targetStartsAt) !== Boolean(targetEndsAt) && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-700"><LuCircleAlert /> Add the other target date to create a complete delivery window.</p>}
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-surface p-5 xl:sticky xl:top-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40"><LuReceiptText /></span><div><p className="text-[10px] font-black uppercase tracking-widest text-muted">Commercial terms</p><h3 className="font-black text-ink">Price and contract</h3></div></div>
          <label className={labelClass}>Customer price<input inputMode="decimal" className={inputClass} value={quotedPrice} onChange={(event) => setQuotedPrice(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <label className={labelClass}>Supplier cost, if known<input inputMode="decimal" className={inputClass} value={supplierCost} onChange={(event) => setSupplierCost(formatMoneyInput(event.target.value))} placeholder="Optional" /></label>
          <div className="space-y-3 border-y border-border py-4 text-sm">
            <div className="flex justify-between text-muted"><span>Customer price</span><strong className="text-ink">₱{quotedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
            <div className="flex justify-between text-muted"><span>Supplier cost</span><strong className="text-ink">₱{supplierAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
            <div className={`flex justify-between font-black ${margin < 0 ? 'text-red-600' : 'text-emerald-600'}`}><span>Gross margin</span><span>₱{margin.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
          </div>
          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/20"><LuPlus /> Add arrangement to order</button>
          <p className="text-[11px] leading-4 text-muted">This creates one scoped transaction line. It does not create a reusable catalog product.</p>
        </aside>
      </div>
    </form>
  );
}

export default CustomArrangementWorkflow;

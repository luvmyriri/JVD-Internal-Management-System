import { useMemo, useState } from 'react';
import {
  LuArrowLeft,
  LuCalendarClock,
  LuCircleAlert,
  LuClipboardCheck,
  LuMapPin,
  LuReceipt,
  LuSparkles,
  LuTicket,
  LuUsers,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { formatMoneyInput, parseMoneyInput } from '../../../utils';
import {
  splitLines,
  toIsoDateTime,
  type PreparedServiceLine,
  type ServiceWorkflowProps,
} from './workflowTypes';

interface ActivityMetadata extends Record<string, unknown> {
  activity_name: string;
  location: string;
  session_starts_at: string;
  session_ends_at?: string;
  capacity: number;
  participant_count: number;
  supplier_reference?: string;
  participants: Array<{ name: string }>;
  requirements: string[];
  supplier_cost: number;
}

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-amber-200 bg-white px-3.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 dark:border-amber-950 dark:bg-slate-950 dark:text-white';
const textareaClass = `${inputClass} h-auto min-h-28 py-3`;
const labelClass = 'block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400';
const moneyValue = (value: string): number => Number(parseMoneyInput(value));

export default function ActivityBookingWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const [activityName, setActivityName] = useState('');
  const [location, setLocation] = useState('');
  const [sessionStartsAt, setSessionStartsAt] = useState('');
  const [sessionEndsAt, setSessionEndsAt] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [participantRoster, setParticipantRoster] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [supplierCost, setSupplierCost] = useState('');
  const [requirements, setRequirements] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const participantNames = useMemo(() => splitLines(participantRoster), [participantRoster]);
  const participantCount = participantNames.length;
  const capacityCount = Number(capacity) || 0;
  const remainingSlots = capacityCount - participantCount;
  const occupancyPercent = capacityCount > 0 ? Math.min(100, (participantCount / capacityCount) * 100) : 0;
  const isOverCapacity = capacityCount > 0 && participantCount > capacityCount;
  const cost = supplierCost === '' ? Number.NaN : moneyValue(supplierCost);
  const price = sellingPrice === '' ? Number.NaN : moneyValue(sellingPrice);
  const margin = Number.isFinite(price) && Number.isFinite(cost) ? price - cost : null;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activityName.trim() || !location.trim()) return toast.error('Enter the activity name and location.');
    if (!sessionStartsAt) return toast.error('Enter the activity session start.');
    if (sessionEndsAt && new Date(sessionEndsAt) <= new Date(sessionStartsAt)) return toast.error('Session end must be after session start.');
    if (!Number.isInteger(capacityCount) || capacityCount < 1) return toast.error('Capacity must be at least one.');
    if (participantCount < 1) return toast.error('Add every named activity participant.');
    if (participantCount > capacityCount) return toast.error(`Participant count exceeds capacity by ${participantCount - capacityCount}.`);
    if (!Number.isFinite(cost) || cost < 0) return toast.error('Enter the supplier cost, including zero when appropriate.');
    if (!Number.isFinite(price) || price <= 0) return toast.error('Enter a total selling price greater than zero.');

    const startsAt = toIsoDateTime(sessionStartsAt)!;
    const metadata: ActivityMetadata = {
      activity_name: activityName.trim(),
      location: location.trim(),
      session_starts_at: startsAt,
      session_ends_at: toIsoDateTime(sessionEndsAt),
      capacity: capacityCount,
      participant_count: participantCount,
      supplier_reference: supplierReference.trim() || undefined,
      participants: participantNames.map((name) => ({ name })),
      requirements: splitLines(requirements),
      supplier_cost: cost,
    };
    const line: PreparedServiceLine = {
      title: metadata.activity_name,
      description: `${metadata.activity_name} session in ${metadata.location} for ${participantCount} named participant${participantCount === 1 ? '' : 's'}.`,
      price,
      serviceType: 'activity_booking',
      metadata,
      customDetail: {
        category: 'Activity Booking',
        destination: metadata.location,
        booking_type: 'Activity',
        booking_reference_code: metadata.supplier_reference,
        booking_details: metadata.requirements.join('; ') || undefined,
        category_meta: metadata,
        additional_remarks: metadata.requirements.join('; ') || undefined,
      },
      serviceDate: startsAt,
      destination: metadata.location,
      paxCount: participantCount,
    };

    onAdd(line);
    toast.success('Activity added with its participant and capacity snapshot.');
    setActivityName('');
    setLocation('');
    setSessionStartsAt('');
    setSessionEndsAt('');
    setCapacity('1');
    setParticipantRoster('');
    setSupplierReference('');
    setSupplierCost('');
    setRequirements('');
    setSellingPrice('');
  };

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm dark:border-amber-950 dark:bg-slate-900">
      <header className="bg-gradient-to-r from-amber-950 via-orange-950 to-slate-950 p-6 text-white">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-200 transition hover:text-white"><LuArrowLeft /> Service desks</button>
        <div className="mt-4 flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><LuSparkles className="h-6 w-6" /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Experience fulfillment desk</p>
            <h2 className="mt-1 text-2xl font-black">Activity booking</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-amber-100/80">One scheduled session, one finite capacity, and one exact participant register.</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5 dark:border-amber-950 dark:bg-amber-950/20">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-amber-700 shadow-sm dark:bg-slate-950"><LuCalendarClock /></span>
            <div><h3 className="text-sm font-black text-slate-950 dark:text-white">Scheduled session</h3><p className="text-xs text-slate-500">Capture the supplier-confirmed place, time window, and finite capacity.</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className={`${labelClass} md:col-span-2`}>Activity name<input required maxLength={160} className={inputClass} value={activityName} onChange={(event) => setActivityName(event.target.value)} placeholder="e.g. Underground River guided tour" /></label>
            <label className={labelClass}>Location<div className="relative"><LuMapPin className="pointer-events-none absolute left-3 top-[1.3rem] h-4 w-4 text-amber-600" /><input required maxLength={160} className={`${inputClass} pl-9`} value={location} onChange={(event) => setLocation(event.target.value)} /></div></label>
            <label className={labelClass}>Session starts<input required type="datetime-local" className={inputClass} value={sessionStartsAt} onChange={(event) => setSessionStartsAt(event.target.value)} /></label>
            <label className={labelClass}>Session ends <span className="normal-case tracking-normal text-slate-400">(optional)</span><input type="datetime-local" min={sessionStartsAt || undefined} className={inputClass} value={sessionEndsAt} onChange={(event) => setSessionEndsAt(event.target.value)} /></label>
            <label className={labelClass}>Confirmed capacity<input required type="number" min="1" max="10000" className={inputClass} value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-3"><LuClipboardCheck className="h-5 w-5 text-amber-700" /><div><h3 className="text-sm font-black text-slate-950 dark:text-white">Named participant register</h3><p className="text-xs text-slate-500">Enter one full participant name per line. This list becomes the fulfillment snapshot.</p></div></div>
            <textarea className={textareaClass} value={participantRoster} onChange={(event) => setParticipantRoster(event.target.value)} placeholder="Juan Dela Cruz&#10;Maria Santos Reyes" />
          </div>
          <aside className={`rounded-2xl border p-5 ${isOverCapacity ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/25' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20'}`}>
            <div className="flex items-center justify-between"><LuUsers className={`h-6 w-6 ${isOverCapacity ? 'text-rose-700' : 'text-amber-700'}`} /><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capacity control</span></div>
            <div className="mt-4 flex items-end gap-2"><strong className="text-3xl font-black text-slate-950 dark:text-white">{participantCount}</strong><span className="pb-1 text-xs font-bold text-slate-500">of {capacityCount || 0} seats</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800"><div className={`h-full rounded-full transition-all ${isOverCapacity ? 'bg-rose-600' : 'bg-amber-500'}`} style={{ width: `${occupancyPercent}%` }} /></div>
            <p className={`mt-3 text-xs font-semibold ${isOverCapacity ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}`}>{isOverCapacity ? `${Math.abs(remainingSlots)} participant${Math.abs(remainingSlots) === 1 ? '' : 's'} over capacity.` : `${Math.max(0, remainingSlots)} slot${Math.max(0, remainingSlots) === 1 ? '' : 's'} remain.`}</p>
          </aside>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/35 md:grid-cols-3">
          <label className={labelClass}>Supplier reference<input maxLength={100} className={inputClass} value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} /></label>
          <label className={labelClass}>Supplier cost (PHP)<input required inputMode="decimal" className={inputClass} value={supplierCost} onChange={(event) => setSupplierCost(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <label className={labelClass}>Total selling price (PHP)<input required inputMode="decimal" className={inputClass} value={sellingPrice} onChange={(event) => setSellingPrice(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <label className={`${labelClass} md:col-span-2`}>Participant requirements (one per line)<textarea className={textareaClass} value={requirements} onChange={(event) => setRequirements(event.target.value)} placeholder="Valid government ID&#10;Closed footwear&#10;Signed activity waiver" /></label>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"><LuReceipt /> Gross margin</div>
            <p className={`mt-3 text-xl font-black ${margin !== null && margin < 0 ? 'text-rose-600' : 'text-amber-700 dark:text-amber-400'}`}>{margin === null ? '—' : `₱${margin.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}</p>
            <p className="mt-1 text-[10px] text-slate-400">Selling price less supplier cost</p>
          </div>
        </section>

        {isOverCapacity && <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200"><LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Remove participants or increase the supplier-confirmed capacity before adding this booking.</div>}

        <div className="flex flex-col-reverse gap-3 border-t border-amber-100 pt-5 sm:flex-row sm:justify-end dark:border-amber-950">
          <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-800"><LuTicket /> Add activity booking</button>
        </div>
      </div>
    </form>
  );
}

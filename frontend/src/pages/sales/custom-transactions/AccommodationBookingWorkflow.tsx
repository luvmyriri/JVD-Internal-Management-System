import { useMemo, useState } from 'react';
import {
  LuArrowLeft,
  LuBedDouble,
  LuCalendarRange,
  LuCircleAlert,
  LuClipboardList,
  LuHotel,
  LuReceipt,
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

interface AccommodationMetadata extends Record<string, unknown> {
  property_name: string;
  city: string;
  check_in: string;
  check_out: string;
  room_type: string;
  room_count: number;
  adult_count: number;
  child_count: number;
  confirmation_number?: string;
  free_cancellation_until?: string;
  guest_names: string[];
  meal_plan: string[];
  supplier_cost: number;
}

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-emerald-200 bg-white px-3.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 dark:border-emerald-950 dark:bg-slate-950 dark:text-white';
const textareaClass = `${inputClass} h-auto min-h-28 py-3`;
const labelClass = 'block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400';

const moneyValue = (value: string): number => Number(parseMoneyInput(value));

export default function AccommodationBookingWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const [propertyName, setPropertyName] = useState('');
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('');
  const [roomCount, setRoomCount] = useState('1');
  const [adultCount, setAdultCount] = useState('1');
  const [childCount, setChildCount] = useState('0');
  const [guestRoster, setGuestRoster] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [cancellationDeadline, setCancellationDeadline] = useState('');
  const [mealPlan, setMealPlan] = useState('');
  const [supplierCost, setSupplierCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [notes, setNotes] = useState('');

  const guestNames = useMemo(() => splitLines(guestRoster), [guestRoster]);
  const expectedGuests = Math.max(0, Number(adultCount) || 0) + Math.max(0, Number(childCount) || 0);
  const roomQuantity = Number(roomCount) || 0;
  const cost = supplierCost === '' ? Number.NaN : moneyValue(supplierCost);
  const price = sellingPrice === '' ? Number.NaN : moneyValue(sellingPrice);
  const margin = Number.isFinite(price) && Number.isFinite(cost) ? price - cost : null;
  const rosterComplete = expectedGuests > 0 && guestNames.length === expectedGuests;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!propertyName.trim() || !city.trim()) return toast.error('Enter the property name and city.');
    if (!checkIn || !checkOut) return toast.error('Enter both check-in and check-out dates.');
    if (new Date(checkOut) <= new Date(checkIn)) return toast.error('Check-out must be after check-in.');
    if (!roomType.trim()) return toast.error('Enter the confirmed room type.');
    if (!Number.isInteger(roomQuantity) || roomQuantity < 1) return toast.error('Room count must be at least one.');

    const adults = Number(adultCount);
    const children = Number(childCount);
    if (!Number.isInteger(adults) || adults < 1) return toast.error('At least one adult guest is required.');
    if (!Number.isInteger(children) || children < 0) return toast.error('Child count cannot be negative.');
    if (!rosterComplete) return toast.error(`Add exactly ${expectedGuests} named guest${expectedGuests === 1 ? '' : 's'} to match the occupancy.`);
    if (cancellationDeadline && new Date(cancellationDeadline) > new Date(`${checkIn}T23:59:59`)) {
      return toast.error('The free-cancellation deadline cannot be after check-in.');
    }
    if (!Number.isFinite(cost) || cost < 0) return toast.error('Enter the supplier cost, including zero when appropriate.');
    if (!Number.isFinite(price) || price <= 0) return toast.error('Enter a total selling price greater than zero.');

    const metadata: AccommodationMetadata = {
      property_name: propertyName.trim(),
      city: city.trim(),
      check_in: checkIn,
      check_out: checkOut,
      room_type: roomType.trim(),
      room_count: roomQuantity,
      adult_count: adults,
      child_count: children,
      confirmation_number: confirmationNumber.trim() || undefined,
      free_cancellation_until: toIsoDateTime(cancellationDeadline),
      guest_names: guestNames,
      meal_plan: splitLines(mealPlan),
      supplier_cost: cost,
    };
    const line: PreparedServiceLine = {
      title: `${metadata.property_name} — ${metadata.room_type}`,
      description: notes.trim() || `${metadata.room_count} room${metadata.room_count === 1 ? '' : 's'} for ${expectedGuests} named guest${expectedGuests === 1 ? '' : 's'} in ${metadata.city}.`,
      price,
      serviceType: 'accommodation_booking',
      metadata,
      customDetail: {
        category: 'Accommodation Booking',
        destination: metadata.city,
        accommodation_type: metadata.room_type,
        booking_type: 'Accommodation',
        booking_reference_code: metadata.confirmation_number,
        booking_details: notes.trim() || undefined,
        category_meta: metadata,
        additional_remarks: notes.trim() || undefined,
      },
      serviceDate: checkIn,
      destination: metadata.city,
      paxCount: expectedGuests,
    };

    onAdd(line);
    toast.success('Accommodation added with an exact rooming and commercial snapshot.');
    setPropertyName('');
    setCity('');
    setCheckIn('');
    setCheckOut('');
    setRoomType('');
    setRoomCount('1');
    setAdultCount('1');
    setChildCount('0');
    setGuestRoster('');
    setConfirmationNumber('');
    setCancellationDeadline('');
    setMealPlan('');
    setSupplierCost('');
    setSellingPrice('');
    setNotes('');
  };

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-950 dark:bg-slate-900">
      <header className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 p-6 text-white">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-200 transition hover:text-white"><LuArrowLeft /> Service desks</button>
        <div className="mt-4 flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><LuHotel className="h-6 w-6" /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Lodging fulfillment desk</p>
            <h2 className="mt-1 text-2xl font-black">Accommodation booking</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-100/80">Stay dates, room inventory, the exact rooming list, cancellation terms, and commercial margin travel together.</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6">
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/55 p-5 dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-950"><LuCalendarRange /></span>
            <div><h3 className="text-sm font-black text-slate-950 dark:text-white">Stay and room commitment</h3><p className="text-xs text-slate-500">Use the supplier-confirmed property, dates, and inventory.</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className={`${labelClass} md:col-span-2`}>Property name<input maxLength={160} required className={inputClass} value={propertyName} onChange={(event) => setPropertyName(event.target.value)} placeholder="Hotel or resort name" /></label>
            <label className={labelClass}>City / locality<input maxLength={120} required className={inputClass} value={city} onChange={(event) => setCity(event.target.value)} /></label>
            <label className={labelClass}>Check-in<input required type="date" className={inputClass} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label>
            <label className={labelClass}>Check-out<input required type="date" min={checkIn || undefined} className={inputClass} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
            <label className={labelClass}>Room type<input maxLength={120} required className={inputClass} value={roomType} onChange={(event) => setRoomType(event.target.value)} placeholder="Deluxe twin" /></label>
            <label className={labelClass}>Room count<input required type="number" min="1" max="100" className={inputClass} value={roomCount} onChange={(event) => setRoomCount(event.target.value)} /></label>
            <label className={labelClass}>Adults<input required type="number" min="1" max="500" className={inputClass} value={adultCount} onChange={(event) => setAdultCount(event.target.value)} /></label>
            <label className={labelClass}>Children<input required type="number" min="0" max="500" className={inputClass} value={childCount} onChange={(event) => setChildCount(event.target.value)} /></label>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="mb-4 flex items-center gap-3"><LuClipboardList className="h-5 w-5 text-emerald-700" /><div><h3 className="text-sm font-black text-slate-950 dark:text-white">Named guest roster</h3><p className="text-xs text-slate-500">Enter one full guest name per line. The count must match adults plus children.</p></div></div>
            <textarea className={textareaClass} value={guestRoster} onChange={(event) => setGuestRoster(event.target.value)} placeholder="Maria Santos Reyes&#10;Juan Dela Cruz&#10;Ana Dela Cruz" />
          </div>
          <aside className={`rounded-2xl border p-5 ${rosterComplete ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/25' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20'}`}>
            <LuUsers className={`h-6 w-6 ${rosterComplete ? 'text-emerald-700' : 'text-amber-700'}`} />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Rooming-list control</p>
            <div className="mt-2 flex items-end gap-2"><strong className="text-3xl font-black text-slate-950 dark:text-white">{guestNames.length}</strong><span className="pb-1 text-xs font-bold text-slate-500">of {expectedGuests} named</span></div>
            <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{rosterComplete ? 'The guest roster exactly matches the declared occupancy.' : `Add ${Math.max(0, expectedGuests - guestNames.length)} more name${Math.max(0, expectedGuests - guestNames.length) === 1 ? '' : 's'} or correct the occupancy.`}</p>
          </aside>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/35 md:grid-cols-3">
          <label className={labelClass}>Confirmation number<input maxLength={100} className={inputClass} value={confirmationNumber} onChange={(event) => setConfirmationNumber(event.target.value)} /></label>
          <label className={labelClass}>Free-cancellation deadline<input type="datetime-local" className={inputClass} value={cancellationDeadline} onChange={(event) => setCancellationDeadline(event.target.value)} /></label>
          <label className={labelClass}>Meal plan (one inclusion per line)<textarea className={textareaClass} value={mealPlan} onChange={(event) => setMealPlan(event.target.value)} placeholder="Daily breakfast&#10;Welcome dinner" /></label>
          <label className={labelClass}>Supplier cost (PHP)<input required inputMode="decimal" className={inputClass} value={supplierCost} onChange={(event) => setSupplierCost(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <label className={labelClass}>Total selling price (PHP)<input required inputMode="decimal" className={inputClass} value={sellingPrice} onChange={(event) => setSellingPrice(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"><LuReceipt /> Gross margin</div>
            <p className={`mt-2 text-xl font-black ${margin !== null && margin < 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}`}>{margin === null ? '—' : `₱${margin.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}</p>
            <p className="mt-1 text-[10px] text-slate-400">Selling price less supplier cost</p>
          </div>
          <label className={`${labelClass} md:col-span-3`}>Booking notes<textarea className={textareaClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Rate inclusions, bed configuration, special handling, or supplier terms." /></label>
        </section>

        {margin !== null && margin < 0 && <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200"><LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> The selling price is below supplier cost. Confirm that the negative margin is intentional before adding this booking.</div>}

        <div className="flex flex-col-reverse gap-3 border-t border-emerald-100 pt-5 sm:flex-row sm:justify-end dark:border-emerald-950">
          <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-800"><LuBedDouble /> Add accommodation</button>
        </div>
      </div>
    </form>
  );
}

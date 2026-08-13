import { useMemo, useState } from 'react';
import { LuArrowLeft, LuPlane, LuPlus, LuTrash2 } from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { PassengerInput } from '../../../api/contracts';
import { formatMoneyInput, parseMoneyInput } from '../../../utils';
import PassengerRosterEditor from '../components/PassengerRosterEditor';
import type { ServiceWorkflowProps } from './workflowTypes';
import { toIsoDateTime } from './workflowTypes';

interface FlightSegment {
  origin: string;
  destination: string;
  departureAt: string;
  airline: string;
  flightNumber: string;
}

const blankSegment = (): FlightSegment => ({ origin: '', destination: '', departureAt: '', airline: '', flightNumber: '' });
const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100 dark:border-sky-900 dark:bg-slate-950 dark:text-white dark:focus:ring-sky-950';
const textareaClass = `${inputClass} h-auto min-h-24 py-3`;
const labelClass = 'text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400';

const passengerName = (person: PassengerInput) => `${person.first_name} ${person.last_name}`.replace(/\s+/g, ' ').trim();

export default function FlightBookingWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const [tripType, setTripType] = useState<'one_way' | 'round_trip' | 'multi_city'>('one_way');
  const [segments, setSegments] = useState<FlightSegment[]>([blankSegment()]);
  const [returnAt, setReturnAt] = useState('');
  const [pnr, setPnr] = useState('');
  const [fareClass, setFareClass] = useState('');
  const [baggage, setBaggage] = useState('');
  const [ticketingDeadline, setTicketingDeadline] = useState('');
  const [fareConditions, setFareConditions] = useState('');
  const [passengers, setPassengers] = useState<PassengerInput[]>([]);
  const [sellingPrice, setSellingPrice] = useState('');
  const [supplierCost, setSupplierCost] = useState('');
  const [notes, setNotes] = useState('');

  const effectiveSegments = tripType === 'multi_city' ? segments : segments.slice(0, 1);
  const routeLabel = useMemo(() => effectiveSegments
    .filter((segment) => segment.origin && segment.destination)
    .map((segment) => `${segment.origin.toUpperCase()}–${segment.destination.toUpperCase()}`)
    .join(' / '), [effectiveSegments]);

  const updateSegment = (index: number, patch: Partial<FlightSegment>) => {
    setSegments((current) => current.map((segment, itemIndex) => itemIndex === index ? { ...segment, ...patch } : segment));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const price = Number(parseMoneyInput(sellingPrice));
    const cost = supplierCost ? Number(parseMoneyInput(supplierCost)) : undefined;
    const namedPassengers = passengers.map(passengerName).filter(Boolean);
    const requiredSegments = tripType === 'multi_city' ? segments : segments.slice(0, 1);

    if (!Number.isFinite(price) || price <= 0) return toast.error('Enter the total selling fare.');
    if (namedPassengers.length < 1) return toast.error('Add every named flight passenger.');
    if (tripType === 'multi_city' && requiredSegments.length < 2) return toast.error('A multi-city booking needs at least two flight segments.');
    if (requiredSegments.some((segment) => !segment.origin.trim() || !segment.destination.trim() || !segment.departureAt)) {
      return toast.error('Every flight segment needs origin, destination, and departure time.');
    }
    if (tripType === 'round_trip' && !returnAt) return toast.error('Add the return flight date and time.');
    if (returnAt && new Date(returnAt) <= new Date(requiredSegments[0].departureAt)) return toast.error('Return must be after departure.');

    const first = requiredSegments[0];
    const last = requiredSegments.at(-1)!;
    const title = routeLabel ? `${routeLabel} flight booking` : 'Flight booking';
    const typedSegments = requiredSegments.map((segment) => ({
      origin: segment.origin.trim().toUpperCase(),
      destination: segment.destination.trim().toUpperCase(),
      departure_at: toIsoDateTime(segment.departureAt),
      airline: segment.airline.trim() || undefined,
      flight_number: segment.flightNumber.trim() || undefined,
    }));

    onAdd({
      title,
      description: notes.trim() || `${tripType.replaceAll('_', ' ')} flight for ${namedPassengers.length} passenger(s).`,
      price,
      serviceType: 'flight_booking',
      metadata: {
        trip_type: tripType,
        origin: first.origin.trim().toUpperCase(),
        destination: last.destination.trim().toUpperCase(),
        departure_at: toIsoDateTime(first.departureAt),
        return_at: tripType === 'round_trip' ? toIsoDateTime(returnAt) : undefined,
        airline: first.airline.trim() || undefined,
        flight_number: first.flightNumber.trim() || undefined,
        pnr: pnr.trim() || undefined,
        fare_class: fareClass.trim() || undefined,
        baggage_allowance: baggage.trim() || undefined,
        ticketing_deadline: toIsoDateTime(ticketingDeadline),
        passenger_count: namedPassengers.length,
        passengers: namedPassengers.map((name) => ({ name, type: 'adult' })),
        fare_conditions: fareConditions.split('\n').map((row) => row.trim()).filter(Boolean),
        segments: typedSegments,
        supplier_cost: cost,
      },
      customDetail: {
        category: 'Flight',
        booking_type: 'Flight',
        destination: last.destination.trim().toUpperCase(),
        booking_reference_code: pnr.trim() || undefined,
        booking_details: notes.trim() || undefined,
        category_meta: { trip_type: tripType, segments: typedSegments, fare_class: fareClass, baggage_allowance: baggage },
      },
      passengers,
      serviceDate: first.departureAt,
      destination: last.destination.trim().toUpperCase(),
      paxCount: namedPassengers.length,
    });
    toast.success('Flight booking added with its passenger and fare snapshot.');
    setPassengers([]);
    setPnr('');
    setSellingPrice('');
  };

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-sm dark:border-sky-900 dark:bg-slate-900">
      <header className="bg-gradient-to-r from-sky-950 to-blue-900 p-6 text-white">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-200"><LuArrowLeft /> Service desks</button>
        <div className="mt-4 flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><LuPlane className="h-6 w-6" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Air fulfillment desk</p><h2 className="mt-1 text-2xl font-black">Flight booking</h2><p className="mt-1 text-xs leading-5 text-sky-100/80">Route segments, ticketing deadline, fare rules, PNR, baggage, and named passengers are recorded together.</p></div></div>
      </header>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className={labelClass}>Journey type<select className={inputClass} value={tripType} onChange={(event) => { const next = event.target.value as typeof tripType; setTripType(next); if (next === 'multi_city' && segments.length < 2) setSegments([segments[0], blankSegment()]); }}><option value="one_way">One way</option><option value="round_trip">Round trip</option><option value="multi_city">Multi-city</option></select></label>
          <label className={labelClass}>Supplier PNR / locator<input className={inputClass} value={pnr} onChange={(event) => setPnr(event.target.value)} /></label>
          <label className={labelClass}>Fare class<input className={inputClass} value={fareClass} onChange={(event) => setFareClass(event.target.value)} placeholder="Economy / Y" /></label>
        </div>

        <section className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-950 dark:bg-sky-950/20">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-950 dark:text-white">Flight segment{tripType === 'multi_city' ? 's' : ''}</h3><p className="text-xs text-slate-500">Use airport codes and the local departure schedule.</p></div>{tripType === 'multi_city' && <button type="button" onClick={() => setSegments((current) => [...current, blankSegment()])} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white"><LuPlus /> Segment</button>}</div>
          {effectiveSegments.map((segment, index) => <div key={index} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950 md:grid-cols-6">
            <label className={labelClass}>Origin<input maxLength={10} required className={inputClass} value={segment.origin} onChange={(event) => updateSegment(index, { origin: event.target.value })} placeholder="MNL" /></label>
            <label className={labelClass}>Destination<input maxLength={10} required className={inputClass} value={segment.destination} onChange={(event) => updateSegment(index, { destination: event.target.value })} placeholder="CEB" /></label>
            <label className={`${labelClass} md:col-span-2`}>Departure<input required type="datetime-local" className={inputClass} value={segment.departureAt} onChange={(event) => updateSegment(index, { departureAt: event.target.value })} /></label>
            <label className={labelClass}>Airline<input className={inputClass} value={segment.airline} onChange={(event) => updateSegment(index, { airline: event.target.value })} /></label>
            <div className="flex items-end gap-2"><label className={`${labelClass} flex-1`}>Flight no.<input className={inputClass} value={segment.flightNumber} onChange={(event) => updateSegment(index, { flightNumber: event.target.value })} /></label>{tripType === 'multi_city' && segments.length > 2 && <button aria-label={`Remove segment ${index + 1}`} type="button" onClick={() => setSegments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mb-0.5 grid h-11 w-11 place-items-center rounded-xl text-red-600 hover:bg-red-50"><LuTrash2 /></button>}</div>
          </div>)}
          {tripType === 'round_trip' && <label className={`${labelClass} block max-w-sm`}>Return flight date and time<input required type="datetime-local" min={effectiveSegments[0]?.departureAt || undefined} className={inputClass} value={returnAt} onChange={(event) => setReturnAt(event.target.value)} /></label>}
        </section>

        <PassengerRosterEditor value={passengers} onChange={setPassengers} />

        <div className="grid gap-4 md:grid-cols-3">
          <label className={labelClass}>Baggage allowance<input className={inputClass} value={baggage} onChange={(event) => setBaggage(event.target.value)} placeholder="20 kg checked + 7 kg cabin" /></label>
          <label className={labelClass}>Ticketing deadline<input type="datetime-local" className={inputClass} value={ticketingDeadline} onChange={(event) => setTicketingDeadline(event.target.value)} /></label>
          <label className={labelClass}>Total selling fare (PHP)<input required inputMode="decimal" className={inputClass} value={sellingPrice} onChange={(event) => setSellingPrice(formatMoneyInput(event.target.value))} /></label>
          <label className={labelClass}>Supplier cost (internal)<input inputMode="decimal" className={inputClass} value={supplierCost} onChange={(event) => setSupplierCost(formatMoneyInput(event.target.value))} /></label>
          <label className={`${labelClass} md:col-span-2`}>Fare conditions (one rule per line)<textarea className={textareaClass} value={fareConditions} onChange={(event) => setFareConditions(event.target.value)} placeholder="Non-refundable&#10;Change fee applies" /></label>
          <label className={`${labelClass} md:col-span-3`}>Flight notes<textarea className={textareaClass} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>

        <div className="flex justify-end border-t border-sky-100 pt-5 dark:border-sky-950"><button className="rounded-xl bg-sky-700 px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:bg-sky-800">Add flight booking</button></div>
      </div>
    </form>
  );
}

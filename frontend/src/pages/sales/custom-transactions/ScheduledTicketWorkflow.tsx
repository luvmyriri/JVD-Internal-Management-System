import { useMemo, useState } from 'react';
import {
  LuArrowLeft,
  LuCircleAlert,
  LuClock,
  LuMapPin,
  LuPlus,
  LuReceiptText,
  LuTicket,
  LuTrash2,
  LuUsersRound,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { PassengerInput } from '../../../api/contracts';
import { formatMoneyInput, parseMoneyInput } from '../../../utils';
import type { PreparedServiceLine, ServiceWorkflowProps } from './workflowTypes';
import { toIsoDateTime } from './workflowTypes';

type TransportMode = 'ferry' | 'bus' | 'rail';

interface TicketPassenger extends PassengerInput {
  rowId: string;
  seat: string;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/10';
const labelClass = 'block text-xs font-bold text-ink';

const makePassenger = (): TicketPassenger => ({
  rowId: globalThis.crypto?.randomUUID?.() || `ticket-passenger-${Date.now()}-${Math.random()}`,
  first_name: '',
  last_name: '',
  seat: '',
});

const passengerName = (passenger: TicketPassenger): string => (
  `${passenger.first_name.trim()} ${passenger.last_name.trim()}`.replace(/\s+/g, ' ').trim()
);

const moneyValue = (value: string): number => Number(parseMoneyInput(value)) || 0;

export function ScheduledTicketWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const [transportMode, setTransportMode] = useState<TransportMode>('ferry');
  const [operatorName, setOperatorName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureAt, setDepartureAt] = useState('');
  const [arrivalAt, setArrivalAt] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [passengers, setPassengers] = useState<TicketPassenger[]>([makePassenger()]);
  const [supplierCost, setSupplierCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const normalizedSeats = useMemo(
    () => passengers.map((passenger) => passenger.seat.trim().toUpperCase()).filter(Boolean),
    [passengers],
  );
  const duplicateSeats = useMemo(() => {
    const seen = new Set<string>();
    return new Set(normalizedSeats.filter((seat) => seen.has(seat) || !seen.add(seat)));
  }, [normalizedSeats]);
  const supplierAmount = moneyValue(supplierCost);
  const sellingAmount = moneyValue(sellingPrice);
  const grossMargin = sellingAmount - supplierAmount;

  const updatePassenger = (rowId: string, patch: Partial<TicketPassenger>) => {
    setPassengers((current) => current.map((passenger) => passenger.rowId === rowId ? { ...passenger, ...patch } : passenger));
  };

  const removePassenger = (rowId: string) => {
    setPassengers((current) => current.filter((passenger) => passenger.rowId !== rowId));
  };

  const validate = (): string | null => {
    if (!operatorName.trim()) return `Enter the ${transportMode} operator.`;
    if (!origin.trim() || !destination.trim()) return 'Enter both route endpoints.';
    if (origin.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase()) return 'Origin and destination must be different.';
    if (!departureAt) return 'Set the scheduled departure date and time.';
    if (arrivalAt && new Date(arrivalAt) <= new Date(departureAt)) return 'Scheduled arrival must be after departure.';
    if (passengers.length < 1) return 'Add at least one ticketed passenger.';
    if (passengers.length > 200) return 'A ticket booking can contain at most 200 passengers.';
    if (passengers.some((passenger) => !passenger.first_name.trim() || !passenger.last_name.trim())) return 'Enter the first and last name of every passenger.';
    if (passengers.some((passenger) => passengerName(passenger).length > 160)) return 'Passenger names must be 160 characters or fewer.';
    if (passengers.some((passenger) => !passenger.seat.trim())) return 'Assign one seat to every named passenger.';
    if (passengers.some((passenger) => passenger.seat.trim().length > 20)) return 'Seat labels must be 20 characters or fewer.';
    if (duplicateSeats.size > 0) return `Seat ${Array.from(duplicateSeats).join(', ')} is assigned more than once.`;
    if (supplierCost && supplierAmount < 0) return 'Supplier cost cannot be negative.';
    if (sellingAmount <= 0) return 'Enter a positive total selling price.';
    return null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const namedPassengers = passengers.map(passengerName);
    const seatAssignments = passengers.map((passenger) => ({
      seat: passenger.seat.trim().toUpperCase(),
      name: passengerName(passenger),
    }));
    const metadata: Record<string, unknown> = {
      transport_mode: transportMode,
      operator_name: operatorName.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      departure_at: toIsoDateTime(departureAt),
      arrival_at: toIsoDateTime(arrivalAt),
      booking_reference: bookingReference.trim() || undefined,
      passenger_count: passengers.length,
      passengers: namedPassengers.map((name) => ({ name })),
      seat_assignments: seatAssignments,
      supplier_cost: supplierCost ? supplierAmount : undefined,
    };
    const invoicePassengers: PassengerInput[] = passengers.map(({ rowId: _rowId, seat: _seat, ...passenger }) => passenger);
    const route = `${origin.trim()} to ${destination.trim()}`;
    const line: PreparedServiceLine = {
      title: `${operatorName.trim()} ${transportMode} · ${route}`,
      description: `${passengers.length} named ticket${passengers.length === 1 ? '' : 's'} with assigned seats.`,
      price: sellingAmount,
      serviceType: 'ticket_booking',
      metadata,
      customDetail: {
        category: 'Ticket',
        booking_type: 'Ticket',
        route,
        destination: destination.trim(),
        booking_reference_code: bookingReference.trim() || undefined,
        booking_details: `${transportMode} operated by ${operatorName.trim()}; seats ${seatAssignments.map((assignment) => `${assignment.seat} - ${assignment.name}`).join('; ')}`,
        category_meta: metadata,
      },
      passengers: invoicePassengers,
      serviceDate: toIsoDateTime(departureAt),
      destination: destination.trim(),
      paxCount: passengers.length,
    };

    onAdd(line);
    toast.success('Scheduled tickets added with unique named seat assignments.');
  };

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-cyan-200 bg-surface shadow-sm dark:border-cyan-900">
      <header className="bg-gradient-to-r from-cyan-950 via-slate-950 to-blue-950 p-5 text-white sm:p-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-200 transition hover:text-white"><LuArrowLeft /> Service desks</button>
        <div className="mt-4 flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><LuTicket className="h-6 w-6" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Scheduled transport ticketing</p><h2 className="mt-1 text-2xl font-black">Ferry, bus, or rail tickets</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-cyan-100/80">One operator schedule, one exact passenger manifest, and one unique seat for every person.</p></div></div>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <section className="space-y-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-950 dark:bg-cyan-950/20">
          <div className="grid grid-cols-3 gap-2">
            {(['ferry', 'bus', 'rail'] as TransportMode[]).map((mode) => <button key={mode} type="button" onClick={() => setTransportMode(mode)} className={`rounded-xl border px-3 py-2.5 text-xs font-black capitalize transition ${transportMode === mode ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-cyan-200 bg-surface text-muted hover:border-cyan-500 dark:border-cyan-900'}`}>{mode}</button>)}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className={labelClass}>Operator<input maxLength={160} className={inputClass} value={operatorName} onChange={(event) => setOperatorName(event.target.value)} placeholder={transportMode === 'ferry' ? 'Shipping line' : transportMode === 'bus' ? 'Bus operator' : 'Rail operator'} /></label>
            <label className={labelClass}>Origin<input maxLength={160} className={inputClass} value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Terminal or city" /></label>
            <label className={labelClass}>Destination<input maxLength={160} className={inputClass} value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Terminal or city" /></label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className={labelClass}>Scheduled departure<input type="datetime-local" className={inputClass} value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} /></label>
            <label className={labelClass}>Scheduled arrival<input type="datetime-local" min={departureAt || undefined} className={inputClass} value={arrivalAt} onChange={(event) => setArrivalAt(event.target.value)} /></label>
            <label className={labelClass}>Booking reference<input maxLength={100} className={inputClass} value={bookingReference} onChange={(event) => setBookingReference(event.target.value)} placeholder="Supplier confirmation" /></label>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted"><LuClock className="text-cyan-700" /> Use the supplier’s confirmed local schedule.</p>
        </section>

        <section className="rounded-2xl border border-border p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40"><LuUsersRound /></span><div><h3 className="text-sm font-black text-ink">Passenger-to-seat manifest</h3><p className="text-xs text-muted">Seat labels are normalized and checked for duplicates.</p></div></div><button type="button" disabled={passengers.length >= 200} onClick={() => setPassengers((current) => [...current, makePassenger()])} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-cyan-700 disabled:opacity-40"><LuPlus /> Passenger</button></div>
          <div className="space-y-3">
            {passengers.map((passenger, index) => {
              const normalizedSeat = passenger.seat.trim().toUpperCase();
              const duplicated = normalizedSeat && duplicateSeats.has(normalizedSeat);
              return <div key={passenger.rowId} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_1fr_140px_38px] ${duplicated ? 'border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' : 'border-border bg-surface-alt'}`}>
                <label className={labelClass}>First name<input maxLength={80} className={inputClass} value={passenger.first_name} onChange={(event) => updatePassenger(passenger.rowId, { first_name: event.target.value })} placeholder={`Passenger ${index + 1}`} /></label>
                <label className={labelClass}>Last name<input maxLength={80} className={inputClass} value={passenger.last_name} onChange={(event) => updatePassenger(passenger.rowId, { last_name: event.target.value })} /></label>
                <label className={labelClass}>Assigned seat<input maxLength={20} className={inputClass} value={passenger.seat} onChange={(event) => updatePassenger(passenger.rowId, { seat: event.target.value })} placeholder="12A" />{duplicated && <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-red-600"><LuCircleAlert /> Duplicate seat</span>}</label>
                <button type="button" aria-label={`Remove passenger ${index + 1}`} disabled={passengers.length === 1} onClick={() => removePassenger(passenger.rowId)} className="mt-6 grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><LuTrash2 /></button>
              </div>;
            })}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-border bg-surface-alt p-4 sm:p-5 lg:grid-cols-[1fr_1fr_1.2fr]">
          <label className={labelClass}>Supplier cost (internal)<input inputMode="decimal" className={inputClass} value={supplierCost} onChange={(event) => setSupplierCost(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <label className={labelClass}>Total selling price<input inputMode="decimal" className={inputClass} value={sellingPrice} onChange={(event) => setSellingPrice(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <div className="rounded-2xl bg-surface p-4"><p className="text-[10px] font-black uppercase tracking-widest text-muted">Commercial snapshot</p><div className="mt-2 flex justify-between text-sm text-muted"><span>{passengers.length} ticket{passengers.length === 1 ? '' : 's'}</span><strong className="text-ink">₱{sellingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div><div className={`mt-1 flex justify-between text-xs font-bold ${grossMargin < 0 ? 'text-red-600' : 'text-emerald-600'}`}><span>Gross margin</span><span>₱{grossMargin.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div></div>
        </section>

        <div className="flex justify-end border-t border-border pt-5">
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-6 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-cyan-800"><LuReceiptText /> Add scheduled tickets</button>
        </div>
        <p className="flex items-center gap-2 text-[11px] text-muted"><LuMapPin /> The external operator controls its global seat inventory; this workflow prevents duplicates within the JVD transaction manifest.</p>
      </div>
    </form>
  );
}

export default ScheduledTicketWorkflow;

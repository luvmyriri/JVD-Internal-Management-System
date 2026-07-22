import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuArrowLeft,
  LuBus,
  LuCalendarClock,
  LuCircleAlert,
  LuCircleCheck,
  LuMapPin,
  LuPlus,
  LuRoute,
  LuTrash2,
  LuUserRound,
  LuUsersRound,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { charterApi, type CharterResources } from '../../../api/charters';
import type { PassengerInput } from '../../../api/contracts';
import { formatMoneyInput, parseMoneyInput } from '../../../utils';
import type { PreparedServiceLine, ServiceWorkflowProps } from './workflowTypes';
import { toIsoDateTime } from './workflowTypes';

interface TransferPassenger extends PassengerInput {
  rowId: string;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-orange-600 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-muted';
const labelClass = 'block text-xs font-bold text-ink';

const makePassenger = (): TransferPassenger => ({
  rowId: globalThis.crypto?.randomUUID?.() || `transfer-passenger-${Date.now()}-${Math.random()}`,
  first_name: '',
  last_name: '',
});

const fullName = (passenger: TransferPassenger): string => (
  `${passenger.first_name.trim()} ${passenger.last_name.trim()}`.replace(/\s+/g, ' ').trim()
);

export function TransferServiceWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const [pickupAt, setPickupAt] = useState('');
  const [dropoffAt, setDropoffAt] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [declaredPassengerCount, setDeclaredPassengerCount] = useState('1');
  const [luggageCount, setLuggageCount] = useState('0');
  const [passengers, setPassengers] = useState<TransferPassenger[]>([makePassenger()]);
  const [tripReference, setTripReference] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [busId, setBusId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [requiresContract, setRequiresContract] = useState(false);

  const passengerCount = Number(declaredPassengerCount) || 0;
  const bags = Number(luggageCount) || 0;
  const sellingAmount = Number(parseMoneyInput(sellingPrice)) || 0;
  const availabilityWindowValid = Boolean(pickupAt && dropoffAt && new Date(dropoffAt) > new Date(pickupAt));

  const {
    data: resources,
    isFetching: checkingAvailability,
    isError: availabilityFailed,
  } = useQuery<CharterResources>({
    queryKey: ['transfer-resources', pickupAt, dropoffAt],
    queryFn: () => charterApi.resources(toIsoDateTime(pickupAt)!, toIsoDateTime(dropoffAt)!),
    enabled: availabilityWindowValid,
  });

  const selectedBus = resources?.buses.find((bus) => bus.id === Number(busId));
  const selectedDriver = resources?.drivers.find((driver) => driver.id === Number(driverId));
  const passengerNames = useMemo(() => passengers.map(fullName), [passengers]);

  const updatePassenger = (rowId: string, patch: Partial<TransferPassenger>) => {
    setPassengers((current) => current.map((passenger) => passenger.rowId === rowId ? { ...passenger, ...patch } : passenger));
  };

  const addPassenger = () => {
    const next = [...passengers, makePassenger()];
    setPassengers(next);
    setDeclaredPassengerCount(String(next.length));
  };

  const removePassenger = (rowId: string) => {
    const next = passengers.filter((passenger) => passenger.rowId !== rowId);
    setPassengers(next);
    setDeclaredPassengerCount(String(next.length));
  };

  const validate = (): string | null => {
    if (!pickupAt || !dropoffAt) return 'Set both pickup and expected drop-off times.';
    if (new Date(dropoffAt) <= new Date(pickupAt)) return 'Expected drop-off must be after pickup.';
    if (!pickupLocation.trim() || !dropoffLocation.trim()) return 'Enter exact pickup and drop-off locations.';
    if (pickupLocation.trim().toLocaleLowerCase() === dropoffLocation.trim().toLocaleLowerCase()) return 'Pickup and drop-off locations must be different.';
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 500) return 'Passenger count must be between 1 and 500.';
    if (passengers.length !== passengerCount) return `Passenger count is ${passengerCount}, but the named manifest contains ${passengers.length}.`;
    if (passengers.some((passenger) => !passenger.first_name.trim() || !passenger.last_name.trim())) return 'Enter the first and last name of every transfer passenger.';
    if (passengerNames.some((name) => name.length > 160)) return 'Passenger names must be 160 characters or fewer.';
    if (!Number.isInteger(bags) || bags < 0 || bags > 1000) return 'Luggage count must be between 0 and 1,000.';
    if (tripReference.length > 100) return 'Trip reference must be 100 characters or fewer.';
    if (dispatchNotes.length > 3000) return 'Dispatch notes must be 3,000 characters or fewer.';
    if (busId && (!selectedBus || !selectedBus.available)) return 'The selected vehicle is unavailable during this transfer.';
    if (selectedBus && passengerCount > selectedBus.seating_capacity) return 'The selected vehicle cannot seat the full passenger manifest.';
    if (driverId && (!selectedDriver || !selectedDriver.available)) return 'The selected driver is unavailable during this transfer.';
    if (sellingAmount <= 0) return 'Enter a positive transfer selling price.';
    return null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const pickupAtIso = toIsoDateTime(pickupAt)!;
    const dropoffAtIso = toIsoDateTime(dropoffAt)!;
    const metadata: Record<string, unknown> = {
      pickup_at: pickupAtIso,
      dropoff_at: dropoffAtIso,
      pickup_location: pickupLocation.trim(),
      dropoff_location: dropoffLocation.trim(),
      passenger_count: passengerCount,
      luggage_count: bags,
      bus_id: busId ? Number(busId) : undefined,
      driver_id: driverId ? Number(driverId) : undefined,
      flight_or_trip_reference: tripReference.trim() || undefined,
      passenger_names: passengerNames,
      dispatch_notes: dispatchNotes.trim() || undefined,
    };
    const invoicePassengers: PassengerInput[] = passengers.map(({ rowId: _rowId, ...passenger }) => passenger);
    const route = `${pickupLocation.trim()} to ${dropoffLocation.trim()}`;
    const line: PreparedServiceLine = {
      title: `Transfer · ${route}`,
      description: dispatchNotes.trim() || `${passengerCount} passengers and ${bags} luggage item${bags === 1 ? '' : 's'}.`,
      price: sellingAmount,
      serviceType: 'transfer_service',
      metadata,
      customDetail: {
        category: 'Transfer',
        booking_type: 'Transfer',
        route,
        destination: dropoffLocation.trim(),
        booking_reference_code: tripReference.trim() || undefined,
        booking_details: dispatchNotes.trim() || undefined,
        category_meta: metadata,
      },
      passengers: invoicePassengers,
      requiresContract,
      serviceDate: pickupAtIso,
      destination: dropoffLocation.trim(),
      paxCount: passengerCount,
      busId: busId ? Number(busId) : undefined,
      driverId: driverId ? Number(driverId) : undefined,
    };

    onAdd(line);
    toast.success('Transfer added with its dispatch and availability snapshot.');
  };

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-orange-200 bg-surface shadow-sm dark:border-orange-900">
      <header className="bg-gradient-to-r from-orange-950 via-slate-950 to-stone-950 p-5 text-white sm:p-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-200 transition hover:text-white"><LuArrowLeft /> Service desks</button>
        <div className="mt-4 flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><LuRoute className="h-6 w-6" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Point-to-point dispatch</p><h2 className="mt-1 text-2xl font-black">Transfer service</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-orange-100/80">The schedule, exact passenger manifest, luggage, vehicle, and driver are validated as one dispatch window.</p></div></div>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 dark:border-orange-950 dark:bg-orange-950/20">
          <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-orange-700"><LuCalendarClock /></span><div><h3 className="text-sm font-black text-ink">Confirmed dispatch window</h3><p className="text-xs text-muted">Availability is checked across all centralized allocations for these exact times.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Pickup date and time<input type="datetime-local" className={inputClass} value={pickupAt} onChange={(event) => setPickupAt(event.target.value)} /></label>
            <label className={labelClass}>Expected drop-off<input type="datetime-local" min={pickupAt || undefined} className={inputClass} value={dropoffAt} onChange={(event) => setDropoffAt(event.target.value)} /></label>
            <label className={labelClass}>Exact pickup location<input maxLength={255} className={inputClass} value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} placeholder="Terminal, hotel, address, or meeting point" /></label>
            <label className={labelClass}>Exact drop-off location<input maxLength={255} className={inputClass} value={dropoffLocation} onChange={(event) => setDropoffLocation(event.target.value)} placeholder="Terminal, hotel, address, or meeting point" /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border p-4 sm:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-orange-700 dark:bg-orange-950/40"><LuUsersRound /></span><div><h3 className="text-sm font-black text-ink">Exact passenger manifest</h3><p className="text-xs text-muted">The declared count must match the number of complete names.</p></div></div><div className="grid grid-cols-2 gap-3 sm:w-72"><label className={labelClass}>Passengers<input type="number" min="1" max="500" className={inputClass} value={declaredPassengerCount} onChange={(event) => setDeclaredPassengerCount(event.target.value)} /></label><label className={labelClass}>Luggage items<input type="number" min="0" max="1000" className={inputClass} value={luggageCount} onChange={(event) => setLuggageCount(event.target.value)} /></label></div></div>
          {passengers.length !== passengerCount && <p className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><LuCircleAlert /> Add or remove names until the manifest matches {passengerCount} passenger{passengerCount === 1 ? '' : 's'}.</p>}
          <div className="space-y-3">
            {passengers.map((passenger, index) => <div key={passenger.rowId} className="grid gap-3 rounded-2xl border border-border bg-surface-alt p-4 md:grid-cols-[1fr_1fr_38px]">
              <label className={labelClass}>First name<input maxLength={80} className={inputClass} value={passenger.first_name} onChange={(event) => updatePassenger(passenger.rowId, { first_name: event.target.value })} placeholder={`Passenger ${index + 1}`} /></label>
              <label className={labelClass}>Last name<input maxLength={80} className={inputClass} value={passenger.last_name} onChange={(event) => updatePassenger(passenger.rowId, { last_name: event.target.value })} /></label>
              <button type="button" aria-label={`Remove passenger ${index + 1}`} disabled={passengers.length === 1} onClick={() => removePassenger(passenger.rowId)} className="mt-6 grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><LuTrash2 /></button>
            </div>)}
          </div>
          <button type="button" disabled={passengers.length >= 500} onClick={addPassenger} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-orange-700 disabled:opacity-40"><LuPlus /> Add named passenger</button>
        </section>

        <section className="rounded-2xl border border-border bg-surface-alt p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-orange-700"><LuBus /></span><div><h3 className="text-sm font-black text-ink">Fleet and driver assignment</h3><p className="text-xs text-muted">Unavailable resources remain visible but cannot be selected.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Available vehicle<select className={inputClass} value={busId} onChange={(event) => setBusId(event.target.value)} disabled={!availabilityWindowValid || checkingAvailability || availabilityFailed}><option value="">Assign later</option>{resources?.buses.map((bus) => <option key={bus.id} value={bus.id} disabled={!bus.available || passengerCount > bus.seating_capacity}>{bus.plate_number} · {bus.model} · {bus.seating_capacity} seats{!bus.available ? ' · unavailable' : passengerCount > bus.seating_capacity ? ' · too small' : ''}</option>)}</select></label>
            <label className={labelClass}>Available driver<select className={inputClass} value={driverId} onChange={(event) => setDriverId(event.target.value)} disabled={!availabilityWindowValid || checkingAvailability || availabilityFailed}><option value="">Assign later</option>{resources?.drivers.map((driver) => <option key={driver.id} value={driver.id} disabled={!driver.available}>{driver.first_name} {driver.last_name}{!driver.available ? ' · unavailable' : ''}</option>)}</select></label>
          </div>
          <p className={`mt-3 flex items-center gap-2 text-xs font-bold ${availabilityFailed ? 'text-red-600' : 'text-muted'}`}>{checkingAvailability ? <><span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" /> Checking centralized allocations…</> : availabilityFailed ? <><LuCircleAlert /> Availability could not be verified; leave fleet and driver unassigned.</> : resources ? <><LuCircleCheck className="text-emerald-600" /> Vehicle and driver calendars checked for this transfer.</> : <><LuCalendarClock /> Set a valid pickup and drop-off window to check availability.</>}</p>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border p-4 sm:p-5 md:grid-cols-2">
          <label className={labelClass}>Flight or trip reference<input maxLength={100} className={inputClass} value={tripReference} onChange={(event) => setTripReference(event.target.value)} placeholder="Flight number, ferry booking, event, or internal reference" /></label>
          <label className={labelClass}>Transfer selling price<input inputMode="decimal" className={inputClass} value={sellingPrice} onChange={(event) => setSellingPrice(formatMoneyInput(event.target.value))} placeholder="0.00" /></label>
          <label className={`${labelClass} md:col-span-2`}>Dispatch notes<textarea maxLength={3000} rows={4} className={inputClass} value={dispatchNotes} onChange={(event) => setDispatchNotes(event.target.value)} placeholder="Meet-and-greet instructions, signage, contact sequence, stops, accessibility, or luggage handling" /><span className="mt-1 block text-right text-[10px] font-normal text-muted">{dispatchNotes.length}/3,000</span></label>
        </section>

        <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-xs font-bold text-ink"><input type="checkbox" checked={requiresContract} onChange={(event) => setRequiresContract(event.target.checked)} className="h-4 w-4 rounded border-border text-orange-700" /> Require signed service agreement</label>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-700 px-6 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-orange-800"><LuRoute /> Add transfer dispatch</button>
        </div>
        <div className="grid gap-2 text-[11px] text-muted sm:grid-cols-2"><p className="flex items-center gap-2"><LuMapPin /> {pickupLocation || 'Pickup pending'} → {dropoffLocation || 'Drop-off pending'}</p><p className="flex items-center gap-2 sm:justify-end"><LuUserRound /> {passengers.length} named / {passengerCount || 0} declared</p></div>
      </div>
    </form>
  );
}

export default TransferServiceWorkflow;

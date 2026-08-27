import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi, type JoinerDeparture, type JoinerReservationResult } from '../../api/catalog';
import { Button } from '../../components/ds';
import BusLayout from '../../components/ui/BusLayout';
import SalesCheckout, { type CartItem, type SalesCheckoutSubmission } from './SalesCheckout';

type Passenger = { seat_code: string; first_name: string; last_name: string; passenger_type: 'adult' | 'child'; date_of_birth: string; emergency_contact: string };

const normalizeSeatCode = (code: string) => String(code || '').trim().replace(/^(?:Seat|S)\s*/i, '');

export default function JoinerCheckout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialDepartureId = searchParams.get('departure');

  const [departureId, setDepartureId] = useState<number | null>(initialDepartureId ? Number(initialDepartureId) : null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lead, setLead] = useState({ name: 'Juan Dela Cruz', email: 'juan@example.com', contact: '09171234567' });
  const [isLeadAsPassenger1, setIsLeadAsPassenger1] = useState(true);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [result, setResult] = useState<{ reference: string; invoice: any } | null>(null);
  const [pendingHold, setPendingHold] = useState<{ departureId: number; seatKey: string; reservationId: number } | null>(null);

  const { data: departures = [], isFetching } = useQuery<JoinerDeparture[]>({
    queryKey: ['joiner-departures'],
    queryFn: () => catalogApi.getJoinerDepartures(),
  });

  const { data: singleDeparture } = useQuery<JoinerDeparture>({
    queryKey: ['joiner-departure-detail', departureId],
    queryFn: () => catalogApi.getJoinerDeparture(departureId!),
    enabled: Boolean(departureId),
  });

  const departure = useMemo(() => {
    if (singleDeparture && singleDeparture.id === departureId) return singleDeparture;
    return departures.find((d: JoinerDeparture) => d.id === departureId) ?? departures[0] ?? null;
  }, [singleDeparture, departures, departureId]);


  useEffect(() => {
    if (departure && !departureId) {
      setDepartureId(departure.id);
    }
  }, [departure, departureId]);

  const adultPrice = departure ? Number(departure.service?.price ?? 0) : 0;
  const childPrice = departure?.service?.child_price !== null && departure?.service?.child_price !== undefined
    ? Number(departure.service?.child_price)
    : adultPrice;
  const subtotal = passengers.reduce((sum, passenger) => sum + (passenger.passenger_type === 'child' ? childPrice : adultPrice), 0);

  // Synchronize passengers state with normalized selectedSeats
  useEffect(() => {
    setPassengers(prevPassengers => {
      return selectedSeats.map((code, index) => {
        const normCode = normalizeSeatCode(code);
        const existing = prevPassengers.find(p => normalizeSeatCode(p.seat_code) === normCode);
        if (existing) return { ...existing, seat_code: normCode };

        if (index === 0 && isLeadAsPassenger1) {
          const parts = (lead.name || '').trim().split(/\s+/);
          const firstName = parts[0] || 'Juan';
          const lastName = parts.slice(1).join(' ') || (parts[0] ? '' : 'Dela Cruz');
          return {
            seat_code: normCode,
            first_name: firstName,
            last_name: lastName,
            passenger_type: 'adult',
            date_of_birth: '',
            emergency_contact: lead.contact || '',
          };
        }

        return {
          seat_code: normCode,
          first_name: '',
          last_name: '',
          passenger_type: 'adult',
          date_of_birth: '',
          emergency_contact: '',
        };
      });
    });
  }, [selectedSeats.join('|'), isLeadAsPassenger1, lead.name, lead.contact]);

  // Format seat label for UI badges (e.g., '1' -> 'Seat 1')
  const formatSeatLabel = (code: string) => {
    const num = normalizeSeatCode(code);
    return `Seat ${num}`;
  };

  const availableSeats = useMemo(() => {
    if (!departure?.seats) return [];
    const list = departure.seats
      .filter((seat: any) => seat.status === 'available')
      .map((seat: any) => ({ ...seat, seat_code: normalizeSeatCode(seat.seat_code) }));
    // Deduplicate and natural sort
    const uniqueMap = new Map();
    list.forEach((item: any) => uniqueMap.set(item.seat_code, item));
    return Array.from(uniqueMap.values()).sort((a: any, b: any) => a.seat_code.localeCompare(b.seat_code, undefined, { numeric: true, sensitivity: 'base' }));
  }, [departure]);

  const occupiedSeats = useMemo(() => {
    return departure?.seats?.filter((seat: any) => seat.status !== 'available').map((seat: any) => normalizeSeatCode(seat.seat_code)) ?? [];
  }, [departure]);

  // Auto-select 1st available seat when departure loads if no seats are selected yet
  useEffect(() => {
    if (departure && selectedSeats.length === 0 && availableSeats.length > 0) {
      setSelectedSeats([availableSeats[0].seat_code]);
    }
  }, [departure, availableSeats]);

  const handleAddPassenger = () => {
    const nextAvailable = availableSeats.find(seat => !selectedSeats.includes(seat.seat_code));
    if (!nextAvailable) {
      toast.error('No more available seats on this departure.');
      return;
    }
    setSelectedSeats(current => {
      const updated = Array.from(new Set([...current, nextAvailable.seat_code]));
      return updated.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
  };

  const handleRemoveSeat = (seatCode: string) => {
    const norm = normalizeSeatCode(seatCode);
    setSelectedSeats(current => current.filter(code => normalizeSeatCode(code) !== norm));
  };

  const handleSeatToggle = (seatCode: string) => {
    const norm = normalizeSeatCode(seatCode);
    if (occupiedSeats.includes(norm)) return;
    setSelectedSeats(current => {
      const exists = current.some(c => normalizeSeatCode(c) === norm);
      const next = exists ? current.filter(c => normalizeSeatCode(c) !== norm) : [...current, norm];
      return Array.from(new Set(next)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
  };

  const customerPreset = useMemo(() => ({
    name: lead.name,
    email: lead.email,
    phone: lead.contact,
  }), [lead.name, lead.email, lead.contact]);

  // Uniform Cart item construction matching Custom Transactions
  const cart: CartItem[] = useMemo(() => {
    if (!departure || selectedSeats.length === 0) return [];
    const sortedSeats = Array.from(new Set(selectedSeats.map(normalizeSeatCode))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const formattedSeatList = sortedSeats.map(formatSeatLabel).join(', ');
    const adultCount = passengers.filter(p => p.passenger_type === 'adult').length;
    const childCount = passengers.filter(p => p.passenger_type === 'child').length;
    const averageSeatPrice = sortedSeats.length > 0 ? subtotal / sortedSeats.length : 0;
    const passengerSummary = passengers
      .map(p => `${p.first_name || 'Passenger'} ${p.last_name || p.seat_code}`.trim())
      .filter(Boolean)
      .join(', ');

    return [{
      cartId: `joiner-${departure.id}-${sortedSeats.join('-')}`,
      service: {
        id: departure.service?.id ?? departure.id,
        name: `Joiner Tour: ${departure.service?.name || 'Tour'} (${departure.code})`,
        category: 'Joiners',
        price: averageSeatPrice,
        is_sales_catalog: true,
      },
      quantity: sortedSeats.length,
      quantityLocked: true,
      customPrice: averageSeatPrice,
      adults: adultCount,
      childrenCount: childCount,
      adultUnitPrice: adultPrice,
      childUnitPrice: childPrice,
      travelDate: departure.starts_at ? departure.starts_at.slice(0, 10) : undefined,
      departureDate: departure.starts_at,
      arrivalDate: departure.ends_at,
      tourCode: departure.code,
      selectedSeats: sortedSeats,
      paxCount: sortedSeats.length,
      lineName: `Joiner Tour: ${departure.service?.name || 'Tour'} (${departure.code})`,
      lineDescription: `${formattedSeatList} (${adultCount} adult, ${childCount} child). Passengers: ${passengerSummary || 'TBD'}. Tour Code: ${departure.code}. Date: ${new Date(departure.starts_at).toLocaleDateString('en-PH')}.`,
      serviceType: 'joiner_tour',
      passengers: passengers.map(p => ({
        first_name: p.first_name || 'Passenger',
        last_name: p.last_name || p.seat_code,
        seat_code: p.seat_code,
        passenger_type: p.passenger_type,
        date_of_birth: p.date_of_birth || undefined,
        emergency_contact: p.emergency_contact || undefined,
      })),
    }];
  }, [departure, selectedSeats, passengers, subtotal]);

  const handleJoinerCheckout = async (submission: SalesCheckoutSubmission) => {
    if (!departure || selectedSeats.length === 0) {
      throw new Error('Choose a departure and at least one available seat before checkout.');
    }
    if (passengers.length !== selectedSeats.length || passengers.some(passenger => !passenger.first_name.trim() || !passenger.last_name.trim())) {
      throw new Error('Enter the first and last name of every selected passenger before checkout.');
    }

    const seatCodes = Array.from(new Set(selectedSeats.map(normalizeSeatCode)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const seatKey = seatCodes.join('|');
    let reservationId = pendingHold?.departureId === departure.id && pendingHold.seatKey === seatKey
      ? pendingHold.reservationId
      : null;

    if (!reservationId) {
      const held = await catalogApi.holdJoinerSeats(departure.id, {
        customer_id: submission.customerId || undefined,
        lead_name: submission.customerName,
        lead_email: submission.customerEmail || undefined,
        lead_contact: submission.customerContact || undefined,
        passenger_count: passengers.length,
        seat_codes: seatCodes,
      });
      reservationId = held.id;
      setPendingHold({ departureId: departure.id, seatKey, reservationId });
    }

    try {
      const confirmed = await catalogApi.confirmJoinerReservation(reservationId, {
        passengers: passengers.map(passenger => ({
          seat_code: normalizeSeatCode(passenger.seat_code),
          first_name: passenger.first_name.trim(),
          last_name: passenger.last_name.trim(),
          passenger_type: passenger.passenger_type,
          date_of_birth: passenger.date_of_birth || undefined,
          emergency_contact: passenger.emergency_contact || undefined,
        })),
        payment_method: submission.paymentMethod,
        payment_type: submission.paymentType,
        amount_received: submission.amountReceived,
      });
      if (!confirmed.invoice) {
        throw new Error('The reservation was confirmed but its invoice could not be loaded. Refresh the departure before retrying.');
      }
      setPendingHold(null);
      await queryClient.invalidateQueries({ queryKey: ['joiner-departures'] });
      if (departure?.id) {
        await queryClient.invalidateQueries({ queryKey: ['joiner-departure-detail', departure.id] });
      }
      return confirmed.invoice;
    } catch (error: any) {
      setPendingHold(null);
      await queryClient.invalidateQueries({ queryKey: ['joiner-departures'] });
      if (departure?.id) {
        await queryClient.invalidateQueries({ queryKey: ['joiner-departure-detail', departure.id] });
      }
      throw error;
    }
  };

  if (result) return <div className="mx-auto max-w-2xl py-12"><div className="rounded-[32px] border border-emerald-200 bg-surface p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Booking confirmed</p><h1 className="mt-2 text-3xl font-black text-ink">Seats are secured.</h1><p className="mt-3 text-sm text-muted">Reservation {result.reference}</p><div className="mt-7 rounded-2xl bg-surface-alt p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Invoice</p><p className="mt-1 text-2xl font-black text-ink">{result.invoice?.invoice_number}</p><p className="mt-1 text-sm text-muted">₱{Number(result.invoice?.total_amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} · {result.invoice?.status}</p></div><div className="mt-7 flex justify-center gap-3"><Button variant="ghost" onClick={() => navigate('/sales/departures')}>Departure board</Button><Button onClick={() => navigate(result.invoice?.id ? `/accounting/transactions/${result.invoice.id}` : '/accounting/transactions')}>Open transaction</Button></div></div></div>;

  return <div className="w-full space-y-5 pb-12">
    <header className="flex items-end justify-between rounded-3xl bg-[#071b33] p-7 text-white"><div><button onClick={() => navigate('/sales/departures')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Departure board</button><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#75b8ff]">Agent-assisted checkout</p><h1 className="mt-2 text-3xl font-black">Reserve joiner seats</h1></div><p className="hidden items-center gap-2 text-xs text-slate-300 md:flex"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Seats are locked during confirmation</p></header>

    <div className="grid gap-5 2xl:grid-cols-[280px_minmax(0,1fr)_440px] xl:grid-cols-[250px_minmax(0,1fr)_390px] grid-cols-1">
      <aside className="rounded-3xl border border-border bg-surface p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">1 · Departure</p><div className="mt-4 space-y-2">{departures.map((item: JoinerDeparture) => <button key={item.id} onClick={() => { setDepartureId(item.id); setSelectedSeats([]); setPendingHold(null); }} className={`w-full rounded-2xl border p-4 text-left ${departureId === item.id ? 'border-brand bg-blue-50 dark:bg-blue-950' : 'border-border'}`}><p className="text-[10px] font-black uppercase tracking-wider text-brand">{item.code}</p><p className="mt-1 font-black text-ink">{item.service?.name || item.code}</p><p className="mt-2 flex gap-2 text-xs text-muted"><Clock3 className="h-4 w-4" />{new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(item.starts_at))}</p></button>)}</div></aside>

      <main className="space-y-5">
        <section className="rounded-3xl border border-border bg-surface p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">2 · Departure Seats & Vehicle</p>
              <h2 className="mt-1 text-xl font-black text-ink">Choose available seats</h2>
            </div>
            <div className="flex items-center gap-2">
              {departure?.bus && (
                <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <span>🚌 Vehicle: {departure.bus.plate_number || '49-Seater Bus'}</span>
                  <span className="opacity-40">|</span>
                  <span>👨‍✈️ {departure.driver ? `${departure.driver.first_name} ${departure.driver.last_name}` : (departure.bus as any)?.driver ? `${(departure.bus as any).driver.first_name} ${(departure.bus as any).driver.last_name}` : 'Assigned Driver'}</span>
                </span>
              )}
              <span className="text-xs font-bold text-muted bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl">{selectedSeats.length} seat(s) selected</span>
            </div>
          </div>
          {isFetching ? <Loader2 className="mx-auto my-12 animate-spin text-brand" /> : !departure ? <p className="my-10 text-center text-sm text-muted">Choose a departure first.</p> : <div className="mt-6"><BusLayout totalSeats={departure.bus?.seating_capacity || departure.capacity || 49} hasRestroom={(departure.bus as any)?.bus_category === 'VIP'} selectedSeats={selectedSeats} occupiedSeats={occupiedSeats} onSeatToggle={handleSeatToggle} /></div>}
        </section>

        <section className="rounded-3xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">3 · Customer & passengers</p>
              <label className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLeadAsPassenger1}
                  onChange={e => setIsLeadAsPassenger1(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Set Lead Booker as Passenger 1</span>
              </label>
            </div>
            <button
              type="button"
              onClick={handleAddPassenger}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              + Add Passenger
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} placeholder="Lead customer name" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" />
            <input value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} placeholder="Email" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" />
            <input value={lead.contact} onChange={e => setLead({ ...lead, contact: e.target.value })} placeholder="Contact number" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" />
          </div>
          {passengers.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-xs font-bold text-muted">No seats selected yet.</p>
              <p className="mt-1 text-xs text-muted">Click seats on the bus map above or click <span className="font-bold text-brand">+ Add Passenger</span> to automatically select available seats.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">{passengers.map((passenger, index) => (
              <div key={passenger.seat_code} className="grid gap-3 rounded-2xl bg-surface-alt p-4 md:grid-cols-[85px_1fr_1fr_120px_1fr_36px] items-center">
                <div className="flex flex-col items-center">
                  <span className="grid h-9 w-full place-items-center rounded-xl bg-[#071b33] px-2 text-center text-xs font-black text-white" title={`Reserved ${formatSeatLabel(passenger.seat_code)}`}>
                    {formatSeatLabel(passenger.seat_code)}
                  </span>
                  {index === 0 && isLeadAsPassenger1 && (
                    <span className="mt-1 text-[8px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-tight">Lead Booker</span>
                  )}
                </div>
                <input value={passenger.first_name} onChange={e => setPassengers(current => current.map((item, i) => i === index ? { ...item, first_name: e.target.value } : item))} placeholder="First name" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" />
                <input value={passenger.last_name} onChange={e => setPassengers(current => current.map((item, i) => i === index ? { ...item, last_name: e.target.value } : item))} placeholder="Last name" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" />
                <select aria-label={`Passenger type for seat ${passenger.seat_code}`} value={passenger.passenger_type} onChange={e => setPassengers(current => current.map((item, i) => i === index ? { ...item, passenger_type: e.target.value as Passenger['passenger_type'] } : item))} className="h-10 rounded-xl border border-border bg-surface px-3 text-sm">
                  <option value="adult">Adult</option><option value="child">Child</option>
                </select>
                <input type="date" value={passenger.date_of_birth} onChange={e => setPassengers(current => current.map((item, i) => i === index ? { ...item, date_of_birth: e.target.value } : item))} title="Date of birth (Required for insurance)" className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink" />
                <button type="button" onClick={() => handleRemoveSeat(passenger.seat_code)} className="grid h-9 w-9 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Remove seat">
                  ✕
                </button>
              </div>
            ))}</div>
          )}
        </section>
      </main>

      <aside className="sticky top-4 h-fit">
        <SalesCheckout
          cart={cart}
          customerPreset={customerPreset}
          checkoutHandler={handleJoinerCheckout}
          removeFromCart={() => {}}
          updateQuantity={() => {}}
          clearCart={() => {}}
          onCheckoutSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['joiner-departures'] });
            toast.success('Joiner seat reservation finalized & invoice created!');
          }}
        />
      </aside>
    </div>
  </div>;
}

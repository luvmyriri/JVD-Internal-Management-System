import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, CalendarClock, CheckCircle2, Plus, UsersRound, UserRound, Sparkles, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingApi, type Service } from '../../api/billing';
import { charterApi } from '../../api/charters';
import { Button, Modal } from '../../components/ds';
import BusLayout from '../../components/ui/BusLayout';
import SalesCheckout, { type CartItem } from './SalesCheckout';
import SeatSelectorModal, { type SeatSelectionResult, type VehicleBookingMode } from '../../components/travel/SeatSelectorModal';
import PassengerManifestModal, { type PassengerManifestRow } from '../../components/travel/PassengerManifestModal';
import InclusionsExclusionsEditor from '../../components/travel/InclusionsExclusionsEditor';

const getTomorrowStartEnd = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return { starts_at: `${dateStr}T08:00`, ends_at: `${dateStr}T20:00` };
};

const bookingInitial = { rate_plan_id: '', starts_at: getTomorrowStartEnd().starts_at, ends_at: getTomorrowStartEnd().ends_at, pickup_location: 'Manila Office', destination: 'Tagaytay City', stops: '', passenger_count: '25', estimated_kilometers: '120', bus_id: '', driver_id: '', lead_name: '', lead_email: '', lead_contact: '', payment_method: 'Cash', payment_type: 'full', amount_received: '', operations_notes: '' };
const planInitial = { service_id: '', name: '', vehicle_class: 'bus', base_price: '', included_hours: '12', included_kilometers: '100', extra_hour_rate: '0', extra_kilometer_rate: '0', overnight_rate: '0', includes_driver: true, includes_fuel: true, includes_tolls: false, includes_parking: false };

export default function CharterSales() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState(bookingInitial);
  const [planForm, setPlanForm] = useState(planInitial);
  const [planOpen, setPlanOpen] = useState(false);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestPassengers, setManifestPassengers] = useState<PassengerManifestRow[]>([]);
  const [bookingMode, setBookingMode] = useState<VehicleBookingMode>('entire_vehicle');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [inclusions, setInclusions] = useState<string[]>([
    '49-Seater Tourist Bus with Aircon',
    'Driver Fee, Fuel & Passenger Insurance',
  ]);
  const [exclusions, setExclusions] = useState<string[]>([
    'Toll Fees & Parking Fees',
    'Driver Accommodation (if multi-day)',
  ]);
  const [busAssignments, setBusAssignments] = useState<Array<{ bus_id: string; driver_id: string }>>([
    { bus_id: '', driver_id: '' }
  ]);
  const { data: plans = [] } = useQuery({ queryKey: ['charter-rate-plans'], queryFn: charterApi.ratePlans });
  const { data: bookings = [] } = useQuery({ queryKey: ['charter-bookings'], queryFn: charterApi.bookings });
  const { data: serviceResponse } = useQuery({ queryKey: ['billing-services'], queryFn: billingApi.getServices });

  // Auto-select first rate plan if none selected
  useEffect(() => {
    if (plans.length > 0 && !booking.rate_plan_id) {
      setBooking(b => ({ ...b, rate_plan_id: String(plans[0].id) }));
    }
  }, [plans, booking.rate_plan_id]);

  const services = useMemo(() => {
    const items = (serviceResponse?.data?.data ?? []) as Service[];
    return items.filter(service => {
      const cat = String(service.category || '').toLowerCase();
      const type = String(service.service_type || '').toLowerCase();
      return ['transport', 'bus rental', 'charter', 'bus', 'packages', 'joiners'].includes(cat) || ['bus_rental', 'transfer_service'].includes(type) || service.is_sales_catalog !== false;
    });
  }, [serviceResponse]);

  const selectedPlan = plans.find(plan => plan.id === Number(booking.rate_plan_id));
  const validInterval = Boolean(booking.starts_at && booking.ends_at && booking.ends_at > booking.starts_at);
  const { data: resources, isLoading: resourcesLoading } = useQuery({ queryKey: ['charter-resources', booking.starts_at, booking.ends_at], queryFn: () => charterApi.resources(booking.starts_at, booking.ends_at), enabled: validInterval });
  
  const availableBuses = useMemo(() => {
    if (!resources?.buses) return [];
    const targetClass = (selectedPlan?.vehicle_class || 'bus').toLowerCase();
    const matches = resources.buses.filter(bus => String(bus.vehicle_type || '').toLowerCase() === targetClass);
    return matches.length > 0 ? matches : resources.buses;
  }, [resources, selectedPlan]);

  const selectedBus = useMemo(() => resources?.buses.find(b => b.id === Number(busAssignments?.[0]?.bus_id || booking.bus_id)), [resources, busAssignments, booking.bus_id]);
  const selectedDriver = useMemo(() => resources?.drivers.find(d => d.id === Number(busAssignments?.[0]?.driver_id || booking.driver_id)), [resources, busAssignments, booking.driver_id]);

  const paxCount = Math.max(1, Number(booking.passenger_count || 1));
  const primaryCapacity = selectedBus?.seating_capacity || (selectedPlan?.vehicle_class === 'van' ? 14 : selectedPlan?.vehicle_class === 'coaster' ? 29 : 49);
  const busesRequired = Math.ceil(paxCount / primaryCapacity);

  // Keep busAssignments length synced with busesRequired
  useEffect(() => {
    setBusAssignments(current => {
      if (current.length === busesRequired) return current;
      const next = [...current];
      while (next.length < busesRequired) {
        next.push({ bus_id: '', driver_id: '' });
      }
      return next.slice(0, busesRequired);
    });
  }, [busesRequired]);

  // Update primary booking.bus_id and driver_id when first assignment changes
  useEffect(() => {
    if (busAssignments[0]) {
      setBooking(b => ({
        ...b,
        bus_id: busAssignments[0].bus_id,
        driver_id: busAssignments[0].driver_id,
      }));
    }
  }, [busAssignments]);

  const handleSeatConfirm = (result: SeatSelectionResult) => {
    setBookingMode(result.bookingMode);
    setSelectedSeats(result.selectedSeats);
    if (result.busId) {
      setBusAssignments(prev => prev.map((item, idx) => idx === 0 ? {
        ...item,
        bus_id: String(result.busId),
        driver_id: result.driverId ? String(result.driverId) : item.driver_id,
      } : item));
    }
    toast.success(`Selected ${result.bookingMode === 'entire_vehicle' ? 'Entire Vehicle Charter' : `${result.selectedSeats.length} seats`}`);
  };

  const { data: pricing } = useQuery({ queryKey: ['charter-quote', booking.rate_plan_id, booking.starts_at, booking.ends_at, booking.estimated_kilometers], queryFn: () => charterApi.quote({ rate_plan_id: Number(booking.rate_plan_id), starts_at: booking.starts_at, ends_at: booking.ends_at, estimated_kilometers: Number(booking.estimated_kilometers) }), enabled: validInterval && Boolean(booking.rate_plan_id) });

  const createPlan = useMutation({ mutationFn: () => charterApi.createRatePlan({ ...planForm, service_id: Number(planForm.service_id), base_price: Number(planForm.base_price), included_hours: Number(planForm.included_hours), included_kilometers: Number(planForm.included_kilometers), extra_hour_rate: Number(planForm.extra_hour_rate), extra_kilometer_rate: Number(planForm.extra_kilometer_rate), overnight_rate: Number(planForm.overnight_rate) }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['charter-rate-plans'] }); setPlanOpen(false); setPlanForm(planInitial); toast.success('Charter rate plan created'); }, onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Rate plan could not be created') });

  // Uniform Cart item construction
  const cart: CartItem[] = useMemo(() => {
    if (!selectedPlan) return [];
    const baseSubtotal = pricing?.subtotal ?? Number(selectedPlan.base_price);
    const totalCharterSubtotal = baseSubtotal * busesRequired;

    const assignedBusesList = busAssignments
      .map(a => resources?.buses.find(b => b.id === Number(a.bus_id)))
      .filter(Boolean);
    
    const assignedPlates = assignedBusesList.map(b => b?.plate_number).join(', ') || 'TBD';

    return [{
      cartId: `charter-${selectedPlan.id}`,
      service: {
        id: selectedPlan.service_id || selectedPlan.id,
        name: `Bus Charter: ${selectedPlan.name} (${busesRequired} Bus${busesRequired > 1 ? 'es' : ''})`,
        category: 'Bus Rental',
        price: totalCharterSubtotal,
        is_sales_catalog: true,
      },
      quantity: busesRequired,
      quantityLocked: true,
      customPrice: totalCharterSubtotal,
      busId: Number(busAssignments[0]?.bus_id) || undefined,
      selectedSeats: selectedSeats.length > 0 ? selectedSeats : undefined,
      driverId: Number(busAssignments[0]?.driver_id) || undefined,
      driverName: selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : undefined,
      travelDate: booking.starts_at ? booking.starts_at.slice(0, 10) : undefined,
      departureDate: booking.starts_at,
      arrivalDate: booking.ends_at,
      pickupLocation: booking.pickup_location || 'Pickup Location',
      destination: booking.destination || 'Destination',
      paxCount: bookingMode === 'entire_vehicle' ? primaryCapacity : (selectedSeats.length || paxCount),
      passengers: manifestPassengers,
      lineName: `Bus Charter: ${selectedPlan.name} (${busesRequired} Bus${busesRequired > 1 ? 'es' : ''} for ${paxCount} Pax)`,
      lineDescription: `${busesRequired} × Vehicles required for ${paxCount} passengers. ${bookingMode === 'entire_vehicle' ? 'Entire Vehicle Charter' : `Specific Seats: ${selectedSeats.join(', ')}`}. Assigned Vehicles: ${assignedPlates}.`,
      serviceType: 'bus_rental',
      requiresContract: (totalCharterSubtotal ?? 0) >= 50000,
      lineMetadata: {
        rate_plan_id: selectedPlan.id,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        estimated_kilometers: Number(booking.estimated_kilometers),
        stops: booking.stops,
        buses_required: busesRequired,
        bus_assignments: busAssignments,
        selected_seats: selectedSeats,
        booking_mode: bookingMode,
        passengers: manifestPassengers,
        inclusions,
        exclusions,
        operations_notes: booking.operations_notes,
      }
    }];
  }, [selectedPlan, pricing, booking, busesRequired, busAssignments, resources, selectedDriver, paxCount, primaryCapacity, selectedSeats, bookingMode, manifestPassengers, inclusions, exclusions]);

  const customerPreset = useMemo(() => ({
    name: booking.lead_name,
    email: booking.lead_email,
    phone: booking.lead_contact,
  }), [booking.lead_name, booking.lead_email, booking.lead_contact]);

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 rounded-3xl bg-[#071b33] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
      <div>
        <button onClick={() => navigate('/sales')} className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Sales</button>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Sales module · Fleet rental</p>
        <h1 className="mt-1 text-2xl font-black">Charter & Bus Rental Checkout</h1>
        <p className="mt-1 text-sm text-slate-300">Configure vehicle charters, seat assignments, driver allocations, and inclusions for private group trips.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setManifestModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider">
          <Users className="mr-1.5 h-4 w-4" /> Passenger Manifest ({manifestPassengers.length})
        </Button>
        <Button onClick={() => setSeatModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider">
          <Bus className="mr-1.5 h-4 w-4" /> Select Vehicle & Seats
        </Button>
        <Button onClick={() => setPlanOpen(true)} variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><Plus className="mr-1.5 h-4 w-4" /> New Rate Plan</Button>
      </div>
    </header>

    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Rate plans</p>
              <h2 className="mt-1 text-lg font-black text-ink">Select charter package</h2>
            </div>
            {selectedPlan && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-brand dark:bg-blue-950/40">Starts @ ₱{Number(selectedPlan.base_price).toLocaleString()}</span>}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => {
              const active = String(plan.id) === booking.rate_plan_id;
              return <button key={plan.id} type="button" onClick={() => setBooking(b => ({ ...b, rate_plan_id: String(plan.id) }))} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-brand bg-blue-50/40 shadow-sm dark:bg-blue-950/20' : 'border-border bg-surface hover:border-slate-300'}`}>
                <div className="flex justify-between"><span className="text-[10px] font-black uppercase text-brand">{plan.vehicle_class}</span>{active && <CheckCircle2 className="h-4 w-4 text-brand" />}</div>
                <p className="mt-2 font-black text-ink">{plan.name}</p>
                <p className="mt-1 text-xs text-muted">₱{Number(plan.base_price).toLocaleString()} · {plan.included_hours}h / {plan.included_kilometers}km</p>
              </button>;
            })}
          </div>

          <div className="mt-6 grid gap-4 border-t border-border pt-6 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-muted">Departure Date & Time<input type="datetime-local" value={booking.starts_at} onChange={e => setBooking({ ...booking, starts_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            <label className="text-xs font-bold text-muted">Return Date & Time<input type="datetime-local" value={booking.ends_at} onChange={e => setBooking({ ...booking, ends_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            <label className="text-xs font-bold text-muted">Passenger Count<input type="number" min="1" max="500" value={booking.passenger_count} onChange={e => setBooking({ ...booking, passenger_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            <label className="text-xs font-bold text-muted">Est. Distance (KM)<input type="number" min="0" value={booking.estimated_kilometers} onChange={e => setBooking({ ...booking, estimated_kilometers: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-muted">Pickup Location<input type="text" value={booking.pickup_location} onChange={e => setBooking({ ...booking, pickup_location: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            <label className="text-xs font-bold text-muted">Destination<input type="text" value={booking.destination} onChange={e => setBooking({ ...booking, destination: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
          </div>
        </section>

        {/* Fleet Allocation & Seat Selector Section */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Vehicle & Seat Setup</p>
              <h2 className="mt-1 text-lg font-black text-ink">Fleet Allocation & Seating Blueprint</h2>
            </div>
            <button
              type="button"
              onClick={() => setSeatModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-amber-600"
            >
              <Bus className="h-4 w-4" /> Open Seat Selector
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {busAssignments.map((assignment, index) => (
              <div key={index} className="rounded-2xl border border-border bg-surface-alt/40 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-brand mb-3">Vehicle Allocation #{index + 1}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-bold text-muted">Assigned Fleet Bus
                    <select value={assignment.bus_id} onChange={e => {
                      const val = e.target.value;
                      setBusAssignments(current => current.map((item, i) => i === index ? { ...item, bus_id: val } : item));
                    }} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink">
                      <option value="">
                        {!validInterval ? 'Set departure & return dates above...' : resourcesLoading ? 'Checking available fleet...' : availableBuses.length === 0 ? 'No vehicles available for these dates' : `Select vehicle for Bus #${index + 1}…`}
                      </option>
                      {availableBuses.map(bus => {
                        const isAssignedToOther = busAssignments.some((a, i) => i !== index && Number(a.bus_id) === bus.id);
                        return (
                          <option key={bus.id} value={bus.id} disabled={!bus.available || isAssignedToOther}>
                            {bus.plate_number} · {bus.model} · {bus.seating_capacity} seats{!bus.available ? ' · unavailable' : isAssignedToOther ? ' · already assigned' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-muted">Assigned Driver
                    <select required={Boolean(selectedPlan?.includes_driver)} value={assignment.driver_id} onChange={e => {
                      const val = e.target.value;
                      setBusAssignments(current => current.map((item, i) => i === index ? { ...item, driver_id: val } : item));
                    }} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink">
                      <option value="">
                        {!validInterval ? 'Set departure & return dates above...' : resourcesLoading ? 'Checking driver availability...' : selectedPlan?.includes_driver ? `Select driver for Bus #${index + 1}…` : 'Assign later'}
                      </option>
                      {resources?.drivers.map(driver => {
                        const isAssignedToOther = busAssignments.some((a, i) => i !== index && Number(a.driver_id) === driver.id);
                        return (
                          <option key={driver.id} value={driver.id} disabled={!driver.available || isAssignedToOther}>
                            {driver.first_name} {driver.last_name}{!driver.available ? ' · unavailable' : isAssignedToOther ? ' · already assigned' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {selectedBus && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-ink">
                  Selected Seating Blueprint ({selectedBus.plate_number} · {selectedBus.model})
                </p>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  {bookingMode === 'entire_vehicle' ? 'Entire Vehicle Charter' : `Specific Seats: ${selectedSeats.join(', ')}`}
                </span>
              </div>
              <BusLayout viewOnly={bookingMode === 'entire_vehicle'} totalSeats={selectedBus.seating_capacity} selectedSeats={selectedSeats} hasRestroom={selectedBus.bus_category === 'VIP'} />
            </div>
          )}
        </section>

        {/* Structured Inclusions & Exclusions Section */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <InclusionsExclusionsEditor inclusions={inclusions} exclusions={exclusions} onChange={(inc, exc) => { setInclusions(inc); setExclusions(exc); }} />
        </section>
      </div>

      <aside className="sticky top-4 h-fit">
        <SalesCheckout
          cart={cart}
          customerPreset={customerPreset}
          removeFromCart={() => {}}
          updateQuantity={() => {}}
          clearCart={() => {}}
          onCheckoutSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['charter-bookings'] });
            toast.success('Charter order finalized & synchronized with accounting & logistics!');
          }}
        />
      </aside>
    </div>

    {/* Seat Selector Modal */}
    <SeatSelectorModal
      isOpen={seatModalOpen}
      onClose={() => setSeatModalOpen(false)}
      onConfirm={handleSeatConfirm}
      buses={availableBuses.map(b => ({
        id: b.id,
        plate_number: b.plate_number,
        model: b.model,
        seating_capacity: b.seating_capacity,
        driver: resources?.drivers.find(d => d.id === (b as any).assigned_driver),
      }))}
      initialBusId={selectedBus?.id}
      initialMode={bookingMode}
      initialSeats={selectedSeats}
      travelDate={booking.starts_at ? booking.starts_at.slice(0, 10) : undefined}
      returnDate={booking.ends_at ? booking.ends_at.slice(0, 10) : undefined}
      paxCount={paxCount}
      packageName={selectedPlan?.name || 'Charter Package'}
    />

    <PassengerManifestModal
      isOpen={manifestModalOpen}
      onClose={() => setManifestModalOpen(false)}
      onSave={(rows) => {
        setManifestPassengers(rows);
        toast.success(`Charter passenger manifest updated (${rows.length} travelers registered)`);
      }}
      initialPassengers={manifestPassengers}
      totalSeats={selectedBus ? selectedBus.seating_capacity : 49}
      selectedSeats={selectedSeats}
      leadCustomer={customerPreset}
      title="Bus Charter Passenger Manifest"
      packageName={selectedPlan?.name || 'Bus Charter Service'}
    />

    <Modal isOpen={planOpen} onClose={() => setPlanOpen(false)} title="Create charter rate plan" size="lg" footer={null}><form onSubmit={event => { event.preventDefault(); createPlan.mutate(); }} className="grid gap-4 py-2 md:grid-cols-2"><label className="text-xs font-bold text-muted md:col-span-2">Catalog service<select required value={planForm.service_id} onChange={e => setPlanForm({ ...planForm, service_id: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="">Select transport service…</option>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><label className="text-xs font-bold text-muted">Plan name<input required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label><label className="text-xs font-bold text-muted">Vehicle type<select value={planForm.vehicle_class} onChange={e => setPlanForm({ ...planForm, vehicle_class: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"><option value="bus">Bus</option><option value="coaster">Coaster</option><option value="van">Van</option></select></label>{[['base_price','Base price'],['included_hours','Included hours'],['included_kilometers','Included kilometers'],['extra_hour_rate','Extra hour rate'],['extra_kilometer_rate','Extra kilometer rate'],['overnight_rate','Overnight rate']].map(([key,label]) => <label key={key} className="text-xs font-bold text-muted">{label}<input required type="number" min="0" value={(planForm as any)[key]} onChange={e => setPlanForm({ ...planForm, [key]: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>)}<div className="md:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['includes_driver','Driver'],['includes_fuel','Fuel'],['includes_tolls','Tolls'],['includes_parking','Parking']].map(([key,label]) => <label key={key} className="flex items-center gap-2 text-xs font-bold text-ink"><input type="checkbox" checked={Boolean((planForm as any)[key])} onChange={e => setPlanForm({ ...planForm, [key]: e.target.checked })} />{label}</label>)}</div><div className="flex justify-end gap-3 border-t border-border pt-5 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setPlanOpen(false)}>Cancel</Button><Button type="submit" disabled={createPlan.isPending}>Create rate plan</Button></div></form></Modal>
  </div>;
}

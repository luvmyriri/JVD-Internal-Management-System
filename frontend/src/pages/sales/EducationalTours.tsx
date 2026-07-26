import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, CheckCircle2, GraduationCap, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { educationalTourApi } from '../../api/educationalTours';
import { Button, Modal } from '../../components/ds';
import SalesCheckout, { type CartItem } from './SalesCheckout';
import SeatSelectorModal, { type SeatSelectionResult, type VehicleBookingMode } from '../../components/travel/SeatSelectorModal';
import PassengerManifestModal, { type PassengerManifestRow } from '../../components/travel/PassengerManifestModal';
import ProposedTripBudgetCard, { type BudgetLineItem } from '../../components/travel/ProposedTripBudgetCard';
import InclusionsExclusionsEditor from '../../components/travel/InclusionsExclusionsEditor';
import ItineraryBuilder from './components/ItineraryBuilder';
import type { ItineraryDayInput } from '../../api/contracts';

type Assignment = { bus_id: string; driver_id: string; planned_passengers: string };

const getTomorrowStartEnd = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return { starts_at: `${dateStr}T08:00`, ends_at: `${dateStr}T17:00` };
};

const initialBooking = {
  program_id: '',
  school_name: 'St. Jude Academy',
  contact_person: 'Maria Santos',
  contact_email: 'maria.santos@stjude.edu.ph',
  contact_number: '09171234567',
  grade_level: 'Grade 10',
  starts_at: getTomorrowStartEnd().starts_at,
  ends_at: getTomorrowStartEnd().ends_at,
  pickup_location: 'St. Jude Main Campus',
  stops: '',
  student_count: '45',
  tour_guide_count: '3',
  operations_notes: '',
  payment_method: 'Cash',
  payment_type: 'full',
  amount_received: '',
};

const initialProgram = {
  name: '',
  learning_objectives: '',
  default_stops: '',
  minimum_students: '20',
  students_per_chaperone: '20',
  students_per_free_chaperone: '20',
  student_price: '',
  additional_chaperone_price: '0',
  includes_meals: true,
  includes_coordinator: true,
  includes_insurance: true,
  includes_shirt: false,
};

export default function EducationalTours() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState(initialBooking);
  const [assignments, setAssignments] = useState<Assignment[]>([{ bus_id: '', driver_id: '', planned_passengers: '48' }]);
  const [programForm, setProgramForm] = useState(initialProgram);
  const [programOpen, setProgramOpen] = useState(false);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestPassengers, setManifestPassengers] = useState<PassengerManifestRow[]>([]);
  const [bookingMode, setBookingMode] = useState<VehicleBookingMode>('entire_vehicle');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [inclusions, setInclusions] = useState<string[]>([
    'Dedicated Aircon Tourist Bus Transportation',
    'All Museum Entrance Tickets & Activity Passes',
    'Student Plated Lunch Box & Bottled Water',
    'Tour Coordinators & First Aid Personnel',
    'Comprehensive Student Accident Insurance',
  ]);
  const [exclusions, setExclusions] = useState<string[]>([
    'Personal Souvenir Shopping',
    'Snacks outside prescribed meal plan',
  ]);
  const [itinerary, setItinerary] = useState<ItineraryDayInput[]>([
    {
      day_number: 1,
      date: getTomorrowStartEnd().starts_at.slice(0, 10),
      location: 'Metro Manila Educational Circuit',
      activity_description: '07:00 AM Departure -> 09:00 AM Science Museum -> 12:00 PM Lunch -> 01:30 PM Heritage Exhibit -> 04:30 PM Return Trip.',
      meal_plan: 'Plated Lunch Box Included',
      accommodation_name: 'N/A (Day Tour)',
    }
  ]);

  const { data: programs = [] } = useQuery({ queryKey: ['educational-programs'], queryFn: educationalTourApi.programs });

  // Auto-select first program if none selected
  useEffect(() => {
    if (programs.length > 0 && !booking.program_id) {
      const p = programs[0];
      setBooking(b => ({ ...b, program_id: String(p.id), stops: p.default_stops.join('\n') }));
    }
  }, [programs, booking.program_id]);

  const validInterval = Boolean(booking.starts_at && booking.ends_at && booking.ends_at > booking.starts_at);
  const { data: resources } = useQuery({ queryKey: ['educational-resources', booking.starts_at, booking.ends_at], queryFn: () => educationalTourApi.resources(booking.starts_at, booking.ends_at), enabled: validInterval });
  const { data: pricing } = useQuery({ queryKey: ['educational-quote', booking.program_id, booking.student_count, booking.tour_guide_count], queryFn: () => educationalTourApi.quote(Number(booking.program_id), Number(booking.student_count), Number(booking.tour_guide_count)), enabled: Boolean(booking.program_id && booking.student_count) });
  const travelers = Number(booking.student_count || 0) + Number(booking.tour_guide_count || 0);

  const selectedProgram = programs.find(p => p.id === Number(booking.program_id));

  // Auto-fill bus assignment when resources load if unselected
  useEffect(() => {
    if (resources?.buses && resources.buses.length > 0 && !assignments[0]?.bus_id) {
      const firstAvailableBus = resources.buses.find(b => b.available);
      const firstAvailableDriver = resources.drivers.find(d => d.available);
      if (firstAvailableBus) {
        setAssignments([{
          bus_id: String(firstAvailableBus.id),
          driver_id: firstAvailableDriver ? String(firstAvailableDriver.id) : '',
          planned_passengers: String(travelers || firstAvailableBus.seating_capacity)
        }]);
      }
    }
  }, [resources, assignments, travelers]);

  const handleSeatConfirm = (result: SeatSelectionResult) => {
    setBookingMode(result.bookingMode);
    setSelectedSeats(result.selectedSeats);
    if (result.busId) {
      setAssignments(prev => prev.map((item, idx) => idx === 0 ? {
        ...item,
        bus_id: String(result.busId),
        driver_id: result.driverId ? String(result.driverId) : item.driver_id,
        planned_passengers: String(result.paxCount),
      } : item));
    }
    toast.success(`Vehicle seat option selected (${result.bookingMode === 'entire_vehicle' ? 'Entire Bus' : `${result.selectedSeats.length} seats`})`);
  };

  const createProgram = useMutation({
    mutationFn: () =>
      educationalTourApi.createProgram({
        ...programForm,
        default_stops: programForm.default_stops.split('\n').map(stop => stop.trim()).filter(Boolean),
        minimum_students: Number(programForm.minimum_students),
        students_per_chaperone: Number(programForm.students_per_chaperone),
        students_per_free_chaperone: Number(programForm.students_per_free_chaperone),
        student_price: Number(programForm.student_price),
        additional_chaperone_price: Number(programForm.additional_chaperone_price),
      }),
    onSuccess: async created => {
      await queryClient.invalidateQueries({ queryKey: ['educational-programs'] });
      setBooking(current => ({ ...current, program_id: String(created.id), stops: created.default_stops.join('\n') }));
      setProgramOpen(false);
      setProgramForm(initialProgram);
      toast.success('Educational program created and selected');
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors as Record<string, string[]> | undefined;
      toast.error(errors ? Object.values(errors)[0]?.[0] : error?.response?.data?.message ?? 'Program could not be created');
    },
  });

  // Uniform Cart item construction matching Custom Transactions
  const cart: CartItem[] = useMemo(() => {
    if (!selectedProgram) return [];
    const subtotal = pricing?.subtotal ?? (Number(selectedProgram.student_price) * Number(booking.student_count || 1));
    const primaryBusId = assignments[0]?.bus_id ? Number(assignments[0].bus_id) : undefined;
    const primaryDriverId = assignments[0]?.driver_id ? Number(assignments[0].driver_id) : undefined;

    return [{
      cartId: `educational-${selectedProgram.id}`,
      service: {
        id: (selectedProgram as any).service_id || selectedProgram.id,
        name: `Educational Tour: ${selectedProgram.name}`,
        category: 'Educational Tour',
        price: subtotal,
        is_sales_catalog: true,
      },
      quantity: 1,
      quantityLocked: true,
      customPrice: subtotal,
      busId: primaryBusId,
      selectedSeats: selectedSeats.length > 0 ? selectedSeats : undefined,
      driverId: primaryDriverId,
      travelDate: booking.starts_at ? booking.starts_at.slice(0, 10) : undefined,
      departureDate: booking.starts_at,
      arrivalDate: booking.ends_at,
      pickupLocation: booking.pickup_location || 'School Pickup Point',
      destination: selectedProgram.name,
      paxCount: travelers,
      passengers: manifestPassengers,
      lineName: `Educational Tour: ${booking.school_name || 'School Group'} (${selectedProgram.name})`,
      lineDescription: `School: ${booking.school_name || 'School'}. Grade: ${booking.grade_level || 'General'}. Students: ${booking.student_count}. Tour Guides: ${booking.tour_guide_count}. Pickup: ${booking.pickup_location || 'TBD'}. Option: ${bookingMode === 'entire_vehicle' ? 'Whole Bus Charter' : `Specific Seats (${selectedSeats.join(', ')})`}.`,
      serviceType: 'educational_tour',
      requiresContract: (pricing?.total ?? 0) >= 50000,
      itinerary,
      lineMetadata: {
        program_id: selectedProgram.id,
        school_name: booking.school_name,
        contact_person: booking.contact_person,
        contact_email: booking.contact_email,
        contact_number: booking.contact_number,
        grade_level: booking.grade_level,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        student_count: Number(booking.student_count),
        tour_guide_count: Number(booking.tour_guide_count),
        chaperone_count: Number(booking.tour_guide_count),
        assignments: assignments,
        selected_seats: selectedSeats,
        booking_mode: bookingMode,
        passengers: manifestPassengers,
        inclusions,
        exclusions,
        itinerary,
        stops: booking.stops,
        operations_notes: booking.operations_notes,
      }
    }];
  }, [selectedProgram, pricing, booking, assignments, travelers, selectedSeats, bookingMode, manifestPassengers, inclusions, exclusions, itinerary]);

  const customerPreset = useMemo(() => ({
    name: booking.school_name || booking.contact_person,
    email: booking.contact_email,
    phone: booking.contact_number,
  }), [booking.school_name, booking.contact_person, booking.contact_email, booking.contact_number]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl bg-[#071b33] p-6 text-white lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button onClick={() => navigate('/sales')} className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Sales</button>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Sales module · School & Academic</p>
          <h1 className="mt-1 text-2xl font-black">Educational Tour Checkout</h1>
          <p className="mt-1 text-sm text-slate-300">Structure school exposure trips, passenger manifests, seat maps, daily itineraries, and inclusions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setManifestModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider">
            <Users className="mr-1.5 h-4 w-4" /> Passenger Manifest ({manifestPassengers.length})
          </Button>
          <Button onClick={() => setSeatModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider">
            <Bus className="mr-1.5 h-4 w-4" /> Select Bus & Seats
          </Button>
          <Button onClick={() => setProgramOpen(true)} variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><Plus className="mr-1.5 h-4 w-4" /> New Program</Button>
        </div>
      </header>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Educational Catalog</p>
                <h2 className="mt-1 text-lg font-black text-ink">Select exposure program</h2>
              </div>
              {selectedProgram && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-brand dark:bg-blue-950/40">₱{Number(selectedProgram.student_price).toLocaleString()} / Student</span>}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map(program => {
                const active = String(program.id) === booking.program_id;
                return (
                  <button key={program.id} type="button" onClick={() => setBooking(b => ({ ...b, program_id: String(program.id), stops: program.default_stops.join('\n') }))} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-brand bg-blue-50/40 shadow-sm dark:bg-blue-950/20' : 'border-border bg-surface hover:border-slate-300'}`}>
                    <div className="flex justify-between"><span className="text-[10px] font-black uppercase text-brand">Academic</span>{active && <CheckCircle2 className="h-4 w-4 text-brand" />}</div>
                    <p className="mt-2 font-black text-ink">{program.name}</p>
                    <p className="mt-1 text-xs text-muted">₱{Number(program.student_price).toLocaleString()} per student</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 border-t border-border pt-6 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-bold text-muted">School Name<input type="text" value={booking.school_name} onChange={e => setBooking({ ...booking, school_name: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
              <label className="text-xs font-bold text-muted">Contact Person<input type="text" value={booking.contact_person} onChange={e => setBooking({ ...booking, contact_person: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
              <label className="text-xs font-bold text-muted">Contact Phone<input type="text" value={booking.contact_number} onChange={e => setBooking({ ...booking, contact_number: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold text-muted">Departure Date<input type="datetime-local" value={booking.starts_at} onChange={e => setBooking({ ...booking, starts_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
              <label className="text-xs font-bold text-muted">Return Date<input type="datetime-local" value={booking.ends_at} onChange={e => setBooking({ ...booking, ends_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
              <label className="text-xs font-bold text-muted">Student Count<input type="number" min="1" value={booking.student_count} onChange={e => setBooking({ ...booking, student_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
              <label className="text-xs font-bold text-muted">Tour Guide Count<input type="number" min="0" value={booking.tour_guide_count} onChange={e => setBooking({ ...booking, tour_guide_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            </div>
          </section>

          {/* Structured Itinerary Section */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <ItineraryBuilder value={itinerary} onChange={setItinerary} />
          </section>

          {/* Structured Inclusions & Exclusions Section */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <InclusionsExclusionsEditor inclusions={inclusions} exclusions={exclusions} onChange={(inc, exc) => { setInclusions(inc); setExclusions(exc); }} />
          </section>
        </div>

        <aside className="sticky top-4 h-fit space-y-4">
          <ProposedTripBudgetCard
            proposedBudget={85000}
            basePrice={pricing?.student_amount || (Number(selectedProgram?.student_price || 0) * Number(booking.student_count || 1))}
            additions={[
              ...(pricing?.chargeable_tour_guide_count && pricing.chargeable_tour_guide_count > 0
                ? [{
                    label: `${pricing.chargeable_tour_guide_count} Additional Tour Guide(s) @ ₱${Number(selectedProgram?.additional_chaperone_price || 0).toLocaleString()}`,
                    amount: pricing.chaperone_amount || 0,
                    type: 'addition' as const,
                  }]
                : [])
            ]}
            subtractions={[
              ...(pricing?.free_tour_guide_count && pricing.free_tour_guide_count > 0
                ? [{
                    label: `${pricing.free_tour_guide_count} Complimentary Tour Guide(s) (FREE)`,
                    amount: (pricing.free_tour_guide_count * Number(selectedProgram?.additional_chaperone_price || 0)),
                    type: 'subtraction' as const,
                  }]
                : [])
            ]}
            taxAmount={pricing?.tax_amount || 0}
            taxRate={pricing?.tax_rate || 0.12}
            title="School Exposure Proposed Budget"
          />

          <SalesCheckout
            cart={cart}
            customerPreset={customerPreset}
            removeFromCart={() => {}}
            updateQuantity={() => {}}
            clearCart={() => {}}
            onCheckoutSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['educational-bookings'] });
              toast.success('Educational tour order finalized!');
            }}
          />
        </aside>
      </div>

      {/* Seat Selector Modal */}
      <SeatSelectorModal
        isOpen={seatModalOpen}
        onClose={() => setSeatModalOpen(false)}
        onConfirm={handleSeatConfirm}
        buses={(resources?.buses || []).map(b => ({
          id: b.id,
          plate_number: b.plate_number,
          model: b.model,
          seating_capacity: b.seating_capacity,
          driver: resources?.drivers.find(d => d.id === (b as any).assigned_driver),
        }))}
        initialBusId={assignments[0]?.bus_id ? Number(assignments[0].bus_id) : undefined}
        initialMode={bookingMode}
        initialSeats={selectedSeats}
        travelDate={booking.starts_at ? booking.starts_at.slice(0, 10) : undefined}
        returnDate={booking.ends_at ? booking.ends_at.slice(0, 10) : undefined}
        paxCount={travelers}
        packageName={selectedProgram?.name || 'Educational Program'}
      />

      {/* Passenger Manifest & Seat Assignment Modal */}
      <PassengerManifestModal
        isOpen={manifestModalOpen}
        onClose={() => setManifestModalOpen(false)}
        onSave={(rows) => {
          setManifestPassengers(rows);
          toast.success(`Passenger manifest updated (${rows.length} travelers registered)`);
        }}
        initialPassengers={manifestPassengers}
        totalSeats={assignments[0]?.bus_id ? resources?.buses.find(b => String(b.id) === assignments[0].bus_id)?.seating_capacity || 49 : 49}
        selectedSeats={selectedSeats}
        leadCustomer={customerPreset}
        title="Educational Tour Passenger Manifest"
        packageName={selectedProgram?.name || 'Educational Exposure Trip'}
      />

      {/* Program Creation Modal */}
      <Modal isOpen={programOpen} onClose={() => setProgramOpen(false)} title="Create educational program" size="lg" footer={null}>
        <form onSubmit={event => { event.preventDefault(); createProgram.mutate(); }} className="grid gap-4 py-2 md:grid-cols-2">
          <label className="text-xs font-bold text-muted md:col-span-2">Program name<input required value={programForm.name} onChange={e => setProgramForm({ ...programForm, name: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Student price<input required type="number" min="0" value={programForm.student_price} onChange={e => setProgramForm({ ...programForm, student_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Tour Guide price<input required type="number" min="0" value={programForm.additional_chaperone_price} onChange={e => setProgramForm({ ...programForm, additional_chaperone_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Default Stops (One per line)<textarea value={programForm.default_stops} onChange={e => setProgramForm({ ...programForm, default_stops: e.target.value })} className="mt-1 min-h-[80px] w-full rounded-xl border border-border bg-surface p-3 text-sm font-semibold" /></label>
          <div className="flex justify-end gap-3 border-t border-border pt-5 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setProgramOpen(false)}>Cancel</Button><Button type="submit" disabled={createProgram.isPending}>Create program</Button></div>
        </form>
      </Modal>
    </div>
  );
}

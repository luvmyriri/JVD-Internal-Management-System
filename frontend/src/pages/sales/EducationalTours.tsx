import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ArrowLeft, Bus, CheckCircle2, GraduationCap, ImagePlus, Pencil, Plus, Printer, Trash2, Users, X } from 'lucide-react';

import toast from 'react-hot-toast';
import { educationalTourApi } from '../../api/educationalTours';
import { Button, Modal } from '../../components/ds';
import SalesCheckout, { type CartItem } from './SalesCheckout';
import SeatSelectorModal, { type SeatSelectionResult, type VehicleBookingMode } from '../../components/travel/SeatSelectorModal';
import PassengerManifestModal, { type PassengerManifestRow } from '../../components/travel/PassengerManifestModal';
import ProposedTripBudgetCard, { type BudgetLineItem } from '../../components/travel/ProposedTripBudgetCard';
import InclusionsExclusionsEditor from '../../components/travel/InclusionsExclusionsEditor';
import ItineraryBuilder from './components/ItineraryBuilder';
import { LuChevronDown, LuSearch, LuFilter, LuBookOpen, LuGraduationCap, LuCalendar } from 'react-icons/lu';
import { BusSeatAllocationModal } from '../../components/ui';
import type { AllocatedBus } from '../../components/ui/BusSeatAllocationModal';
import type { ItineraryDayInput } from '../../api/contracts';
import BusLayout from '../../components/ui/BusLayout';
import TripLocationMapPicker from '../../components/travel/TripLocationMapPicker';
import EducationalBookingManager from './components/EducationalBookingManager';
import { getStorageUrl } from '../../utils';
import { billingApi } from '../../api/billing';
import PackageCatalogCard from './components/PackageCatalogCard';
import BookingWorkspaceHeader from './components/BookingWorkspaceHeader';





type Assignment = { bus_id: string; driver_id: string; planned_passengers: string };

const getTomorrowStartEnd = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return { starts_at: `${dateStr}T08:00`, ends_at: `${dateStr}T17:00` };
};

const initialBooking = {
  program_id: '',
  school_name: '',
  contact_person: '',
  contact_email: '',
  contact_number: '',
  grade_level: 'Grade 10',
  starts_at: getTomorrowStartEnd().starts_at,
  ends_at: getTomorrowStartEnd().ends_at,
  pickup_location: '',
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
  images: [] as string[],
};

export default function EducationalTours() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'catalog' | 'builder'>('catalog');
  const [booking, setBooking] = useState(initialBooking);
  const [assignments, setAssignments] = useState<Assignment[]>([{ bus_id: '', driver_id: '', planned_passengers: '48' }]);
  const [programForm, setProgramForm] = useState(initialProgram);
  const [builderForm, setBuilderForm] = useState({
    name: '',
    school_name: '',
    grade_level: 'Grade 10',
    learning_objectives: 'Interactive educational exposure and historical learning.',
    default_stops: 'Space Cube Exhibit\nMind Museum\nVenice Grand Canal\nNational Museum of Fine Arts',
    minimum_students: '45',
    student_price: '3450',
    additional_chaperone_price: '1200',
  });
  const [programOpen, setProgramOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);

  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [busAllocationModalOpen, setBusAllocationModalOpen] = useState(false);
  const [busAllocations, setBusAllocations] = useState<AllocatedBus[]>([]);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestPassengers, setManifestPassengers] = useState<PassengerManifestRow[]>([]);
  const [bookingMode, setBookingMode] = useState<VehicleBookingMode>('entire_vehicle');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLeadAsPassenger1, setIsLeadAsPassenger1] = useState(true);
  const [passengers, setPassengers] = useState<Array<{
    seat_code: string;
    first_name: string;
    last_name: string;
    passenger_type: 'student' | 'chaperone';
    date_of_birth: string;
  }>>([]);
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [searchParams] = useSearchParams();
  const manageId = searchParams.get('manage_id');
  const { data: programs = [] } = useQuery({ queryKey: ['educational-programs'], queryFn: educationalTourApi.programs });
  const { data: bookings = [] } = useQuery({ queryKey: ['educational-bookings'], queryFn: educationalTourApi.bookings });


  const filteredPrograms = useMemo(() => {

    return programs.filter(program => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || [
        program.name,
        program.learning_objectives,
        ...(program.default_stops || []),
      ].some(field => String(field || '').toLowerCase().includes(q));

      const nameLower = program.name.toLowerCase();
      const matchesCategory = selectedCategory === 'All' || (
        selectedCategory === 'Science & Nature' ? (nameLower.includes('science') || nameLower.includes('eco') || nameLower.includes('nature') || nameLower.includes('subic') || nameLower.includes('clark')) :
        selectedCategory === 'History & Culture' ? (nameLower.includes('manila') || nameLower.includes('heritage') || nameLower.includes('historical') || nameLower.includes('museum')) : true
      );

      return matchesSearch && matchesCategory;
    });
  }, [programs, searchQuery, selectedCategory]);

  const [activeBusIndex, setActiveBusIndex] = useState(0);

  const normalizeSeatCode = (code: string) => String(code || '').trim().replace(/^S/i, '');

  const selectedSeatsForActiveBus = useMemo(() => {
    const prefix = `Bus ${activeBusIndex + 1} · Seat `;
    return selectedSeats
      .filter(code => code.startsWith(prefix))
      .map(code => code.replace(prefix, ''));
  }, [selectedSeats, activeBusIndex]);

  const handleSeatToggleForBus = (seatNum: string) => {
    const fullCode = `Bus ${activeBusIndex + 1} · Seat ${seatNum}`;
    setSelectedSeats(current => {
      const exists = current.includes(fullCode);
      const next = exists ? current.filter(c => c !== fullCode) : [...current, fullCode];
      return Array.from(new Set(next)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
  };

  // Sync passengers roster state with selectedSeats and lead booker contact
  useEffect(() => {
    setPassengers(prevPassengers => {
      return selectedSeats.map((code, index) => {
        const existing = prevPassengers.find(p => p.seat_code === code);
        if (existing) return existing;

        if (index === 0 && isLeadAsPassenger1 && booking.contact_person) {
          const parts = booking.contact_person.trim().split(/\s+/);
          const firstName = parts[0] || '';
          const lastName = parts.slice(1).join(' ') || '';
          return {
            seat_code: code,
            first_name: firstName,
            last_name: lastName,
            passenger_type: 'student',
            date_of_birth: '',
          };
        }

        return {
          seat_code: code,
          first_name: '',
          last_name: '',
          passenger_type: 'student',
          date_of_birth: '',
        };
      });
    });
  }, [selectedSeats.join('|'), isLeadAsPassenger1, booking.contact_person]);

  const handlePrintProgramManifest = (program: typeof programs[number]) => {
    setManifestPassengers(
      passengers.length > 0
        ? passengers.map((p, idx) => ({
            rowId: globalThis.crypto?.randomUUID?.() || `manifest-row-${idx}-${Date.now()}`,
            seat_number: p.seat_code ? Number(p.seat_code) : idx + 1,
            first_name: p.first_name || `Student ${idx + 1}`,
            last_name: p.last_name || '',
            role: p.passenger_type === 'chaperone' ? 'tour_guide' : 'student',
            date_of_birth: p.date_of_birth || '',
          }))
        : Array.from({ length: Math.max(1, Number(booking.student_count || 45)) }, (_, idx) => ({
            rowId: globalThis.crypto?.randomUUID?.() || `manifest-row-${idx}-${Date.now()}`,
            seat_number: idx + 1,
            first_name: `Student ${idx + 1}`,
            last_name: `(${program.name})`,
            role: 'student',
            date_of_birth: '',
          }))
    );
    setManifestModalOpen(true);
  };

  const handleSelectProgram = (program: typeof programs[number]) => {
    const schoolName = (program as any).school_name || program.name;
    const pickup = (program as any).pickup_location || `${schoolName} Main Campus`;
    setBooking(b => ({
      ...b,
      program_id: String(program.id),
      school_name: schoolName,
      pickup_location: pickup,
      student_count: String(program.minimum_students || 45),
      stops: (program.default_stops || []).join('\n'),
    }));
  };

  const openEditProgram = (program: any) => {
    setEditingProgramId(program.id);
    setProgramForm({
      name: program.name,
      student_price: String(program.student_price),
      additional_chaperone_price: String(program.additional_chaperone_price),
      default_stops: (program.default_stops || []).join('\n'),
      minimum_students: String(program.minimum_students || 20),
      images: program.images ?? [],
    } as any);
    setProgramOpen(true);
  };


  const validInterval = Boolean(booking.starts_at && booking.ends_at && booking.ends_at > booking.starts_at);
  const { data: resources } = useQuery({ queryKey: ['educational-resources', booking.starts_at, booking.ends_at], queryFn: () => educationalTourApi.resources(booking.starts_at, booking.ends_at), enabled: validInterval });
  const { data: pricing } = useQuery({ queryKey: ['educational-quote', booking.program_id, booking.student_count, booking.tour_guide_count], queryFn: () => educationalTourApi.quote(Number(booking.program_id), Number(booking.student_count), Number(booking.tour_guide_count)), enabled: Boolean(booking.program_id && booking.student_count) });
  const travelers = Number(booking.student_count || 0) + Number(booking.tour_guide_count || 0);
  const requiredBuses = useMemo(() => Math.max(1, Math.ceil((travelers || 1) / 49)), [travelers]);

  const selectedProgram = programs.find(p => p.id === Number(booking.program_id));

  // Auto-fill bus & driver allocations when resources load or travelers change
  useEffect(() => {
    if (resources?.buses && resources.buses.length > 0) {
      const currentAllocatedCount = busAllocations.length;
      if (currentAllocatedCount < requiredBuses) {
        const newAllocs: AllocatedBus[] = [];
        const newAssigns: Assignment[] = [];

        for (let i = 0; i < requiredBuses; i++) {
          const fleetBus = resources.buses[i % resources.buses.length];
          const fleetDriver = resources.drivers[i % (resources.drivers.length || 1)];

          if (fleetBus) {
            newAllocs.push({
              bus_id: fleetBus.id,
              bus_name: `${fleetBus.model || 'Tourist Bus'} (${fleetBus.seating_capacity || 49} Seater)`,
              plate_number: fleetBus.plate_number,
              capacity: fleetBus.seating_capacity || 49,
              driver_id: fleetDriver ? fleetDriver.id : undefined,
              driver_name: fleetDriver ? `${fleetDriver.first_name} ${fleetDriver.last_name}` : undefined,
              seat_assignments: {},
            });
            newAssigns.push({
              bus_id: String(fleetBus.id),
              driver_id: fleetDriver ? String(fleetDriver.id) : '',
              planned_passengers: String(Math.min(49, travelers - i * 49)),
            });
          }
        }

        setBusAllocations(newAllocs);
        setAssignments(newAssigns);
      }
    }
  }, [resources, requiredBuses, travelers]);

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
    mutationFn: () => {
      const source = activeTab === 'builder' ? builderForm : programForm;
      const stopsRaw = source.default_stops || '';
      const stopsArray = typeof stopsRaw === 'string' 
        ? stopsRaw.split('\n').map(stop => stop.trim()).filter(Boolean)
        : (Array.isArray(stopsRaw) ? stopsRaw : ['Main Activity Spot']);

      const payload = {
        name: source.name,
        learning_objectives: (source as any).learning_objectives || 'Educational tour exposure',
        default_stops: stopsArray.length > 0 ? stopsArray : ['Main Activity Spot'],
        minimum_students: Number(source.minimum_students || 20),
        students_per_chaperone: Number((source as any).students_per_chaperone || 20),
        students_per_free_chaperone: Number((source as any).students_per_free_chaperone || 20),
        student_price: Number(source.student_price || 0),
        additional_chaperone_price: Number(source.additional_chaperone_price || 0),
        includes_meals: (source as any).includes_meals ?? true,
        includes_coordinator: (source as any).includes_coordinator ?? true,
        includes_insurance: (source as any).includes_insurance ?? true,
        includes_shirt: (source as any).includes_shirt ?? false,
        images: (source as any).images ?? [],
      };

      if (editingProgramId) {
        return educationalTourApi.updateProgram(editingProgramId, payload);
      }
      return educationalTourApi.createProgram(payload);
    },
    onSuccess: async created => {
      await queryClient.invalidateQueries({ queryKey: ['educational-programs'] });
      setBooking(current => ({ ...current, program_id: String(created.id), stops: created.default_stops.join('\n') }));
      setProgramOpen(false);
      setEditingProgramId(null);
      setProgramForm(initialProgram);
      toast.success(editingProgramId ? 'Educational program updated' : 'Educational program created and selected');
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors as Record<string, string[]> | undefined;
      toast.error(errors ? Object.values(errors)[0]?.[0] : error?.response?.data?.message ?? 'Program could not be saved');
    },
  });

  const removeProgram = useMutation({
    mutationFn: (id: number) => educationalTourApi.deleteProgram(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['educational-programs'] });
      await queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      toast.success('Educational program removed');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Program could not be removed'),
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
        pickup_location: booking.pickup_location,
        destination: selectedProgram.name,
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

  if (activeTab === 'catalog' && !selectedProgram && !programOpen) {
    return <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-5 rounded-3xl bg-[#071b33] p-7 text-white lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button onClick={() => navigate('/sales')} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Sales</button>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Educational program catalog</p>
          <h1 className="mt-1 text-3xl font-black">Choose an exposure tour program</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Choose the school program first. Dates, institution details, student roster, fleet, itinerary, budget, and payment open in its own booking workspace.</p>
        </div>
        <Button onClick={() => setActiveTab('builder')} className="!bg-amber-500 !text-white hover:!bg-amber-600"><Plus className="h-4 w-4" /> Create new educational program</Button>
      </header>

      <section className="rounded-3xl border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">School & academic tours</p><h2 className="mt-1 text-xl font-black text-ink">Program library</h2><p className="mt-1 text-xs text-muted">{filteredPrograms.length} program{filteredPrograms.length === 1 ? '' : 's'} ready for booking</p></div>
          <label className="relative block w-full md:w-80"><LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search program or circuit" className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm text-ink" /></label>
        </div>
        <div className="flex gap-2 overflow-x-auto px-6 pt-5">
          {['All', 'Science & Nature', 'History & Culture'].map((category) => <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black ${selectedCategory === category ? 'bg-blue-600 text-white' : 'border border-border bg-surface-alt text-muted'}`}>{category}</button>)}
        </div>
        {filteredPrograms.length === 0 ? <div className="p-12 text-center"><GraduationCap className="mx-auto h-10 w-10 text-muted" /><h3 className="mt-3 font-black text-ink">No matching programs</h3><p className="mt-1 text-sm text-muted">Adjust the filters or create a new educational program.</p></div> : <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPrograms.map(program => <PackageCatalogCard
            key={program.id}
            image={program.images?.[0]}
            images={program.images}
            badge="Educational tour"
            eyebrow="Academic exposure"
            title={program.name}
            description={program.learning_objectives}
            facts={[
              { label: 'Student rate', value: `₱${Number(program.student_price).toLocaleString()}`, icon: <GraduationCap className="h-4 w-4" /> },
              { label: 'Minimum', value: `${program.minimum_students || 20} pax`, icon: <Users className="h-4 w-4" /> },
              { label: 'Stops', value: `${program.default_stops?.length || 0} places`, icon: <LuCalendar className="h-4 w-4" /> },
            ]}
            actionLabel="Select program & continue"
            onAction={() => handleSelectProgram(program)}
            controls={
              <div className="flex gap-1">
                <button type="button" onClick={() => openEditProgram(program)} title="Edit program" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => { if (window.confirm(`Deactivate educational program "${program.name}"? Existing bookings and catalog services will be preserved.`)) removeProgram.mutate(program.id); }} title="Deactivate program" className="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/30 hover:text-rose-100"><Trash2 className="h-4 w-4" /></button>
              </div>
            }
          />)}
        </div>}
      </section>
      <EducationalBookingManager bookings={bookings} targetId={manageId} />
    </div>;
  }

  return (
    <div className="space-y-6">
      {activeTab === 'builder' ? (
        /* ================= FULL-WIDTH EDUCATIONAL PROGRAM BUILDER ================= */
        <div className="space-y-6">
          <header className="flex flex-col gap-4 rounded-3xl bg-[#071b33] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Catalog & Bookings
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                Studio · Educational Program Builder
              </p>
              <h1 className="mt-1 text-2xl font-black">Build & Launch Educational Exposure Package</h1>
              <p className="mt-1 text-sm text-slate-300">
                Finalize all program particulars upfront: school identity, target dates, rates, capacity, itinerary, inclusions, and 49-seater fleet allocations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveTab('catalog')}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!builderForm.name.trim()) {
                    toast.error('Enter the Educational Program Name');
                    return;
                  }
                  createProgram.mutate();
                }}
                disabled={createProgram.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-lg"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Save & Launch Program
              </Button>
            </div>
          </header>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="space-y-6">
              {/* Section 1: School & Package Identity */}
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 flex items-center justify-center font-bold shrink-0">
                    <LuGraduationCap size={20} />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">1 · Program & School Particulars</p>
                    <h2 className="text-lg font-black text-ink">Exposure Trip Package Blueprint</h2>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-bold text-muted md:col-span-2">
                    Program / Tour Title *
                    <input
                      type="text"
                      required
                      placeholder="e.g. Subic & Clark Science & Nature Educational Adventure"
                      value={builderForm.name}
                      onChange={e => setBuilderForm({ ...builderForm, name: e.target.value })}
                      className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                    />
                  </label>
                  <label className="text-xs font-bold text-muted">
                    School / Institution Name *
                    <input
                      type="text"
                      placeholder="e.g. Eagle's Nest Foundational Learning Center"
                      value={builderForm.school_name}
                      onChange={e => setBuilderForm({ ...builderForm, school_name: e.target.value })}
                      className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                    />
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Target Grade Level
                    <input
                      type="text"
                      placeholder="e.g. Grade 10 / High School"
                      value={builderForm.grade_level}
                      onChange={e => setBuilderForm({ ...builderForm, grade_level: e.target.value })}
                      className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-1">
                  <label className="text-xs font-bold text-muted">
                    Departure Date & Time
                    <input
                      type="datetime-local"
                      value={booking.starts_at}
                      onChange={e => setBooking({ ...booking, starts_at: e.target.value })}
                      className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                    />
                  </label>
                  <label className="text-xs font-bold text-muted">
                    Return Date & Time
                    <input
                      type="datetime-local"
                      value={booking.ends_at}
                      onChange={e => setBooking({ ...booking, ends_at: e.target.value })}
                      className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                    />
                  </label>
                  <label className="text-xs font-bold text-muted md:col-span-2 lg:col-span-1">
                    Default Pickup Point
                    <input
                      type="text"
                      placeholder="e.g. School Main Campus Assembly Gate"
                      value={booking.pickup_location}
                      onChange={e => setBooking({ ...booking, pickup_location: e.target.value })}
                      className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                    />
                  </label>
                </div>

                {/* Leaflet Location Map Picker for Educational Tour Pickup & Destination */}
                <div className="pt-2">
                  <TripLocationMapPicker
                    pickupLocation={booking.pickup_location || 'School Campus Gate'}
                    dropOffLocation={itinerary[0]?.location || 'Metro Manila Educational Circuit'}
                    vehicleType="Bus"
                    onLocationSelect={(pickup, dropoff) => {
                      setBooking(b => ({ ...b, pickup_location: pickup }));
                      if (itinerary[0]) {
                        const updated = [...itinerary];
                        updated[0] = { ...updated[0], location: dropoff };
                        setItinerary(updated);
                      }
                    }}
                  />
                </div>
              </section>

              {/* Section 2: Capacity, Pricing & Automated 49-Seater Fleet Calculation */}
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 flex items-center justify-center font-bold shrink-0">
                      <Bus className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">2 · Capacity, Rates & Logistics</p>
                      <h2 className="text-lg font-black text-ink">Roster Size & 49-Seater Fleet Setup</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBusAllocationModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider shadow shrink-0 flex items-center gap-1.5"
                  >
                    <Bus className="h-4 w-4" /> Multi-Bus & Drivers ({busAllocations.length} Bus)
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-bold text-muted">Student Price per Pax (₱)<input type="number" min="0" value={builderForm.student_price} onChange={e => setBuilderForm({ ...builderForm, student_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
                  <label className="text-xs font-bold text-muted">Tour Guide Price (₱)<input type="number" min="0" value={builderForm.additional_chaperone_price} onChange={e => setBuilderForm({ ...builderForm, additional_chaperone_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
                  <label className="text-xs font-bold text-muted">Target Student Count<input type="number" min="1" value={booking.student_count} onChange={e => setBooking({ ...booking, student_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
                  <label className="text-xs font-bold text-muted">Tour Guide Count<input type="number" min="0" value={booking.tour_guide_count} onChange={e => setBooking({ ...booking, tour_guide_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
                </div>

                {/* Live 49-Seater Fleet Calculation Banner */}
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest">
                      49-Seater Fleet Calculation
                    </span>
                    <span className="text-xs font-black text-blue-900 dark:text-blue-200">
                      {travelers} Travelers → {requiredBuses} x 49-Seater Bus(es) Required ({requiredBuses * 49} Seats Capacity)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                      Pre-Assigned Fleet:
                    </span>
                    {busAllocations.map((alloc, aIdx) => (
                      <span key={aIdx} className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100">
                        🚌 Bus #{aIdx + 1}: {alloc.plate_number} · 👨‍✈️ {alloc.driver_name || 'Driver Unassigned'}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Section 3: Structured Day-by-Day Operating Itinerary */}
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
                <ItineraryBuilder value={itinerary} onChange={setItinerary} />
              </section>

              {/* Section 4: Inclusions & Exclusions */}
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
                <InclusionsExclusionsEditor inclusions={inclusions} exclusions={exclusions} onChange={(inc, exc) => { setInclusions(inc); setExclusions(exc); }} />
              </section>
            </div>

            {/* Builder Sidebar Summary */}
            <aside className="sticky top-4 h-fit space-y-4">
              <div className="p-6 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 text-white shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest">
                    Studio Live Preview
                  </span>
                </div>
                <h3 className="text-xl font-black leading-snug">{builderForm.name || 'Untitled Exposure Tour Program'}</h3>
                <p className="text-xs text-slate-300">{builderForm.school_name || 'School Name Pending'} · {builderForm.grade_level || 'General Group'}</p>
                
                <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-semibold text-slate-200">
                  <div className="flex justify-between"><span>Per Student Rate</span><strong className="text-white">₱{Number(builderForm.student_price || 0).toLocaleString()}</strong></div>
                  <div className="flex justify-between"><span>Target Student Count</span><strong className="text-white">{booking.student_count} pax</strong></div>
                  <div className="flex justify-between text-base font-black text-amber-400 pt-2 border-t border-white/10">
                    <span>Est. Package Revenue</span>
                    <span>₱{(Number(builderForm.student_price || 0) * Number(booking.student_count || 1)).toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!builderForm.name.trim()) {
                      toast.error('Enter the Educational Program Name');
                      return;
                    }
                    createProgram.mutate();
                  }}
                  disabled={createProgram.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider py-3 shadow-lg"
                >
                  Save & Launch Program
                </Button>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        /* ================= STREAMLINED CATALOG & CUSTOMER BOOKING VIEW ================= */
        <div className="space-y-6">
          {selectedProgram && <BookingWorkspaceHeader
            eyebrow="Educational tour booking workspace"
            badge="Educational program"
            image={selectedProgram.images?.[0]}
            title={selectedProgram.name}
            description={selectedProgram.learning_objectives || 'Complete the school details, schedule, student roster, itinerary, fleet allocation, proposed budget, and checkout.'}
            onBack={() => {
              setBooking(current => ({ ...current, program_id: '' }));
              setSelectedSeats([]);
              setPassengers([]);
              setBusAllocations([]);
            }}
            facts={[
              { label: 'Per-student rate', value: `₱${Number(selectedProgram.student_price).toLocaleString()}` },
              { label: 'Minimum group', value: `${selectedProgram.minimum_students || 20} students` },
              { label: 'Program stops', value: `${selectedProgram.default_stops?.length || 0} destinations` },
            ]}
            actions={<><Button onClick={() => setManifestModalOpen(true)} className="!bg-blue-600 !text-white"><Users className="h-4 w-4" /> Manifest ({manifestPassengers.length})</Button><Button onClick={() => setBusAllocationModalOpen(true)} className="!bg-amber-500 !text-white"><Bus className="h-4 w-4" /> Fleet & seats</Button></>}
          />}

          <EducationalBookingManager bookings={bookings} targetId={manageId} />

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="space-y-6">
              {/* 1. Distinct Elevated Catalog Selection Container Card */}
              <section className="hidden rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/50 via-slate-50 to-white dark:from-slate-900/80 dark:via-gray-900/60 dark:to-gray-900 p-6 shadow-md space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 dark:border-gray-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[9.5px] font-black uppercase tracking-widest shadow-sm">
                        Catalog Picker
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        {filteredPrograms.length} {filteredPrograms.length === 1 ? 'Program' : 'Programs'} Available
                      </span>
                    </div>
                    <h2 className="mt-1 text-xl font-black text-ink tracking-tight">Select Exposure Program</h2>
                  </div>

                  {/* Real-time Search Input & Category Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative">
                      <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search programs or circuits..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-56 pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-ink focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Filter Pills Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {['All', 'Science & Nature', 'History & Culture'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredPrograms.map(program => (
                    <PackageCatalogCard
                      key={program.id}
                      image={program.images?.[0]}
                      badge="Educational tour"
                      eyebrow="Academic exposure"
                      title={program.name}
                      description={program.learning_objectives}
                      selected={String(program.id) === booking.program_id}
                      facts={[
                        { label: 'Student rate', value: `₱${Number(program.student_price).toLocaleString()}`, icon: <GraduationCap className="h-4 w-4" /> },
                        { label: 'Minimum', value: `${program.minimum_students || 20} pax`, icon: <Users className="h-4 w-4" /> },
                        { label: 'Stops', value: `${program.default_stops?.length || 0} places`, icon: <LuCalendar className="h-4 w-4" /> },
                      ]}
                      actionLabel={String(program.id) === booking.program_id ? 'Selected — continue below' : 'Configure school booking'}
                      onAction={() => {
                        handleSelectProgram(program);
                        setExpandedProgramId(program.id);
                      }}
                      controls={<button type="button" onClick={() => openEditProgram(program)} title="Edit program" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><Pencil className="h-4 w-4" /></button>}
                    />
                  ))}
                </div>

                {/* Height-Bounded Scrollable Catalog Items List */}
                <div className="hidden max-h-[380px] overflow-y-auto custom-scrollbar space-y-3 pr-1.5">
                  {filteredPrograms.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 bg-white dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <LuBookOpen className="w-8 h-8 mx-auto opacity-30 mb-2" />
                      <p className="text-xs font-bold uppercase tracking-wider">No matching educational programs found</p>
                      <p className="text-[11px] text-gray-400 mt-1">Try adjusting your search terms or filter selection.</p>
                    </div>
                  ) : (
                    filteredPrograms.map(program => {
                      const active = String(program.id) === booking.program_id;
                      const isExpanded = expandedProgramId === program.id || active;

                      return (
                        <div
                          key={program.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            active
                              ? 'border-blue-600 bg-white dark:bg-gray-900 shadow-md ring-2 ring-blue-500/20'
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-blue-300'
                          }`}
                        >
                          {/* Collapsible Header Row */}
                          <div
                            onClick={() => {
                              handleSelectProgram(program);
                              setExpandedProgramId(expandedProgramId === program.id ? null : program.id);
                            }}
                            className="p-4 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                {program.images?.[0]
                                  ? <img src={getStorageUrl(program.images[0])} alt={program.name} className="h-full w-full object-cover" />
                                  : <div className="grid h-full place-items-center"><GraduationCap className="h-6 w-6 text-slate-300" /></div>}
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9.5px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                                    Academic Exposure
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-400">Min. {program.minimum_students || 20} Students</span>
                                </div>
                                <h3 className="mt-0.5 truncate text-base font-black text-ink">{program.name}</h3>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                  ₱{Number(program.student_price).toLocaleString()}
                                </span>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">per student</p>
                              </div>
                              <button
                                type="button"
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"
                              >
                                <LuChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Program Details Panel */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-800/30 space-y-3">
                              {program.learning_objectives && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                  {program.learning_objectives}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                                  ✓ Optional 1–3 Tour Guides per Bus
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40">
                                  ✓ Guided Tour & Safety Kit Included
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex flex-wrap gap-1.5">
                                  {program.default_stops && program.default_stops.map((stop, sIdx) => (
                                    <span key={sIdx} className="px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded text-[11px] font-semibold">
                                      📍 {stop}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingProgramId(program.id);
                                      setProgramForm({
                                        name: program.name,
                                        student_price: String(program.student_price),
                                        additional_chaperone_price: String(program.additional_chaperone_price),
                                        default_stops: (program.default_stops || []).join('\n'),
                                         minimum_students: String(program.minimum_students || 20),
                                         images: program.images ?? [],
                                       } as any);
                                      setProgramOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-100 transition-all shadow-sm"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Edit Program
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintProgramManifest(program);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-blue-100 transition-all shadow-sm"
                                  >
                                    <Printer className="w-3.5 h-3.5" /> Program Manifest & Print
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* 2. Customer Booking Particulars with Joiner-Style Seat Selector & DOB Insurance Roster */}
              <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 flex items-center justify-center font-bold shrink-0">
                      <LuGraduationCap size={20} />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Customer Booking Particulars</p>
                      <h2 className="text-lg font-black text-ink">Reserve Bus Seats & Register Travelers</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl">
                      {selectedSeats.length} Seat(s) Selected
                    </span>
                  </div>
                </div>

                {/* Finalized Program Summary Badge */}
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-[9.5px] font-black uppercase tracking-widest">
                      Finalized Exposure Package
                    </span>
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      {booking.starts_at ? new Date(booking.starts_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Dates Pending'}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-blue-950 dark:text-blue-100">{booking.school_name || selectedProgram?.name || 'Educational Program'}</h4>
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Pickup Point: <strong>{booking.pickup_location || 'Main Campus Assembly Gate'}</strong> · Assigned Fleet: <strong>{requiredBuses} x 49-Seater Tourist Buses</strong>
                  </p>
                </div>

                {/* Lead Contact Person Inputs & Lead-as-Passenger-1 Checkbox */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-ink">1 · Lead Customer / Booker Details</h3>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLeadAsPassenger1}
                        onChange={e => setIsLeadAsPassenger1(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Set Lead Booker as Passenger 1</span>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-xs font-bold text-muted">
                      Contact Person Name *
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maria Santos (Parent / Admin)"
                        value={booking.contact_person}
                        onChange={e => setBooking({ ...booking, contact_person: e.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                      />
                    </label>
                    <label className="text-xs font-bold text-muted">
                      Contact Phone Number *
                      <input
                        type="text"
                        required
                        placeholder="e.g. 09171234567"
                        value={booking.contact_number}
                        onChange={e => setBooking({ ...booking, contact_number: e.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                      />
                    </label>
                    <label className="text-xs font-bold text-muted">
                      Contact Email Address
                      <input
                        type="email"
                        placeholder="e.g. maria.santos@school.edu.ph"
                        value={booking.contact_email}
                        onChange={e => setBooking({ ...booking, contact_email: e.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Interactive 49-Seater Bus Seat Selection */}
                <div className="space-y-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-ink">2 · Interactive 49-Seater Bus Seat Selection</h3>
                      <p className="text-xs text-muted">Each bus is strictly 49-seaters. Select a bus tab below to assign specific seats for travelers.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
                      {selectedSeats.length} Total Seat(s) Selected
                    </span>
                  </div>

                  {/* Multi-Bus Navigation Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border scrollbar-thin">
                    {Array.from({ length: requiredBuses }, (_, idx) => {
                      const busNum = idx + 1;
                      const busPrefix = `Bus ${busNum} · Seat `;
                      const countOnThisBus = selectedSeats.filter(code => code.startsWith(busPrefix)).length;
                      const isActive = activeBusIndex === idx;
                      return (
                        <button
                          key={busNum}
                          type="button"
                          onClick={() => setActiveBusIndex(idx)}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border whitespace-nowrap ${
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                              : 'bg-surface hover:bg-surface-alt text-ink border-border'
                          }`}
                        >
                          <Bus className="w-4 h-4" />
                          <span>Bus #{busNum} (49 Seats)</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : 'bg-surface-alt text-muted'
                          }`}>
                            {countOnThisBus} / 49
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Bus 49-Seater Blueprint */}
                  <div className="p-4 rounded-2xl border border-border bg-surface-alt/40">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Bus className="w-4 h-4 text-blue-600" />
                        Bus #{activeBusIndex + 1} Blueprint (49 Seater)
                      </span>
                      <span className="text-[11px] font-bold text-muted">
                        {selectedSeatsForActiveBus.length} seat(s) chosen on Bus #{activeBusIndex + 1}
                      </span>
                    </div>
                    <BusLayout
                      totalSeats={49}
                      hasRestroom={false}
                      selectedSeats={selectedSeatsForActiveBus}
                      occupiedSeats={[]}
                      onSeatToggle={handleSeatToggleForBus}
                    />
                  </div>
                </div>

                {/* Per-Seat Passenger Roster Entry with Mandatory Date of Birth (Insurance) */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-ink">3 · Passenger Roster & Insurance DOB Registration</h3>
                      <p className="text-xs text-muted">Dates of Birth are mandatory for comprehensive student accident travel insurance.</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-200">
                      {passengers.length} Passenger Record(s) Required
                    </span>
                  </div>

                  {passengers.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 bg-white dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <Bus className="w-8 h-8 mx-auto opacity-30 mb-2" />
                      <p className="text-xs font-bold uppercase tracking-wider">No seats selected yet</p>
                      <p className="text-[11px] text-gray-400 mt-1">Click seats on the bus map above to open passenger name & DOB inputs.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {passengers.map((p, idx) => (
                        <div key={p.seat_code || idx} className="p-4 rounded-2xl border border-border bg-surface-alt/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                              Seat {p.seat_code}
                            </span>
                            <select
                              value={p.passenger_type}
                              onChange={e => {
                                const type = e.target.value as 'student' | 'chaperone';
                                setPassengers(curr => curr.map((item, i) => i === idx ? { ...item, passenger_type: type } : item));
                              }}
                              className="text-[11px] font-bold bg-surface border border-border rounded-lg px-2.5 py-1 text-ink"
                            >
                              <option value="student">Student</option>
                              <option value="chaperone">Tour Guide / Chaperone</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="First Name *"
                              value={p.first_name}
                              onChange={e => {
                                const val = e.target.value;
                                setPassengers(curr => curr.map((item, i) => i === idx ? { ...item, first_name: val } : item));
                              }}
                              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                            />
                            <input
                              type="text"
                              placeholder="Last Name *"
                              value={p.last_name}
                              onChange={e => {
                                const val = e.target.value;
                                setPassengers(curr => curr.map((item, i) => i === idx ? { ...item, last_name: val } : item));
                              }}
                              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                              Date of Birth (Travel Insurance *)
                            </label>
                            <input
                              type="date"
                              required
                              value={p.date_of_birth}
                              onChange={e => {
                                const val = e.target.value;
                                setPassengers(curr => curr.map((item, i) => i === idx ? { ...item, date_of_birth: val } : item));
                              }}
                              className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="block text-xs font-bold text-muted pt-2 border-t border-border">
                  Booking & Dispatch Notes
                  <textarea
                    rows={2}
                    placeholder="Dietary requirements, gate access permits, or special coordinator instructions"
                    value={booking.operations_notes}
                    onChange={e => setBooking({ ...booking, operations_notes: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-ink"
                  />
                </label>
              </section>
            </div>

            <aside className="sticky top-4 h-fit space-y-4">
              <ProposedTripBudgetCard
                proposedBudget={85000}
                basePrice={pricing?.student_amount || (Number(selectedProgram?.student_price || 0) * Number(booking.student_count || 1))}
                additions={[
                  ...(pricing?.tour_guide_count && pricing.tour_guide_count > 0
                    ? [{
                        label: `${pricing.tour_guide_count} Tour Guide(s) @ ₱${Number(selectedProgram?.additional_chaperone_price || 0).toLocaleString()}`,
                        amount: pricing.tour_guide_amount || 0,
                        type: 'addition' as const,
                      }]
                    : [])
                ]}
                subtractions={[]}
                taxAmount={pricing?.tax_amount || 0}
                taxRate={pricing?.tax_rate || 0.12}
                title="School Exposure Proposed Budget"
              />

              <SalesCheckout
                cart={cart}
                customerPreset={customerPreset}
                removeFromCart={() => setBooking(current => ({ ...current, program_id: '' }))}
                updateQuantity={() => {}}
                clearCart={() => {}}
                onEditCartItem={() => setBusAllocationModalOpen(true)}
                onCheckoutSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['educational-bookings'] });
                  toast.success('Educational tour order finalized!');
                }}
              />
            </aside>
          </div>
        </div>
      )}

      {/* Multi-Bus Allocation & Seat Selector Modal */}
      <BusSeatAllocationModal
        isOpen={busAllocationModalOpen}
        onClose={() => setBusAllocationModalOpen(false)}
        requiredCapacity={travelers}
        passengers={manifestPassengers}
        initialAllocations={busAllocations}
        availableDrivers={resources?.drivers || []}
        onSaveAllocations={(allocs) => {
          setBusAllocations(allocs);
          if (allocs.length > 0) {
            setAssignments(allocs.map(a => ({
              bus_id: String(a.bus_id),
              driver_id: a.driver_id ? String(a.driver_id) : '',
              planned_passengers: String(Object.keys(a.seat_assignments).length || a.capacity),
            })));
          }
        }}
      />

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

      {/* Program Creation / Edit Modal */}
      <Modal isOpen={programOpen} onClose={() => { setProgramOpen(false); setEditingProgramId(null); }} title={editingProgramId ? "Edit educational program" : "Create educational program"} size="lg" footer={null}>
        <form onSubmit={event => { event.preventDefault(); createProgram.mutate(); }} className="grid gap-4 py-2 md:grid-cols-2">
          <label className="text-xs font-bold text-muted md:col-span-2">Program name<input required value={programForm.name} onChange={e => setProgramForm({ ...programForm, name: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Student price<input required type="number" min="0" value={programForm.student_price} onChange={e => setProgramForm({ ...programForm, student_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Tour Guide price<input required type="number" min="0" value={programForm.additional_chaperone_price} onChange={e => setProgramForm({ ...programForm, additional_chaperone_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Default Stops (One per line)<textarea value={programForm.default_stops} onChange={e => setProgramForm({ ...programForm, default_stops: e.target.value })} className="mt-1 min-h-[80px] w-full rounded-xl border border-border bg-surface p-3 text-sm font-semibold" /></label>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-muted">Program images</span><Button type="button" variant="secondary" size="sm" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.onchange = async (event: any) => { for (const file of Array.from(event.target.files as FileList)) { const response = await billingApi.uploadServiceImage(file); const path = response.data.path ?? response.data.url; if (path) setProgramForm(current => ({ ...current, images: [...current.images, path] })); } }; input.click(); }}><ImagePlus className="h-4 w-4" /> Add images</Button></div>
            {programForm.images.length > 0 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{programForm.images.map((image, index) => <div key={`${image}-${index}`} className="relative h-24 overflow-hidden rounded-xl"><img src={getStorageUrl(image)} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => setProgramForm(current => ({ ...current, images: current.images.filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white"><X className="h-3 w-3" /></button></div>)}</div>}
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-5 md:col-span-2"><Button type="button" variant="ghost" onClick={() => { setProgramOpen(false); setEditingProgramId(null); }}>Cancel</Button><Button type="submit" disabled={createProgram.isPending}>{editingProgramId ? 'Save changes' : 'Create program'}</Button></div>
        </form>
      </Modal>

    </div>
  );
}

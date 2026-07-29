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
import { LuChevronDown, LuSearch, LuFilter, LuMapPin, LuCalendar, LuBus } from 'react-icons/lu';
import { BusSeatAllocationModal } from '../../components/ui';
import type { AllocatedBus } from '../../components/ui/BusSeatAllocationModal';


const getTomorrowStartEnd = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return { starts_at: `${dateStr}T08:00`, ends_at: `${dateStr}T20:00` };
};

const bookingInitial = { rate_plan_id: '', starts_at: getTomorrowStartEnd().starts_at, ends_at: getTomorrowStartEnd().ends_at, pickup_location: 'Manila Office', destination: 'Tagaytay City', stops: '', passenger_count: '25', estimated_kilometers: '120', bus_id: '', driver_id: '', lead_name: '', lead_email: '', lead_contact: '', payment_method: 'Cash', payment_type: 'full', amount_received: '', operations_notes: '' };
const planInitial = { service_id: '', name: '', vehicle_class: 'bus', rate_per_km: '', min_km_basis: '100', included_hours: '12', extra_hour_rate: '0', extra_kilometer_rate: '0', overnight_rate: '0', includes_driver: true, includes_fuel: true, includes_tolls: false, includes_parking: false };

export default function CharterSales() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState(bookingInitial);
  const [planForm, setPlanForm] = useState(planInitial);
  const [planOpen, setPlanOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [busAllocationModalOpen, setBusAllocationModalOpen] = useState(false);
  const [busAllocations, setBusAllocations] = useState<AllocatedBus[]>([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');

  const { data: plans = [] } = useQuery({ queryKey: ['charter-rate-plans'], queryFn: charterApi.ratePlans });

  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || [
        plan.name,
        plan.vehicle_class,
      ].some(field => String(field || '').toLowerCase().includes(q));

      const matchesClass = selectedClass === 'All' || (
        selectedClass === 'Tourist Bus' ? (plan.vehicle_class?.toLowerCase().includes('bus') || plan.name.toLowerCase().includes('bus')) :
        selectedClass === 'Coaster' ? (plan.vehicle_class?.toLowerCase().includes('coaster') || plan.name.toLowerCase().includes('coaster')) :
        selectedClass === 'Van' ? (plan.vehicle_class?.toLowerCase().includes('van') || plan.name.toLowerCase().includes('van')) : true
      );

      return matchesSearch && matchesClass;
    });
  }, [plans, searchQuery, selectedClass]);

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
    const filtered = items.filter(service => {
      const cat = String(service.category || '').toLowerCase();
      const type = String(service.service_type || '').toLowerCase();
      const name = String(service.name || '').toLowerCase();

      // Exclude non-transport categories and keywords (tours, educational programs, visa, passporting, hotels, tutorials)
      const isIrrelevant = ['educational', 'tour', 'package', 'joiner', 'visa', 'passport', 'hotel', 'consultation', 'processing', 'tutorial', 'learning'].some(ex =>
        cat.includes(ex) || type.includes(ex) || name.includes(ex)
      );

      if (isIrrelevant) {
        // Keep only if name explicitly specifies bus rental / charter / transport / transfer service
        const isExplicitBusCharter = /bus rental|charter|bus charter|transport service|transfer service|bus -/i.test(name);
        if (!isExplicitBusCharter) return false;
      }

      return (
        ['transport', 'bus rental', 'charter', 'bus', 'fleet', 'vehicle', 'logistics'].includes(cat) ||
        ['bus_rental', 'transfer_service', 'transport', 'charter'].includes(type) ||
        /bus|charter|rental|transport|transfer|coaster|van/i.test(name)
      );
    });

    return filtered.length > 0 ? filtered : items;
  }, [serviceResponse]);

  // Auto-select first matching catalog service when modal is opened or services load
  useEffect(() => {
    if (services.length > 0 && (!planForm.service_id || !services.some(s => String(s.id) === planForm.service_id))) {
      setPlanForm(pf => ({ ...pf, service_id: String(services[0].id) }));
    }
  }, [services, planOpen]);

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

  // Compute base price from rate_per_km × min_km_basis
  const computedBasePrice = useMemo(() => {
    const rate = parseFloat(planForm.rate_per_km) || 0;
    const minKm = parseFloat(planForm.min_km_basis) || 0;
    return Math.round(rate * minKm);
  }, [planForm.rate_per_km, planForm.min_km_basis]);

  const createPlan = useMutation({ mutationFn: () => charterApi.createRatePlan({ service_id: Number(planForm.service_id), name: planForm.name, vehicle_class: planForm.vehicle_class, base_price: computedBasePrice, included_hours: Number(planForm.included_hours), included_kilometers: Number(planForm.min_km_basis), extra_hour_rate: Number(planForm.extra_hour_rate), extra_kilometer_rate: Number(planForm.extra_kilometer_rate), overnight_rate: Number(planForm.overnight_rate), includes_driver: planForm.includes_driver, includes_fuel: planForm.includes_fuel, includes_tolls: planForm.includes_tolls, includes_parking: planForm.includes_parking, rate_per_km: Number(planForm.rate_per_km) }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['charter-rate-plans'] }); setPlanOpen(false); setPlanForm(planInitial); toast.success('Charter rate plan created'); }, onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Rate plan could not be created') });

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
        <Button onClick={() => setBusAllocationModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider">
          <Bus className="mr-1.5 h-4 w-4" /> Multi-Bus & Seat Selector {busAllocations.length > 0 ? `(${busAllocations.length} Bus)` : ''}
        </Button>
        <Button onClick={() => setPlanOpen(true)} variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/20"><Plus className="mr-1.5 h-4 w-4" /> New Rate Plan</Button>
      </div>
    </header>

    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-6">
        {/* 1. Distinct Elevated Rate Plans Catalog Selection Container Card */}
        <section className="rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/50 via-slate-50 to-white dark:from-slate-900/80 dark:via-gray-900/60 dark:to-gray-900 p-6 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 dark:border-gray-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[9.5px] font-black uppercase tracking-widest shadow-sm">
                  Catalog Picker
                </span>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                  {filteredPlans.length} {filteredPlans.length === 1 ? 'Rate Plan' : 'Rate Plans'} Available
                </span>
              </div>
              <h2 className="mt-1 text-xl font-black text-ink tracking-tight">Select Charter Rate Plan</h2>
            </div>

            {/* Real-time Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search rate plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56 pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-ink focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Class Filter Pills Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {['All', 'Tourist Bus', 'Coaster', 'Van'].map((vClass) => (
              <button
                key={vClass}
                type="button"
                onClick={() => setSelectedClass(vClass)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all shrink-0 ${
                  selectedClass === vClass
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'
                }`}
              >
                {vClass}
              </button>
            ))}
          </div>

          {/* Height-Bounded Scrollable Rate Plans List */}
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar space-y-3 pr-1.5">
            {filteredPlans.length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-white dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <LuBus className="w-8 h-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">No matching charter rate plans found</p>
                <p className="text-[11px] text-gray-400 mt-1">Try adjusting your search query or vehicle class filter.</p>
              </div>
            ) : (
              filteredPlans.map(plan => {
                const active = String(plan.id) === booking.rate_plan_id;
                const isExpanded = expandedPlanId === plan.id || active;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      active
                        ? 'border-blue-600 bg-white dark:bg-gray-900 shadow-md ring-2 ring-blue-500/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-blue-300'
                    }`}
                  >
                    {/* Collapsible Header Row */}
                    <div
                      onClick={() => {
                        setBooking(b => ({ ...b, rate_plan_id: String(plan.id) }));
                        setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id);
                      }}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9.5px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                              {plan.vehicle_class || 'Tourist Bus'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">
                              Includes {plan.included_hours}h / {plan.included_kilometers}km
                            </span>
                          </div>
                          <h3 className="text-base font-black text-ink mt-0.5">{plan.name}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                            ₱{Number(plan.base_price).toLocaleString()}
                          </span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Base Rate</p>
                        </div>
                        <button
                          type="button"
                          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"
                        >
                          <LuChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Rate Plan Details Panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-800/30 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-semibold">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Excess Hourly Rate</p>
                            <p className="text-sm font-black text-ink mt-0.5">₱{Number(plan.extra_hour_rate || 0).toLocaleString()} / hr</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Excess Distance Rate</p>
                            <p className="text-sm font-black text-ink mt-0.5">₱{Number(plan.extra_kilometer_rate || 0).toLocaleString()} / km</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Overnight Fee</p>
                            <p className="text-sm font-black text-ink mt-0.5">₱{Number(plan.overnight_rate || 0).toLocaleString()} / night</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold pt-1">
                          <span className={`px-2.5 py-1 rounded-lg border ${
                            plan.includes_driver
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {plan.includes_driver ? '✓ Professional Driver Included' : '✕ Driver Fee Separate'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg border ${
                            plan.includes_fuel
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {plan.includes_fuel ? '✓ Full Tank Fuel Included' : '✕ Fuel Charged at Actual'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 2. Isolated Schedule & Route Particulars Card */}
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 flex items-center justify-center font-bold shrink-0">
              <LuCalendar size={20} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Charter Schedule & Route</p>
              <h2 className="text-lg font-black text-ink">Trip Route & Date Inputs</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-muted">Departure Date & Time<input type="datetime-local" value={booking.starts_at} onChange={e => setBooking({ ...booking, starts_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            <label className="text-xs font-bold text-muted">Return Date & Time<input type="datetime-local" value={booking.ends_at} onChange={e => setBooking({ ...booking, ends_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            <label className="text-xs font-bold text-muted">Passenger Count<input type="number" min="1" max="500" value={booking.passenger_count} onChange={e => setBooking({ ...booking, passenger_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
            <label className="text-xs font-bold text-muted">Est. Distance (KM)<input type="number" min="0" value={booking.estimated_kilometers} onChange={e => setBooking({ ...booking, estimated_kilometers: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink" /></label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 pt-1">
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

    {/* Multi-Bus Allocation & Seat Selector Modal */}
    <BusSeatAllocationModal
      isOpen={busAllocationModalOpen}
      onClose={() => setBusAllocationModalOpen(false)}
      requiredCapacity={paxCount}
      passengers={manifestPassengers}
      initialAllocations={busAllocations}
      availableDrivers={resources?.drivers || []}
      onSaveAllocations={(allocs) => {
        setBusAllocations(allocs);
        if (allocs.length > 0) {
          setBusAssignments(allocs.map(a => ({
            bus_id: String(a.bus_id),
            driver_id: a.driver_id ? String(a.driver_id) : '',
          })));
        }
      }}
    />

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

    <Modal isOpen={planOpen} onClose={() => setPlanOpen(false)} title="Create Charter Rate Plan" size="lg" footer={null}>
      <form onSubmit={e => { e.preventDefault(); createPlan.mutate(); }} className="space-y-5 py-2">

        {/* Catalog Service + Plan Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="md:col-span-2 text-xs font-bold text-muted">
            Catalog Service
            <select required value={planForm.service_id} onChange={e => setPlanForm({ ...planForm, service_id: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm">
              <option value="">Select transport service…</option>
              {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-muted">
            Rate Plan Name
            <input required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Deluxe Bus Charter — Daily Luzon" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" />
          </label>
          <label className="text-xs font-bold text-muted">
            Vehicle Type
            <select value={planForm.vehicle_class} onChange={e => setPlanForm({ ...planForm, vehicle_class: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm">
              <option value="bus">Tourist Bus (49 Seater)</option>
              <option value="coaster">Coaster (28-30 Seater)</option>
              <option value="van">Van (10-14 Seater)</option>
            </select>
          </label>
        </div>

        {/* KM-Based Rate Engine — replaces flat base price input */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">📍 Distance-Based Rate Engine</p>
            <span className="text-[10px] text-blue-500 font-bold">Base Price = Rate/km × Minimum KM</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs font-bold text-muted">
              Rate per KM (₱/km)
              <input required type="number" min="0" step="0.01" value={planForm.rate_per_km} onChange={e => setPlanForm({ ...planForm, rate_per_km: e.target.value })} placeholder="e.g. 45" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-bold" />
            </label>
            <label className="text-xs font-bold text-muted">
              Minimum Billable KM
              <input required type="number" min="0" value={planForm.min_km_basis} onChange={e => setPlanForm({ ...planForm, min_km_basis: e.target.value })} placeholder="e.g. 100" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-bold" />
            </label>
          </div>
          {/* Computed Base Price Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Computed Base Price</p>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300">
                ₱{computedBasePrice.toLocaleString()}
              </p>
              <p className="text-[9px] text-gray-400">
                ₱{parseFloat(planForm.rate_per_km || '0').toLocaleString()}/km × {planForm.min_km_basis || '0'} km minimum
              </p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2 text-center border-l border-gray-100 dark:border-gray-700 pl-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Rate/km</p>
                <p className="text-sm font-black text-gray-800 dark:text-white">₱{parseFloat(planForm.rate_per_km || '0').toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Min KM</p>
                <p className="text-sm font-black text-gray-800 dark:text-white">{planForm.min_km_basis || '0'} km</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-orange-500 uppercase">Base Total</p>
                <p className="text-sm font-black text-orange-600">₱{computedBasePrice.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            💡 Extra km beyond minimum will be billed at the "Extra KM Rate" below.
          </p>
        </div>

        {/* Per-Hour & Overtime Rates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['included_hours', 'Included Hours/Day', '12'],
            ['extra_hour_rate', 'Extra Hour Rate (₱)', '0'],
            ['extra_kilometer_rate', 'Extra KM Rate (₱/km)', '0'],
            ['overnight_rate', 'Overnight Rate (₱/night)', '0'],
          ].map(([key, label, ph]) => (
            <label key={key} className="text-xs font-bold text-muted">
              {label}
              <input type="number" min="0" placeholder={ph} value={(planForm as any)[key]} onChange={e => setPlanForm({ ...planForm, [key]: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" />
            </label>
          ))}
        </div>

        {/* Inclusions */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Included in Base Rate</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([['includes_driver', 'Driver Fee'], ['includes_fuel', 'Full Tank Fuel'], ['includes_tolls', 'Toll Fees'], ['includes_parking', 'Parking Fees']] as [string, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer">
                <input type="checkbox" checked={Boolean((planForm as any)[key])} onChange={e => setPlanForm({ ...planForm, [key]: e.target.checked })} className="w-4 h-4 rounded" />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => setPlanOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={createPlan.isPending || computedBasePrice === 0}>
            {createPlan.isPending ? 'Creating…' : `Create Rate Plan — ₱${computedBasePrice.toLocaleString()} base`}
          </Button>
        </div>
      </form>
    </Modal>
  </div>;
}

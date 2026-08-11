import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ArrowLeft, Bus, CalendarClock, CheckCircle2, ChevronDown, Fuel, Gauge, LockKeyhole, Plus, Route, ShieldCheck, TriangleAlert, UsersRound, UserRound, Sparkles, Users, Pencil, Trash2 } from 'lucide-react';

import toast from 'react-hot-toast';
import { billingApi, type Service } from '../../api/billing';
import { charterApi, type CharterRatePlan, type RouteEstimate } from '../../api/charters';

import { Button, Modal } from '../../components/ds';
import BusLayout from '../../components/ui/BusLayout';
import SalesCheckout, { type CartItem } from './SalesCheckout';
import SeatSelectorModal, { type SeatSelectionResult, type VehicleBookingMode } from '../../components/travel/SeatSelectorModal';
import PassengerManifestModal, { type PassengerManifestRow } from '../../components/travel/PassengerManifestModal';
import InclusionsExclusionsEditor from '../../components/travel/InclusionsExclusionsEditor';
import { LuChevronDown, LuSearch, LuFilter, LuMapPin, LuCalendar, LuBus } from 'react-icons/lu';
import { BusSeatAllocationModal } from '../../components/ui';
import type { AllocatedBus } from '../../components/ui/BusSeatAllocationModal';
import TripLocationMapPicker from '../../components/travel/TripLocationMapPicker';
import CharterBookingManager from './components/CharterBookingManager';
import { getStorageUrl } from '../../utils';
import PackageCatalogCard from './components/PackageCatalogCard';
import BookingWorkspaceHeader from './components/BookingWorkspaceHeader';
import BusCharterQuotationModal from './components/BusCharterQuotationModal';
import TollMatrixPicker from './components/TollMatrixPicker';
import { LuFileText } from 'react-icons/lu';


const getTomorrowStartEnd = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return { starts_at: `${dateStr}T08:00`, ends_at: `${dateStr}T20:00` };
};

const bookingInitial = { rate_plan_id: '', starts_at: getTomorrowStartEnd().starts_at, ends_at: getTomorrowStartEnd().ends_at, pickup_location: 'Manila Office', destination: 'Tagaytay City', stops: '', passenger_count: '25', estimated_kilometers: '120', bus_id: '', driver_id: '', lead_name: '', lead_email: '', lead_contact: '', payment_method: 'Cash', payment_type: 'full', amount_received: '', operations_notes: '' };
const GARAGE_LOCATION = 'Q24R+FP Caloocan, Metro Manila';
const planInitial = { service_id: '', name: '', vehicle_class: 'bus', rate_per_km: '', min_km_basis: '0', pickup_location: '', drop_off_location: '', included_hours: '12', extra_hour_rate: '0', extra_kilometer_rate: '0', overnight_rate: '0', includes_driver: true, includes_fuel: true, includes_tolls: false, includes_parking: false };

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
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  // Profit-First Engine States
  const [customBaseRate, setCustomBaseRate] = useState('35000');
  const [dieselPricePerL, setDieselPricePerL] = useState('60');
  const [estimatedLiters, setEstimatedLiters] = useState('0');
  const [dieselCost, setDieselCost] = useState('0');
  const [tollFeeEst, setTollFeeEst] = useState('0');
  const [easytripEst, setEasytripEst] = useState('0');
  const [autosweepEst, setAutosweepEst] = useState('0');
  const [mealAllowanceEst, setMealAllowanceEst] = useState('1500');
  const [agentCommissionEst, setAgentCommissionEst] = useState('3000');
  const [desiredProfit, setDesiredProfit] = useState('12000');
  const [autoAdjustRate, setAutoAdjustRate] = useState(true);
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null);

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

  const [searchParams] = useSearchParams();
  const manageId = searchParams.get('manage_id');
  const [viewRatePlanModal, setViewRatePlanModal] = useState<CharterRatePlan | null>(null);

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

  const totalExpenses = useMemo(() => [dieselCost, tollFeeEst, easytripEst, autosweepEst, mealAllowanceEst, agentCommissionEst]
    .reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0), [dieselCost, tollFeeEst, easytripEst, autosweepEst, mealAllowanceEst, agentCommissionEst]);
  const recommendedBasePrice = totalExpenses + Math.max(0, Number(desiredProfit) || 0);
  const computedBasePrice = useMemo(() => {
    const entered = Math.max(0, Number(customBaseRate) || 0);
    return Math.round((autoAdjustRate ? Math.max(entered, recommendedBasePrice) : entered) * 100) / 100;
  }, [autoAdjustRate, customBaseRate, recommendedBasePrice]);
  const projectedProfit = computedBasePrice - totalExpenses;

  const [editingRatePlanId, setEditingRatePlanId] = useState<number | null>(null);

  const openCreatePlan = () => {
    setEditingRatePlanId(null);
    setPlanForm(planInitial);
    setCustomBaseRate('35000');
    setEstimatedLiters('0'); setDieselCost('0'); setRouteEstimate(null);
    setTollFeeEst('0'); setEasytripEst('0'); setAutosweepEst('0');
    setMealAllowanceEst('1500'); setAgentCommissionEst('3000'); setDesiredProfit('12000'); setAutoAdjustRate(true);
    setPlanOpen(true);
  };

  const openEditRatePlan = (plan: CharterRatePlan) => {
    setEditingRatePlanId(plan.id);
    const ratePerKm = (plan as any).rate_per_km ?? (plan.base_price && plan.included_kilometers ? Math.round(plan.base_price / plan.included_kilometers) : 100);
    setPlanForm({
      service_id: String(plan.service_id),
      name: plan.name,
      vehicle_class: plan.vehicle_class,
      rate_per_km: String(ratePerKm),
      min_km_basis: String(plan.included_kilometers || 50),
      pickup_location: plan.pickup_location || '',
      drop_off_location: plan.destination || '',
      included_hours: String(plan.included_hours || 10),
      extra_hour_rate: String(plan.extra_hour_rate || 500),
      extra_kilometer_rate: String(plan.extra_kilometer_rate || 80),
      overnight_rate: String(plan.overnight_rate || 2500),
      includes_driver: plan.includes_driver ?? true,
      includes_fuel: plan.includes_fuel ?? true,
      includes_tolls: plan.includes_tolls ?? false,
      includes_parking: plan.includes_parking ?? false,
    });
    setCustomBaseRate(String(plan.base_price ?? 0));
    setDieselPricePerL(String(plan.diesel_price_per_liter ?? 60));
    setEstimatedLiters(String(plan.estimated_liters ?? 0));
    setDieselCost(String(plan.diesel_cost ?? 0));
    setTollFeeEst(String(plan.toll_gate_fees ?? 0));
    setEasytripEst(String(plan.easytrip ?? 0));
    setAutosweepEst(String(plan.autosweep ?? 0));
    setMealAllowanceEst(String(plan.driver_meals ?? 0));
    setAgentCommissionEst(String(plan.commission ?? 0));
    setDesiredProfit(String(plan.desired_profit ?? 12000));
    setAutoAdjustRate(plan.auto_adjust_rate ?? true);
    setRouteEstimate(null);
    setPlanOpen(true);
  };


  const savePlan = useMutation({
    mutationFn: () => {
      const payload = {
        service_id: Number(planForm.service_id),
        name: planForm.name,
        vehicle_class: planForm.vehicle_class,
        base_price: computedBasePrice,
        included_hours: Number(planForm.included_hours),
        included_kilometers: Number(planForm.min_km_basis),
        extra_hour_rate: Number(planForm.extra_hour_rate),
        extra_kilometer_rate: Number(planForm.extra_kilometer_rate),
        overnight_rate: Number(planForm.overnight_rate),
        includes_driver: planForm.includes_driver,
        includes_fuel: planForm.includes_fuel,
        includes_tolls: planForm.includes_tolls,
        includes_parking: planForm.includes_parking,
        garage_location: GARAGE_LOCATION,
        pickup_location: planForm.pickup_location,
        destination: planForm.drop_off_location,
        garage_distance_km: routeEstimate?.garage_distance_km ?? 0,
        route_distance_km: routeEstimate?.route_distance_km ?? Number(planForm.min_km_basis),
        total_distance_km: Number(planForm.min_km_basis),
        fuel_efficiency_km_per_liter: 2.5,
        estimated_liters: Number(estimatedLiters),
        diesel_price_per_liter: Number(dieselPricePerL),
        diesel_cost: Number(dieselCost),
        driver_meals: Number(mealAllowanceEst),
        toll_gate_fees: Number(tollFeeEst),
        easytrip: Number(easytripEst),
        autosweep: Number(autosweepEst),
        commission: Number(agentCommissionEst),
        desired_profit: Number(desiredProfit),
        auto_adjust_rate: autoAdjustRate,
        pricing_metadata: routeEstimate ? { routing_provider: routeEstimate.routing_provider, geocoding_provider: routeEstimate.geocoding_provider, toll_source: routeEstimate.toll_source } : null,
      };

      if (editingRatePlanId) {
        return charterApi.updateRatePlan(editingRatePlanId, payload);
      }
      return charterApi.createRatePlan(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['charter-rate-plans'] });
      setPlanOpen(false);
      setEditingRatePlanId(null);
      setPlanForm(planInitial);
      toast.success(editingRatePlanId ? 'Charter rate plan updated' : 'Charter rate plan created');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Rate plan could not be saved'),
  });

  const removeRatePlan = useMutation({
    mutationFn: (ratePlanId: number) => charterApi.deleteRatePlan(ratePlanId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['charter-rate-plans'] });
      await queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      toast.success('Charter rate plan removed');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Rate plan could not be removed'),
  });


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
        price: baseSubtotal,
        is_sales_catalog: true,
      },
      quantity: busesRequired,
      quantityLocked: true,
      customPrice: baseSubtotal,
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
        passenger_count: paxCount,
        pickup_location: booking.pickup_location,
        destination: booking.destination,
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

  if (planOpen) {
    const closePlanBuilder = () => {
      setPlanOpen(false);
      setEditingRatePlanId(null);
      setPlanForm(planInitial);
    };
    const inputClass = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
    const moneyInput = (label: string, value: string, setter: (value: string) => void, tone = '') => (
      <label className="text-xs font-bold text-slate-600">{label}<span className="relative mt-1 block"><span className="absolute left-3 top-2.5 text-sm text-slate-400">₱</span><input type="number" min="0" step="0.01" value={value} onChange={event => setter(event.target.value)} className={`${inputClass} pl-8 ${tone}`} /></span></label>
    );
    return (
      <div className="min-h-screen bg-slate-50 pb-16">
        <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4"><button type="button" onClick={closePlanBuilder} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Bus charter pricing desk</p><h1 className="text-xl font-black text-slate-950">{editingRatePlanId ? 'Edit rate worksheet' : 'Build a rate in one pass'}</h1></div></div>
            <div className="flex gap-2"><Button variant="secondary" onClick={closePlanBuilder}>Cancel</Button><Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending || !planForm.service_id || !planForm.name || computedBasePrice <= 0}>{savePlan.isPending ? 'Saving…' : 'Save rate plan'}</Button></div>
          </div>
        </header>

        <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white"><Bus className="h-4 w-4" /></span><div><h2 className="font-black text-slate-950">Plan identity</h2><p className="text-xs text-slate-500">Name the sellable service and choose its vehicle.</p></div></div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-xs font-bold text-slate-600">Catalog service<select value={planForm.service_id} onChange={event => setPlanForm(current => ({ ...current, service_id: event.target.value }))} className={inputClass}><option value="">Select service…</option>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Rate plan name<input value={planForm.name} onChange={event => setPlanForm(current => ({ ...current, name: event.target.value }))} placeholder="Manila to Baguio — Tourist Bus" className={inputClass} /></label>
                <label className="text-xs font-bold text-slate-600">Vehicle<select value={planForm.vehicle_class} onChange={event => setPlanForm(current => ({ ...current, vehicle_class: event.target.value }))} className={inputClass}><option value="bus">Tourist Bus (49 seats)</option><option value="coaster">Coaster (28–30 seats)</option><option value="van">Van (10–14 seats)</option></select></label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Route className="h-4 w-4" /></span><div><h2 className="font-black text-slate-950">Route</h2><p className="text-xs text-slate-500">Choose exact addresses. Garage travel is added automatically.</p></div></div>{routeEstimate && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{routeEstimate.total_distance_km.toLocaleString()} km total</span>}</div>
              <TripLocationMapPicker pickupLocation={planForm.pickup_location} dropOffLocation={planForm.drop_off_location} garageLocation={GARAGE_LOCATION} includeGarageLeg fuelPricePerLiter={Number(dieselPricePerL) || 0} vehicleType={planForm.vehicle_class === 'van' ? 'Van' : planForm.vehicle_class === 'coaster' ? 'Coaster' : 'Bus'} onLocationSelect={(pickup, dropoff, distanceKm, liters, cost, _pickupCoords, _dropoffCoords, details) => { setPlanForm(current => ({ ...current, pickup_location: pickup, drop_off_location: dropoff, min_km_basis: String(distanceKm) })); setEstimatedLiters(liters.toFixed(2)); setDieselCost(cost.toFixed(2)); setRouteEstimate(details ?? null); if (details?.toll_estimate.mode === 'automatic') { setTollFeeEst(String(details.toll_estimate.toll_gate_fees)); setEasytripEst(String(details.toll_estimate.easytrip)); setAutosweepEst(String(details.toll_estimate.autosweep)); } }} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><Fuel className="h-4 w-4" /></span><div><h2 className="font-black text-slate-950">Editable trip costs</h2><p className="text-xs text-slate-500">Fuel starts from total km ÷ 2.5 km/L. Override any figure when operations knows better.</p></div></div>
              <TollMatrixPicker onApply={result => { setTollFeeEst(String(result.toll_gate_fees)); setEasytripEst(String(result.easytrip)); setAutosweepEst(String(result.autosweep)); }} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-bold text-slate-600">Estimated liters<input type="number" min="0" step="0.01" value={estimatedLiters} onChange={event => { const liters = event.target.value; setEstimatedLiters(liters); setDieselCost(String((Number(liters) || 0) * (Number(dieselPricePerL) || 0))); }} className={inputClass} /></label>
                {moneyInput('Diesel price / liter', dieselPricePerL, value => { setDieselPricePerL(value); setDieselCost(String((Number(estimatedLiters) || 0) * (Number(value) || 0))); }, 'border-amber-200 bg-amber-50')}
                {moneyInput('Diesel cost', dieselCost, setDieselCost, 'border-amber-200 bg-amber-50')}
                {moneyInput('Driver meals', mealAllowanceEst, setMealAllowanceEst)}
                {moneyInput('Toll gate fees', tollFeeEst, setTollFeeEst)}
                {moneyInput('Easytrip', easytripEst, setEasytripEst)}
                {moneyInput('Autosweep', autosweepEst, setAutosweepEst)}
                {moneyInput('Commission estimate', agentCommissionEst, setAgentCommissionEst)}
              </div>
              <div className={`mt-4 flex gap-2 rounded-xl border p-3 text-xs leading-5 ${routeEstimate?.toll_estimate.mode === 'automatic' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{routeEstimate?.toll_estimate.message ?? 'Configure TollGuru to automate bus toll estimates. Values remain editable for operations staff.'} {routeEstimate?.toll_source.url && <a href={routeEstimate.toll_source.url} target="_blank" rel="noreferrer" className="font-black underline">Open official TRB source</a>}</span></div>
            </section>

            <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between p-5"><div><h2 className="font-black text-slate-950">Advanced package rules</h2><p className="text-xs text-slate-500">Overtime, excess distance, overnight, and inclusions.</p></div><ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" /></summary>
              <div className="grid gap-4 border-t border-slate-200 p-5 md:grid-cols-4">
                {([['included_hours', 'Included hours'], ['extra_hour_rate', 'Extra hour rate'], ['extra_kilometer_rate', 'Extra km rate'], ['overnight_rate', 'Overnight rate']] as [keyof typeof planForm, string][]).map(([key, label]) => <label key={key} className="text-xs font-bold text-slate-600">{label}<input type="number" min="0" value={String(planForm[key])} onChange={event => setPlanForm(current => ({ ...current, [key]: event.target.value }))} className={inputClass} /></label>)}
                <div className="grid gap-3 md:col-span-4 sm:grid-cols-4">{([['includes_driver', 'Driver fee'], ['includes_fuel', 'Fuel'], ['includes_tolls', 'Toll fees'], ['includes_parking', 'Parking fees']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={planForm[key]} onChange={event => setPlanForm(current => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
              </div>
            </details>
          </div>

          <aside className="lg:sticky lg:top-5 lg:self-start">
            <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl">
              <div className="border-b border-white/10 p-5"><div className="flex items-center gap-2 text-emerald-400"><LockKeyhole className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Profit lock</span></div><h2 className="mt-2 text-xl font-black">Rate per unit</h2></div>
              <div className="space-y-5 p-5">
                {moneyInput('Staff estimated rate', customBaseRate, setCustomBaseRate, '!border-white/20 !bg-white/10 !text-white')}
                {moneyInput('Desired profit', desiredProfit, setDesiredProfit, '!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-200')}
                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs"><input type="checkbox" checked={autoAdjustRate} onChange={event => setAutoAdjustRate(event.target.checked)} className="mt-0.5" /><span><strong className="block text-white">Protect target profit</strong><span className="text-slate-400">Raise the saved rate only when the estimate falls short.</span></span></label>
                <div className="space-y-2 border-y border-white/10 py-4 text-xs"><div className="flex justify-between text-slate-400"><span>Total expenses</span><strong className="text-white">₱{totalExpenses.toLocaleString()}</strong></div><div className="flex justify-between text-slate-400"><span>Minimum rate for target</span><strong className="text-white">₱{recommendedBasePrice.toLocaleString()}</strong></div><div className="flex justify-between text-slate-400"><span>Projected profit</span><strong className={projectedProfit >= Number(desiredProfit) ? 'text-emerald-400' : 'text-red-400'}>₱{projectedProfit.toLocaleString()}</strong></div></div>
                <div className={projectedProfit >= Number(desiredProfit) ? 'rounded-xl bg-emerald-500/15 p-4' : 'rounded-xl bg-red-500/15 p-4'}><div className="flex items-center gap-2">{projectedProfit >= Number(desiredProfit) ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <Gauge className="h-5 w-5 text-red-400" />}<span className="text-xs font-bold">{projectedProfit >= Number(desiredProfit) ? 'Target protected' : 'Below target'}</span></div><p className="mt-2 text-3xl font-black">₱{computedBasePrice.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">final saved base rate per unit</p></div>
                <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending || !planForm.service_id || !planForm.name || computedBasePrice <= 0} className="w-full !bg-blue-600 !text-white">{savePlan.isPending ? 'Saving…' : editingRatePlanId ? 'Save changes' : 'Save rate plan'}</Button>
              </div>
            </section>
          </aside>
        </main>
      </div>
    );
  }

  if (!selectedPlan) {
    return <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-5 rounded-3xl bg-[#071b33] p-7 text-white lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button onClick={() => navigate('/sales')} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Sales</button>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Charter product catalog</p>
          <h1 className="mt-1 text-3xl font-black">Choose a bus rental package</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Start with the vehicle and rate plan. Trip dates, route, fleet allocation, passenger details, and payment open only after you choose.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setShowQuotationModal(true)} className="!bg-red-600 !text-white hover:!bg-red-700 font-bold">
            <LuFileText className="h-4 w-4 mr-1" /> Create Bus Charter Quotation
          </Button>
          <Button onClick={openCreatePlan} className="!bg-amber-500 !text-white hover:!bg-amber-600 font-bold">
            <Plus className="h-4 w-4 mr-1" /> Create new rate plan
          </Button>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-surface">
        <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Bus & van charters</p><h2 className="mt-1 text-xl font-black text-ink">Rate plan library</h2><p className="mt-1 text-xs text-muted">{filteredPlans.length} option{filteredPlans.length === 1 ? '' : 's'} ready to configure</p></div>
          <label className="relative block w-full md:w-80"><LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search rate plan or vehicle" className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm text-ink" /></label>
        </div>
        <div className="flex gap-2 overflow-x-auto px-6 pt-5">
          {['All', 'Tourist Bus', 'Coaster', 'Van'].map((vehicleClass) => <button key={vehicleClass} type="button" onClick={() => setSelectedClass(vehicleClass)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black ${selectedClass === vehicleClass ? 'bg-blue-600 text-white' : 'border border-border bg-surface-alt text-muted'}`}>{vehicleClass}</button>)}
        </div>
        {filteredPlans.length === 0 ? <div className="p-12 text-center"><Bus className="mx-auto h-10 w-10 text-muted" /><h3 className="mt-3 font-black text-ink">No matching rate plans</h3><p className="mt-1 text-sm text-muted">Adjust the filters or create a new rate plan.</p></div> : <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.map(plan => <PackageCatalogCard
            key={plan.id}
            image={plan.service?.images?.[0]}
            badge="Charter"
            eyebrow={plan.vehicle_class || 'Fleet rental'}
            title={plan.name}
            description={plan.service?.description || `Includes ${plan.included_hours} hours and ${plan.included_kilometers} kilometers.`}
            facts={[
              { label: 'Base rate', value: `₱${Number(plan.base_price).toLocaleString()}`, icon: <Bus className="h-4 w-4" /> },
              { label: 'Included', value: `${plan.included_hours}h`, icon: <CalendarClock className="h-4 w-4" /> },
              { label: 'Distance', value: `${plan.included_kilometers} km`, icon: <LuMapPin className="h-4 w-4" /> },
            ]}
            actionLabel="Select package & continue"
            onAction={() => setBooking(current => ({ ...current, rate_plan_id: String(plan.id) }))}
            controls={<button type="button" onClick={() => openEditRatePlan(plan)} title="Edit rate plan" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><Pencil className="h-4 w-4" /></button>}
          />)}
        </div>}
      </section>
      <CharterBookingManager bookings={bookings} targetId={manageId} />
    </div>;
  }

  return <div className="space-y-6">
    <BookingWorkspaceHeader
      eyebrow="Charter booking workspace"
      badge={selectedPlan.vehicle_class || 'Charter'}
      image={selectedPlan.service?.images?.[0]}
      title={selectedPlan.name}
      description={selectedPlan.service?.description || 'Complete the route, schedule, passenger manifest, fleet allocation, and checkout for this charter.'}
      onBack={() => {
        setBooking(current => ({ ...current, rate_plan_id: '', bus_id: '', driver_id: '' }));
        setBusAssignments([{ bus_id: '', driver_id: '' }]);
        setSelectedSeats([]);
      }}
      facts={[
        { label: 'Base rate', value: `₱${Number(selectedPlan.base_price).toLocaleString()}` },
        { label: 'Included operating time', value: `${selectedPlan.included_hours} hours` },
        { label: 'Included distance', value: `${selectedPlan.included_kilometers} km` },
      ]}
      actions={<><Button onClick={() => setManifestModalOpen(true)} className="!bg-blue-600 !text-white"><Users className="h-4 w-4" /> Manifest ({manifestPassengers.length})</Button><Button onClick={() => setBusAllocationModalOpen(true)} className="!bg-amber-500 !text-white"><Bus className="h-4 w-4" /> Fleet & seats</Button></>}
    />

    <CharterBookingManager bookings={bookings} targetId={manageId} />

    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-6">
        {/* 1. Distinct Elevated Rate Plans Catalog Selection Container Card */}
        <section className="hidden rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/50 via-slate-50 to-white dark:from-slate-900/80 dark:via-gray-900/60 dark:to-gray-900 p-6 shadow-md space-y-5">
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

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlans.map(plan => (
              <PackageCatalogCard
                key={plan.id}
                image={plan.service?.images?.[0]}
                images={plan.service?.images}
                badge="Charter"
                eyebrow={plan.vehicle_class || 'Fleet rental'}
                title={plan.name}
                description={plan.service?.description || `Includes ${plan.included_hours} hours and ${plan.included_kilometers} kilometers.`}
                selected={String(plan.id) === booking.rate_plan_id}
                facts={[
                  { label: 'Base rate', value: `₱${Number(plan.base_price).toLocaleString()}`, icon: <Bus className="h-4 w-4" /> },
                  { label: 'Included', value: `${plan.included_hours}h`, icon: <CalendarClock className="h-4 w-4" /> },
                  { label: 'Distance', value: `${plan.included_kilometers} km`, icon: <LuMapPin className="h-4 w-4" /> },
                ]}
                actionLabel={String(plan.id) === booking.rate_plan_id ? 'Selected — continue below' : 'Configure this charter'}
                onAction={() => {
                  setBooking(current => ({ ...current, rate_plan_id: String(plan.id) }));
                  setExpandedPlanId(plan.id);
                }}
                controls={
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEditRatePlan(plan)} title="Edit rate plan" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => { if (window.confirm(`Deactivate charter rate plan "${plan.name}"? Existing bookings and the catalog service will be preserved.`)) removeRatePlan.mutate(plan.id); }} title="Deactivate rate plan" className="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/30 hover:text-rose-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                }
              />
            ))}
          </div>

          {/* Height-Bounded Scrollable Rate Plans List */}
          <div className="hidden max-h-[380px] overflow-y-auto custom-scrollbar space-y-3 pr-1.5">
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
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                          {plan.service?.images?.[0]
                            ? <img src={getStorageUrl(plan.service.images[0])} alt={plan.name} className="h-full w-full object-cover" />
                            : <div className="grid h-full place-items-center"><Bus className="h-6 w-6 text-slate-300" /></div>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9.5px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                              {plan.vehicle_class || 'Tourist Bus'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">
                              Includes {plan.included_hours}h / {plan.included_kilometers}km
                            </span>
                          </div>
                          <h3 className="mt-0.5 truncate text-base font-black text-ink">{plan.name}</h3>
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

          {/* Interactive Leaflet Location Map Picker for Booking Route */}
          <div className="pt-2">
            <TripLocationMapPicker
              pickupLocation={booking.pickup_location || 'Manila Office'}
              dropOffLocation={booking.destination || 'Tagaytay City'}
              vehicleType={selectedPlan?.vehicle_class === 'van' ? 'Van' : selectedPlan?.vehicle_class === 'coaster' ? 'Coaster' : 'Bus'}
              onLocationSelect={(pickup, dropoff, distanceKm) => {
                setBooking(b => ({
                  ...b,
                  pickup_location: pickup,
                  destination: dropoff,
                  estimated_kilometers: String(distanceKm),
                }));
              }}
            />
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
          removeFromCart={() => setBooking(current => ({ ...current, rate_plan_id: '' }))}
          updateQuantity={() => {}}
          clearCart={() => {}}
          onEditCartItem={() => setBusAllocationModalOpen(true)}
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

    <Modal isOpen={planOpen} onClose={() => { setPlanOpen(false); setEditingRatePlanId(null); }} title={editingRatePlanId ? "Edit Charter Rate Plan" : "Create Charter Rate Plan"} size="lg" footer={null}>
      <form onSubmit={e => { e.preventDefault(); savePlan.mutate(); }} className="space-y-5 py-2">


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

        {/* Pickup & Destination Route Inputs with Leaflet Map */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-brand uppercase tracking-widest flex items-center gap-1.5">
              <LuMapPin className="w-4 h-4 text-orange-500" /> Route Pickup & Drop-Off Locations
            </p>
            <span className="text-[10px] text-gray-400 font-bold">Auto-calculates Minimum Billable KM</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs font-bold text-muted">
              Pickup Location
              <input type="text" required value={planForm.pickup_location} onChange={e => setPlanForm({ ...planForm, pickup_location: e.target.value })} placeholder="e.g. Manila Hub / Pasay Terminal" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold" />
            </label>
            <label className="text-xs font-bold text-muted">
              Drop-Off Location / Destination
              <input type="text" required value={planForm.drop_off_location} onChange={e => setPlanForm({ ...planForm, drop_off_location: e.target.value })} placeholder="e.g. Tagaytay City / Burnham Park Baguio" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold" />
            </label>
          </div>

          {/* Embedded Leaflet Interactive Map Picker inside Rate Plan Creation */}
          <TripLocationMapPicker
            pickupLocation={planForm.pickup_location || 'Manila Hub'}
            dropOffLocation={planForm.drop_off_location || 'Tagaytay City'}
            vehicleType={planForm.vehicle_class === 'van' ? 'Van' : planForm.vehicle_class === 'coaster' ? 'Coaster' : 'Bus'}
            onLocationSelect={(pickup, dropoff, distanceKm) => {
              setPlanForm(pf => ({
                ...pf,
                pickup_location: pickup,
                drop_off_location: dropoff,
                min_km_basis: String(distanceKm),
              }));
            }}
          />
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
              Minimum Billable KM (Auto-Calculated from Map, Editable)
              <input required type="number" min="0" value={planForm.min_km_basis} onChange={e => setPlanForm({ ...planForm, min_km_basis: e.target.value })} placeholder="e.g. 100" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-bold border-amber-300 dark:border-amber-700 focus:ring-amber-500" />
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
          <Button type="button" variant="ghost" onClick={() => { setPlanOpen(false); setEditingRatePlanId(null); }}>Cancel</Button>
          <Button type="submit" disabled={savePlan.isPending || computedBasePrice === 0}>
            {savePlan.isPending ? (editingRatePlanId ? 'Saving…' : 'Creating…') : (editingRatePlanId ? `Save Changes — ₱${computedBasePrice.toLocaleString()} base` : `Create Rate Plan — ₱${computedBasePrice.toLocaleString()} base`)}
          </Button>
        </div>

      </form>
    </Modal>

    {/* Bus Charter Quotation Modal */}
    <BusCharterQuotationModal isOpen={showQuotationModal} onClose={() => setShowQuotationModal(false)} />
  </div>;
}

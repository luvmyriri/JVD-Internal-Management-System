import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuArrowLeft,
  LuBus,
  LuCalendarDays,
  LuCircleAlert,
  LuCircleCheck,
  LuMapPinned,
  LuPlus,
  LuReceiptText,
  LuTrash2,
  LuUserRound,
  LuUsersRound,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { ItineraryDayInput, PassengerInput } from '../../../api/contracts';
import { charterApi, type CharterResources } from '../../../api/charters';
import { formatMoneyInput, parseMoneyInput } from '../../../utils';
import type { PrivateTourWorkflowProps, PreparedServiceLine } from './workflowTypes';
import { splitLines, toIsoDateTime } from './workflowTypes';
import { BusSeatAllocationModal } from '../../../components/ui';
import type { AllocatedBus } from '../../../components/ui/BusSeatAllocationModal';

type TravelerType = 'adult' | 'child';

interface TravelerRow extends PassengerInput {
  rowId: string;
  travelerType: TravelerType;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-muted';
const labelClass = 'block text-xs font-bold text-ink';

const localDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (value: string, days: number): string => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
};

const makeTraveler = (travelerType: TravelerType = 'adult'): TravelerRow => ({
  rowId: globalThis.crypto?.randomUUID?.() || `traveler-${Date.now()}-${Math.random()}`,
  travelerType,
  first_name: '',
  last_name: '',
});

const moneyValue = (value: string): number => Number(parseMoneyInput(value)) || 0;

const buildItinerary = (
  descriptions: string[] | undefined,
  destination: string | undefined,
  durationDays: number | undefined,
): ItineraryDayInput[] => {
  const rowCount = durationDays ?? Math.max(1, descriptions?.length ?? 0);
  return Array.from({ length: rowCount }, (_, index) => ({
    day_number: index + 1,
    location: destination ?? '',
    activity_description: descriptions?.[index] ?? '',
  }));
};

export function PrivateTourWorkflow({ catalogService, onAdd, onBack, hideHeader = false }: PrivateTourWorkflowProps & { hideHeader?: boolean }) {
  const loadedCatalogId = useRef<number | null>(null);
  const config = catalogService?.package_config;

  const [packageName, setPackageName] = useState(catalogService?.name ?? '');
  const [destination, setDestination] = useState(config?.destination ?? '');
  const [pickupLocation, setPickupLocation] = useState(config?.origin ?? '');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [adultRate, setAdultRate] = useState(formatMoneyInput(String(catalogService?.adult_price ?? catalogService?.price ?? 0)));
  const [childRate, setChildRate] = useState(formatMoneyInput(String(catalogService?.child_price ?? catalogService?.adult_price ?? catalogService?.price ?? 0)));
  const [inclusions, setInclusions] = useState(catalogService?.inclusions ?? '');
  const [exclusions, setExclusions] = useState(catalogService?.exclusions ?? '');
  const [specialRequests, setSpecialRequests] = useState('');
  const [requiresContract, setRequiresContract] = useState(false);
  const [busId, setBusId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [busAllocationModalOpen, setBusAllocationModalOpen] = useState(false);
  const [busAllocations, setBusAllocations] = useState<AllocatedBus[]>([]);
  const [travelers, setTravelers] = useState<TravelerRow[]>(() => {
    const initialCount = Math.max(1, config?.minimum_pax ?? 1);
    return Array.from({ length: initialCount }, () => makeTraveler());
  });
  const [itinerary, setItinerary] = useState<ItineraryDayInput[]>(() => buildItinerary(
    config?.default_itinerary,
    config?.destination,
    config?.duration_days,
  ));

  const requiredBuses = useMemo(() => Math.max(1, Math.ceil((travelers.length || 1) / 49)), [travelers.length]);

  useEffect(() => {
    if (!catalogService || loadedCatalogId.current === catalogService.id) return;
    loadedCatalogId.current = catalogService.id;
    const packageConfig = catalogService.package_config;
    const initialCount = Math.max(1, packageConfig?.minimum_pax ?? 1);

    setPackageName(catalogService.name);
    setDestination(packageConfig?.destination ?? '');
    setPickupLocation(packageConfig?.origin ?? '');
    setAdultRate(formatMoneyInput(String(catalogService.adult_price ?? catalogService.price ?? 0)));
    setChildRate(formatMoneyInput(String(catalogService.child_price ?? catalogService.adult_price ?? catalogService.price ?? 0)));
    setInclusions(catalogService.inclusions ?? '');
    setExclusions(catalogService.exclusions ?? '');
    setTravelers(Array.from({ length: initialCount }, () => makeTraveler()));
    setItinerary(buildItinerary(
      packageConfig?.default_itinerary,
      packageConfig?.destination,
      packageConfig?.duration_days,
    ));
  }, [catalogService]);

  const durationDays = config?.duration_days;
  useEffect(() => {
    if (!startsAt || !durationDays) return;
    setEndsAt(addDays(startsAt, Math.max(0, durationDays - 1)));
  }, [durationDays, startsAt]);

  useEffect(() => {
    if (!startsAt) return;
    setItinerary((current) => current.map((day, index) => ({
      ...day,
      day_number: index + 1,
      date: addDays(startsAt, index),
    })));
  }, [startsAt]);

  useEffect(() => {
    setBusId('');
    setDriverId('');
    setBusAllocations([]);
  }, [startsAt, endsAt]);

  const adults = travelers.filter((traveler) => traveler.travelerType === 'adult').length;
  const children = travelers.length - adults;
  const quotedTotal = (adults * moneyValue(adultRate)) + (children * moneyValue(childRate));
  const minimumPax = config?.minimum_pax ?? 1;
  const maximumPax = config?.maximum_pax ?? 500;

  const earliestStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(today.getDate() + (config?.booking_lead_days ?? 0));
    const leadDate = localDate(today);
    return config?.valid_from && config.valid_from > leadDate ? config.valid_from : leadDate;
  }, [config?.booking_lead_days, config?.valid_from]);

  const availabilityWindowValid = Boolean(startsAt && endsAt && new Date(endsAt) >= new Date(startsAt));
  const {
    data: resources,
    isFetching: checkingAvailability,
    isError: availabilityFailed,
    refetch: retryAvailability,
  } = useQuery<CharterResources>({
    queryKey: ['private-tour-resources', startsAt, endsAt],
    queryFn: () => charterApi.resources(
      toIsoDateTime(`${startsAt}T00:00`)!,
      toIsoDateTime(`${endsAt}T23:59`)!,
    ),
    enabled: availabilityWindowValid,
  });

  // Auto-sync multi-bus allocations when resources load
  useEffect(() => {
    if (resources?.buses && resources.buses.length > 0 && busAllocations.length < requiredBuses) {
      const newAllocs: AllocatedBus[] = [];
      for (let i = 0; i < requiredBuses; i++) {
        const bus = resources.buses[i % resources.buses.length];
        const driver = resources.drivers[i % (resources.drivers.length || 1)];
        if (bus) {
          newAllocs.push({
            bus_id: bus.id,
            bus_name: `${bus.model || 'Tourist Bus'} (${bus.seating_capacity || 49} Seater)`,
            plate_number: bus.plate_number,
            capacity: bus.seating_capacity || 49,
            driver_id: driver ? driver.id : undefined,
            driver_name: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
            seat_assignments: {},
          });
        }
      }
      setBusAllocations(newAllocs);
      if (newAllocs[0]) {
        setBusId(String(newAllocs[0].bus_id));
        setDriverId(newAllocs[0].driver_id ? String(newAllocs[0].driver_id) : '');
      }
    }
  }, [resources, requiredBuses, busAllocations.length]);

  const selectedBus = resources?.buses.find((bus) => bus.id === Number(busId));
  const selectedDriver = resources?.drivers.find((driver) => driver.id === Number(driverId));
  const suitableBuses = resources?.buses.filter((bus) => bus.available && travelers.length <= bus.seating_capacity) ?? [];
  const availableDrivers = resources?.drivers.filter((driver) => driver.available) ?? [];

  const updateTraveler = (rowId: string, patch: Partial<TravelerRow>) => {
    setTravelers((current) => current.map((traveler) => traveler.rowId === rowId ? { ...traveler, ...patch } : traveler));
  };

  const removeTraveler = (rowId: string) => {
    setTravelers((current) => current.filter((traveler) => traveler.rowId !== rowId));
  };

  const addItineraryDay = () => {
    setItinerary((current) => [...current, {
      day_number: current.length + 1,
      date: startsAt ? addDays(startsAt, current.length) : undefined,
      location: destination,
      activity_description: '',
    }]);
  };

  const updateItineraryDay = (index: number, patch: Partial<ItineraryDayInput>) => {
    setItinerary((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day));
  };

  const removeItineraryDay = (index: number) => {
    setItinerary((current) => current
      .filter((_, dayIndex) => dayIndex !== index)
      .map((day, dayIndex) => ({ ...day, day_number: dayIndex + 1 })));
  };

  const validate = (): string | null => {
    if (!packageName.trim()) return 'Enter the private-tour package name.';
    if (!destination.trim()) return 'Enter the private-tour destination.';
    if (!startsAt || !endsAt) return 'Set the tour start and end dates.';
    if (new Date(endsAt) < new Date(startsAt)) return 'The tour end date cannot be before its start date.';
    if (startsAt < earliestStart) return `The earliest allowed departure is ${earliestStart}.`;
    if (config?.valid_until && startsAt > config.valid_until) return `This package is valid only until ${config.valid_until}.`;
    if (durationDays) {
      const actualDuration = Math.round((new Date(`${endsAt}T00:00:00`).getTime() - new Date(`${startsAt}T00:00:00`).getTime()) / 86_400_000) + 1;
      if (actualDuration !== durationDays) return `This package has a fixed duration of ${durationDays} days.`;
      if (itinerary.length !== durationDays) return `Add one itinerary entry for each of the package's ${durationDays} days.`;
    }
    if (travelers.length < minimumPax) return `This package requires at least ${minimumPax} named travelers.`;
    if (travelers.length > maximumPax) return `This package allows at most ${maximumPax} travelers.`;
    if (travelers.some((traveler) => !traveler.first_name.trim() || !traveler.last_name.trim())) return 'Enter the first and last name of every traveler.';
    if (travelers.some((traveler) => traveler.travelerType === 'child' && !traveler.date_of_birth)) return 'Enter the date of birth for every child traveler.';
    if (itinerary.length < 1 || itinerary.some((day) => !day.activity_description?.trim())) return 'Describe at least one activity for every itinerary day.';
    if (moneyValue(adultRate) < 0 || moneyValue(childRate) < 0 || quotedTotal <= 0) return 'Enter valid adult and child rates that produce a positive quote.';
    if (availabilityFailed && (busId || driverId)) return 'Recheck logistics availability before keeping a vehicle or driver assignment.';
    if (busId && (!selectedBus || !selectedBus.available)) return 'The selected vehicle is not available for these dates.';
    if (selectedBus && travelers.length > selectedBus.seating_capacity) return 'The selected vehicle cannot seat the full traveler roster.';
    if (driverId && (!selectedDriver || !selectedDriver.available)) return 'The selected driver is not available for these dates.';
    return null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const startsAtIso = toIsoDateTime(`${startsAt}T00:00`)!;
    const endsAtIso = toIsoDateTime(`${endsAt}T23:59`)!;
    const typedItinerary = itinerary.map((day, index) => ({
      day: index + 1,
      title: day.location?.trim() || `Day ${index + 1}`,
      description: day.activity_description?.trim() || undefined,
    }));
    const passengers: PassengerInput[] = travelers.map(({ rowId: _rowId, travelerType: _travelerType, ...passenger }) => passenger);
    const metadata: Record<string, unknown> = {
      package_name: packageName.trim(),
      destination: destination.trim(),
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      passenger_count: travelers.length,
      pickup_location: pickupLocation.trim() || undefined,
      bus_id: busId ? Number(busId) : undefined,
      driver_id: driverId ? Number(driverId) : undefined,
      itinerary: typedItinerary,
      inclusions: splitLines(inclusions),
      exclusions: splitLines(exclusions),
      special_requests: specialRequests.trim() || undefined,
      originating_catalog_service_id: catalogService?.id,
      adult_count: adults,
      child_count: children,
      adult_rate: moneyValue(adultRate),
      child_rate: moneyValue(childRate),
      traveler_types: travelers.map((traveler) => ({
        name: `${traveler.first_name.trim()} ${traveler.last_name.trim()}`,
        type: traveler.travelerType,
      })),
    };

    const line: PreparedServiceLine = {
      title: packageName.trim(),
      description: catalogService?.description || `Private tour to ${destination.trim()}`,
      price: quotedTotal,
      serviceType: 'private_tour',
      catalogServiceId: catalogService?.id,
      metadata,
      customDetail: {
        category: 'Private Tour',
        destination: destination.trim(),
        booking_details: specialRequests.trim() || catalogService?.description || undefined,
        category_meta: metadata,
        additional_remarks: specialRequests.trim() || undefined,
      },
      itinerary,
      passengers,
      requiresContract,
      serviceDate: startsAtIso,
      destination: destination.trim(),
      paxCount: travelers.length,
      adultCount: adults,
      childCount: children,
      adultUnitPrice: moneyValue(adultRate),
      childUnitPrice: moneyValue(childRate),
      busId: busId ? Number(busId) : undefined,
      driverId: driverId ? Number(driverId) : undefined,
    };

    onAdd(line);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!hideHeader && (
        <header className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900 p-5 text-white shadow-sm sm:p-6">
          <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-blue-200 transition hover:text-white">
            <LuArrowLeft className="h-4 w-4" /> All service workflows
          </button>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">Private tour booking file</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Build the itinerary around one named party.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Dates, traveler pricing, itinerary, and optional fleet allocation stay attached to this transaction.</p>
            </div>
            {catalogService && (
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs">
                <span className="block text-[9px] font-black uppercase tracking-widest text-blue-200">Catalog source</span>
                <strong className="mt-1 block">#{catalogService.id} · {catalogService.name}</strong>
              </div>
            )}
          </div>
        </header>
      )}

      <div className="grid gap-5 min-[1800px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40"><LuMapPinned className="h-5 w-5" /></span>
              <div><h3 className="font-black text-ink">Tour identity and dates</h3><p className="text-xs text-muted">The catalog rules below are enforced for this booking.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Package name<input className={inputClass} value={packageName} onChange={(event) => setPackageName(event.target.value)} readOnly={Boolean(catalogService)} /></label>
              <label className={labelClass}>Destination<input className={inputClass} value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Baguio City and Atok" /></label>
              <label className={labelClass}>Pickup or assembly point<input className={inputClass} value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} placeholder="Confirmed pickup location" /></label>
              <div className="hidden sm:block" />
              <label className={labelClass}>Departure date<input type="date" min={earliestStart} max={config?.valid_until} className={inputClass} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
              <label className={labelClass}>Return date<input type="date" min={startsAt || earliestStart} className={inputClass} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} readOnly={Boolean(durationDays)} /></label>
            </div>
            <div className="mt-4 grid gap-2 rounded-2xl bg-surface-alt p-4 text-xs text-muted sm:grid-cols-3">
              <span><strong className="block text-ink">{durationDays ? `${durationDays} day${durationDays === 1 ? '' : 's'}` : 'Flexible'}</strong>Package duration</span>
              <span><strong className="block text-ink">{minimumPax}–{maximumPax}</strong>Allowed party size</span>
              <span><strong className="block text-ink">{config?.booking_lead_days ?? 0} day(s)</strong>Advance booking</span>
            </div>
            {config?.valid_until && earliestStart > config.valid_until && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600"><LuCircleAlert /> This catalog package has no bookable dates left.</p>}
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><LuUsersRound className="h-5 w-5" /></span><div><h3 className="font-black text-ink">Named traveler roster</h3><p className="text-xs text-muted">Every billed traveler must have a name and rate class.</p></div></div>
              <button type="button" disabled={travelers.length >= maximumPax} onClick={() => setTravelers((current) => [...current, makeTraveler()])} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-blue-600 transition hover:border-blue-300 disabled:opacity-40"><LuPlus /> Traveler</button>
            </div>
            <div className="space-y-3">
              {travelers.map((traveler, index) => (
                <div key={traveler.rowId} className="grid gap-3 rounded-2xl border border-border bg-surface-alt p-4 md:grid-cols-[92px_1fr_1fr_150px_36px]">
                  <label className={labelClass}>Rate class<select className={inputClass} value={traveler.travelerType} onChange={(event) => updateTraveler(traveler.rowId, { travelerType: event.target.value as TravelerType })}><option value="adult">Adult</option><option value="child">Child</option></select></label>
                  <label className={labelClass}>First name<input className={inputClass} value={traveler.first_name} onChange={(event) => updateTraveler(traveler.rowId, { first_name: event.target.value })} placeholder={`Traveler ${index + 1}`} /></label>
                  <label className={labelClass}>Last name<input className={inputClass} value={traveler.last_name} onChange={(event) => updateTraveler(traveler.rowId, { last_name: event.target.value })} /></label>
                  <label className={labelClass}>Date of birth {traveler.travelerType === 'child' && <span className="text-red-500">*</span>}<input type="date" className={inputClass} value={traveler.date_of_birth ?? ''} onChange={(event) => updateTraveler(traveler.rowId, { date_of_birth: event.target.value })} /></label>
                  <button type="button" aria-label={`Remove traveler ${index + 1}`} disabled={travelers.length === 1} onClick={() => removeTraveler(traveler.rowId)} className="mt-6 grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><LuTrash2 /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40"><LuCalendarDays className="h-5 w-5" /></span><div><h3 className="font-black text-ink">Day-by-day operating itinerary</h3><p className="text-xs text-muted">These entries become the fulfillment schedule and printed itinerary.</p></div></div>
              {!durationDays && <button type="button" onClick={addItineraryDay} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-blue-600"><LuPlus /> Day</button>}
            </div>
            <div className="space-y-3">
              {itinerary.map((day, index) => (
                <div key={`${day.day_number}-${index}`} className="grid gap-3 rounded-2xl border border-border bg-surface-alt p-4 md:grid-cols-[90px_180px_1fr_36px]">
                  <div><span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Day {index + 1}</span><strong className="mt-2 block text-xs text-ink">{day.date || 'Date pending'}</strong></div>
                  <label className={labelClass}>Primary location<input className={inputClass} value={day.location ?? ''} onChange={(event) => updateItineraryDay(index, { location: event.target.value })} placeholder={destination || 'Location'} /></label>
                  <label className={labelClass}>Planned activity<textarea rows={2} className={inputClass} value={day.activity_description ?? ''} onChange={(event) => updateItineraryDay(index, { activity_description: event.target.value })} placeholder="Describe transport, visits, meals, or check-in" /></label>
                  {!durationDays && <button type="button" aria-label={`Remove itinerary day ${index + 1}`} disabled={itinerary.length === 1} onClick={() => removeItineraryDay(index)} className="mt-6 grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><LuTrash2 /></button>}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Included in the quote<textarea rows={4} className={inputClass} value={inclusions} onChange={(event) => setInclusions(event.target.value)} placeholder="One inclusion per line" /></label>
              <label className={labelClass}>Not included<textarea rows={4} className={inputClass} value={exclusions} onChange={(event) => setExclusions(event.target.value)} placeholder="One exclusion per line" /></label>
            </div>
            <label className={`${labelClass} mt-4`}>Requests specific to this party<textarea rows={3} className={inputClass} value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} placeholder="Dietary, mobility, rooming, or timing notes" /></label>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40">
                  <LuBus className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-black text-ink">Fleet & Driver Logistics Assignment</h3>
                  <p className="text-xs text-muted">Auto-calculates required 49-seater buses and assigns specific drivers to every vehicle.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBusAllocationModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider shadow shrink-0 flex items-center gap-1.5"
              >
                <LuBus className="h-4 w-4" /> Multi-Bus & Drivers ({busAllocations.length} Bus{busAllocations.length !== 1 ? 'es' : ''})
              </button>
            </div>

            {/* 49-Seater Fleet Calculation Banner */}
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest">
                      49-Seater Fleet Calculation
                    </span>
                    <span className="text-xs font-black text-blue-900 dark:text-blue-200">
                      {travelers.length} Traveler(s) → {requiredBuses} x 49-Seater Bus(es) Required ({requiredBuses * 49} Seats Capacity)
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">
                    Assign fleet buses and dedicated drivers for each chartered 49-seater vehicle needed for this private tour.
                  </p>
                </div>
              </div>

              {/* Allocated Buses & Drivers Status Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                <span className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                  Assigned Fleet:
                </span>
                {busAllocations.length === 0 ? (
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold italic">
                    ⚠️ No buses allocated yet (Click Multi-Bus & Drivers to assign)
                  </span>
                ) : (
                  busAllocations.map((alloc, aIdx) => (
                    <span
                      key={aIdx}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5 ${
                        alloc.driver_name
                          ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 shadow-sm'
                          : 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <span>🚌 Bus #{aIdx + 1}: {alloc.plate_number}</span>
                      <span className="opacity-40">|</span>
                      <span>👨‍✈️ {alloc.driver_name || 'Driver Unassigned'}</span>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Primary Bus<select className={inputClass} value={busId} onChange={(event) => setBusId(event.target.value)} disabled={!availabilityWindowValid || checkingAvailability || availabilityFailed || !resources}><option value="">{!availabilityWindowValid ? 'Set valid dates first' : checkingAvailability ? 'Checking availability…' : 'Assign via Multi-Bus tool'}</option>{resources?.buses.map((bus) => <option key={bus.id} value={bus.id} disabled={!bus.available}>{bus.plate_number} · {bus.model} · {bus.seating_capacity} seats{!bus.available ? ' · unavailable' : ''}</option>)}</select></label>
              <label className={labelClass}>Primary Driver<select className={inputClass} value={driverId} onChange={(event) => setDriverId(event.target.value)} disabled={!availabilityWindowValid || checkingAvailability || availabilityFailed || !resources}><option value="">{!availabilityWindowValid ? 'Set valid dates first' : checkingAvailability ? 'Checking availability…' : 'Assign via Multi-Bus tool'}</option>{resources?.drivers.map((driver) => <option key={driver.id} value={driver.id} disabled={!driver.available}>{driver.first_name} {driver.last_name}{!driver.available ? ' · unavailable' : ''}</option>)}</select></label>
            </div>
            <p className={`mt-3 flex items-center gap-2 text-xs font-bold ${availabilityFailed ? 'text-red-600' : 'text-muted'}`}>{checkingAvailability ? <><span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" /> Checking the allocation calendar…</> : availabilityFailed ? <><LuCircleAlert /> Availability could not be verified. <button type="button" onClick={() => retryAvailability()} className="underline">Retry</button></> : resources ? <><LuCircleCheck className="text-emerald-600" /> {resources.buses.filter(b => b.available).length} vehicle(s) and {resources.drivers.filter(d => d.available).length} driver(s) available for this tour window.</> : <><LuCalendarDays /> Set valid tour dates to check logistics.</>}</p>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-border bg-surface p-5 min-[1800px]:sticky min-[1800px]:top-5">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40"><LuReceiptText /></span><div><p className="text-[10px] font-black uppercase tracking-widest text-muted">Party quote</p><h3 className="font-black text-ink">Adult / child pricing</h3></div></div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Adult rate<input inputMode="decimal" className={inputClass} value={adultRate} onChange={(event) => setAdultRate(formatMoneyInput(event.target.value))} /></label>
            <label className={labelClass}>Child rate<input inputMode="decimal" className={inputClass} value={childRate} onChange={(event) => setChildRate(formatMoneyInput(event.target.value))} /></label>
          </div>
          <div className="space-y-3 border-y border-border py-4 text-sm">
            <div className="flex justify-between text-muted"><span>{adults} adult{adults === 1 ? '' : 's'}</span><strong className="text-ink">₱{(adults * moneyValue(adultRate)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
            <div className="flex justify-between text-muted"><span>{children} child{children === 1 ? '' : 'ren'}</span><strong className="text-ink">₱{(children * moneyValue(childRate)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
            <div className="flex justify-between text-lg font-black text-ink"><span>Quoted total</span><span>₱{quotedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
          </div>
          <label className="flex cursor-pointer gap-3 rounded-2xl border border-border bg-surface-alt p-4">
            <input type="checkbox" checked={requiresContract} onChange={(event) => setRequiresContract(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500" />
            <span><strong className="block text-xs text-ink">Require signed contract</strong><span className="mt-1 block text-[11px] leading-4 text-muted">Checkout will create the contract before invoice finalization.</span></span>
          </label>
          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20">
            <LuPlus /> Add private tour to order
          </button>
          <p className="flex gap-2 text-[11px] leading-4 text-muted"><LuUserRound className="mt-0.5 h-4 w-4 shrink-0" /> The checkout customer remains the invoice recipient; this roster identifies every person traveling.</p>
        </aside>
      </div>

      {/* Multi-Bus Allocation & Driver Selector Modal */}
      <BusSeatAllocationModal
        isOpen={busAllocationModalOpen}
        onClose={() => setBusAllocationModalOpen(false)}
        requiredCapacity={travelers.length}
        passengers={travelers.map((t) => ({ first_name: t.first_name, last_name: t.last_name, role: t.travelerType, date_of_birth: t.date_of_birth }))}
        initialAllocations={busAllocations}
        availableDrivers={resources?.drivers || []}
        onSaveAllocations={(allocs) => {
          setBusAllocations(allocs);
          if (allocs[0]) {
            setBusId(String(allocs[0].bus_id));
            setDriverId(allocs[0].driver_id ? String(allocs[0].driver_id) : '');
          }
        }}
      />
    </form>
  );
}

export default PrivateTourWorkflow;

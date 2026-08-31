import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bus,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  GraduationCap,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  educationalTourApi,
  type EducationalTourPackage,
  type CreateEducationalPackagePayload,
  type EducationalResources,
} from '../../../api/educationalTours';
import { Button } from '../../../components/ds';
import InclusionsExclusionsEditor from '../../../components/travel/InclusionsExclusionsEditor';
import ItineraryBuilder from './ItineraryBuilder';
import type { ItineraryDayInput } from '../../../api/contracts';

type FleetBus = EducationalResources['buses'][number];
type FleetDriver = EducationalResources['drivers'][number];

interface EditableBusAssignment {
  assignment_id?: number;
  bus_id: number;
  driver_id?: number;
  driver_name?: string;
  plate_number?: string;
  model?: string;
  seating_capacity: number;
  sequence_number: number;
  occupied?: number;
}

// ─── helpers ───────────────────────────────────────────────────────────────

const imgUrl = (path: string) =>
  path.startsWith('data:') || path.startsWith('http')
    ? path
    : `/storage/${path.replace(/^\/?storage\//, '')}`;

// ─── Collapsible Section ───────────────────────────────────────────────────

function Section({
  icon,
  badge,
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  badge: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-alt transition text-left"
      >
        <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-brand">{badge}</p>
          <p className="text-sm font-black text-ink">{title}</p>
          {subtitle && <p className="text-[11px] text-muted">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">{children}</div>}
    </div>
  );
}

// ─── Field helpers ─────────────────────────────────────────────────────────

const inputCls =
  'h-10 w-full rounded-xl border border-border bg-surface-alt px-3 text-xs font-semibold text-ink focus:ring-2 focus:ring-blue-500/20 outline-none';
const labelCls = 'block text-[11px] font-black uppercase tracking-wide text-muted';

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  pkg: EducationalTourPackage;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Main Drawer ───────────────────────────────────────────────────────────

export default function EditEducationalTourDrawer({ pkg, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();

  // ── form state ──
  const [name, setName] = useState(pkg.name);
  const [schoolName, setSchoolName] = useState(pkg.school_name);
  const [gradeLevel, setGradeLevel] = useState(pkg.grade_level ?? '');
  const [description, setDescription] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [startsAt, setStartsAt] = useState(pkg.starts_at.slice(0, 16));
  const [endsAt, setEndsAt] = useState(pkg.ends_at.slice(0, 16));
  const [pickupLocation, setPickupLocation] = useState((pkg as any).pickup_location ?? '');
  const [operationsNotes, setOperationsNotes] = useState('');
  const [status, setStatus] = useState(pkg.status);

  // pricing
  const [ratePerHead, setRatePerHead] = useState(pkg.pricing.rate_per_head);
  const [adultRatePerHead, setAdultRatePerHead] = useState(pkg.pricing.adult_rate_per_head ?? pkg.pricing.rate_per_head);
  const [maxCapacity, setMaxCapacity] = useState(pkg.capacity.maximum);
  const [paymentPolicy, setPaymentPolicy] = useState<string>(pkg.pricing.payment_policy ?? 'flexible');
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(pkg.pricing.down_payment_amount ?? 0);
  const [installmentCount, setInstallmentCount] = useState<number>(pkg.pricing.installment_count ?? 3);

  // images
  const [images, setImages] = useState<string[]>((pkg as any).images ?? []);

  // fleet & bus assignments
  const [busAssignments, setBusAssignments] = useState<EditableBusAssignment[]>([]);
  const [availableFleetBuses, setAvailableFleetBuses] = useState<FleetBus[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<FleetDriver[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(false);
  const [fleetLoadError, setFleetLoadError] = useState('');

  // itinerary & inclusions (load from package if available)
  const [itinerary, setItinerary] = useState<ItineraryDayInput[]>(
    Array.isArray((pkg as any).itinerary) && (pkg as any).itinerary.length > 0
      ? (pkg as any).itinerary.map((item: any) => ({
          day_number: item.day_number ?? 1,
          date: item.date ?? startsAt.slice(0, 10),
          location: item.location ?? '',
          activity_description: item.activity ?? item.activity_description ?? '',
          meal_plan: item.meal_plan ?? '',
          accommodation_name: item.accommodation_name ?? '',
        }))
      : [
          {
            day_number: 1,
            date: pkg.starts_at.slice(0, 10),
            location: '',
            activity_description: '',
            meal_plan: '',
            accommodation_name: '',
          },
        ],
  );
  const [inclusions, setInclusions] = useState<string[]>(
    Array.isArray((pkg as any).inclusions) ? (pkg as any).inclusions : [],
  );
  const [exclusions, setExclusions] = useState<string[]>(
    Array.isArray((pkg as any).exclusions) ? (pkg as any).exclusions : [],
  );

  // Load full package details to populate richer fields
  useEffect(() => {
    let isCurrent = true;

    educationalTourApi.packageDetails(pkg.id).then((detail: any) => {
      if (!isCurrent) return;
      if (detail.description) setDescription(detail.description);
      if (detail.learning_objectives) setLearningObjectives(detail.learning_objectives);
      if (detail.operations_notes) setOperationsNotes(detail.operations_notes);
      if (detail.pickup_location) setPickupLocation(detail.pickup_location);
      if (Array.isArray(detail.images) && detail.images.length > 0) setImages(detail.images);
      if (Array.isArray(detail.inclusions) && detail.inclusions.length > 0) setInclusions(detail.inclusions);
      if (Array.isArray(detail.exclusions) && detail.exclusions.length > 0) setExclusions(detail.exclusions);
      if (Array.isArray(detail.bus_assignments)) {
        setBusAssignments(
          detail.bus_assignments.map((b: any, idx: number) => ({
            bus_id: b.bus_id,
            driver_id: b.driver_id,
            driver_name: b.driver_name,
            plate_number: b.bus_plate,
            model: b.bus_model,
            seating_capacity: b.capacity,
            sequence_number: b.sequence_number || (idx + 1),
            assignment_id: b.id,
            occupied: b.occupied ?? 0,
          }))
        );
      }
      if (Array.isArray(detail.itinerary) && detail.itinerary.length > 0) {
        setItinerary(
          detail.itinerary.map((item: any) => ({
            day_number: item.day_number ?? 1,
            date: item.date ?? detail.starts_at?.slice(0, 10),
            location: item.location ?? '',
            activity_description: item.activity ?? item.activity_description ?? '',
            meal_plan: item.meal_plan ?? '',
            accommodation_name: item.accommodation_name ?? '',
          })),
        );
      }
    }).catch(() => {/* Fall back to the package list data. */});

    return () => { isCurrent = false; };
  }, [pkg.id]);

  // Availability depends on the edited schedule. Keep this separate from the
  // package-detail load so changing dates never resets staged fleet changes.
  useEffect(() => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!startsAt || !endsAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setFleetLoadError('Enter a valid start and end schedule to check fleet availability.');
      return;
    }

    let isCurrent = true;
    setIsLoadingFleet(true);
    setFleetLoadError('');
    educationalTourApi.resources(startsAt, endsAt)
      .then((res) => {
        if (!isCurrent) return;
        setAvailableFleetBuses(Array.isArray(res.buses) ? res.buses : []);
        setAvailableDrivers(Array.isArray(res.drivers) ? res.drivers : []);
      })
      .catch((err: any) => {
        if (!isCurrent) return;
        setFleetLoadError(err?.response?.data?.message ?? 'Fleet availability could not be loaded.');
      })
      .finally(() => {
        if (isCurrent) setIsLoadingFleet(false);
      });

    return () => { isCurrent = false; };
  }, [startsAt, endsAt]);

  const pickImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = Array.from((e.target as HTMLInputElement).files || []).slice(0, Math.max(0, 8 - images.length));
      files.forEach(file => {
        if (file.size > 5_000_000) { toast.error(`${file.name} exceeds 5 MB.`); return; }
        const reader = new FileReader();
        reader.onload = () => setImages(cur => [...cur, String(reader.result)].slice(0, 8));
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const handleAddBusAssignment = (busId: number) => {
    const foundBus = availableFleetBuses.find(b => Number(b.id) === Number(busId));
    if (!foundBus) return;
    setBusAssignments(curr => [
      ...curr,
      {
        bus_id: foundBus.id,
        driver_id: undefined,
        plate_number: foundBus.plate_number,
        model: foundBus.model,
        seating_capacity: foundBus.seating_capacity || 49,
        sequence_number: curr.length + 1,
      }
    ]);
  };

  const handleUpdateBusAssignment = (idx: number, updates: Partial<EditableBusAssignment>) => {
    setBusAssignments(curr => curr.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...updates };
      if (updates.bus_id) {
        const foundBus = availableFleetBuses.find(b => Number(b.id) === Number(updates.bus_id));
        if (foundBus) {
          updated.plate_number = foundBus.plate_number;
          updated.model = foundBus.model;
          updated.seating_capacity = foundBus.seating_capacity || 49;
        }
      }
      if (updates.driver_id !== undefined) {
        const foundDriver = availableDrivers.find(d => Number(d.id) === Number(updates.driver_id));
        updated.driver_name = foundDriver ? `${foundDriver.first_name} ${foundDriver.last_name}` : undefined;
      }
      return updated;
    }));
  };

  const handleRemoveBusAssignment = (idx: number) => {
    const assignment = busAssignments[idx];
    if ((assignment?.occupied ?? 0) > 0 && !window.confirm(
      `This bus has ${assignment.occupied} passenger(s). Removing it will clear their seats so they can be reassigned. Continue?`,
    )) return;

    setBusAssignments(curr => curr.filter((_, i) => i !== idx).map((b, newIdx) => ({
      ...b,
      sequence_number: newIdx + 1,
    })));
  };

  const totalFleetCapacity = busAssignments.reduce((sum, b) => sum + (b.seating_capacity || 49), 0);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Tour name is required.'); return; }
    if (!schoolName.trim()) { toast.error('School name is required.'); return; }
    if (ratePerHead <= 0) { toast.error('Rate per head must be greater than 0.'); return; }
    if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
      toast.error('Tour end schedule must be after the start schedule.');
      return;
    }

    const selectedBusIds = busAssignments.map(a => Number(a.bus_id));
    if (new Set(selectedBusIds).size !== selectedBusIds.length) {
      toast.error('A bus can only be assigned once to the same tour.');
      return;
    }
    const selectedDriverIds = busAssignments.map(a => a.driver_id).filter((id): id is number => Boolean(id));
    if (new Set(selectedDriverIds).size !== selectedDriverIds.length) {
      toast.error('A driver can only be assigned to one bus on the same tour.');
      return;
    }

    setIsSaving(true);
    try {
      // Upload any new base64 images first, collect server URLs
      const resolvedImages: string[] = [];
      for (const src of images) {
        if (src.startsWith('data:')) {
          const serverUrl = await educationalTourApi.uploadImageBase64(pkg.id, src);
          resolvedImages.push(serverUrl);
        } else {
          resolvedImages.push(src); // already a server path/URL
        }
      }

      await educationalTourApi.updatePackage(pkg.id, {
        name: name.trim(),
        school_name: schoolName.trim(),
        grade_level: gradeLevel.trim() || undefined,
        description: description.trim() || undefined,
        learning_objectives: learningObjectives.trim() || undefined,
        starts_at: startsAt,
        ends_at: endsAt,
        pickup_location: pickupLocation.trim() || undefined,
        operations_notes: operationsNotes.trim() || undefined,
        status: status as any,
        rate_per_head: Number(ratePerHead),
        adult_rate_per_head: Number(adultRatePerHead || ratePerHead),
        maximum_capacity: Number(maxCapacity),
        payment_policy: paymentPolicy as any,
        down_payment_amount: paymentPolicy !== 'full_only' ? Number(downPaymentAmount) : undefined,
        installment_count: ['installment', 'flexible'].includes(paymentPolicy) ? Number(installmentCount) : undefined,
        images: resolvedImages.length > 0 ? resolvedImages : undefined,
        bus_assignments: busAssignments.map((b, idx) => ({
          id: b.assignment_id,
          bus_id: Number(b.bus_id),
          driver_id: b.driver_id ? Number(b.driver_id) : null,
          sequence_number: idx + 1,
        })),
        inclusions: inclusions.filter(Boolean),
        exclusions: exclusions.filter(Boolean),
        itinerary: (itinerary
          .filter(d => d.location || d.activity_description)
          .map((d, idx) => ({
            day_number: d.day_number ?? idx + 1,
            sequence: idx + 1,
            location: d.location ?? '',
            activity: d.activity_description ?? '',
          })) as CreateEducationalPackagePayload['itinerary']),
      });

      toast.success('Package and fleet allocations saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      queryClient.invalidateQueries({ queryKey: ['educational-package', pkg.id] });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save package.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl flex flex-col bg-surface shadow-2xl border-l border-border">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 bg-[#071b33] px-6 py-4 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-300">
              Edit Package · {pkg.tour_code}
            </p>
            <h2 className="mt-0.5 text-lg font-black text-white leading-tight line-clamp-1">{pkg.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 text-xs font-black uppercase tracking-wider"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* 1. School & Tour Info */}
          <Section
            icon={<GraduationCap className="h-4 w-4" />}
            badge="1 · School & Tour"
            title="Institutional Details"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tour / Program Title *" className="sm:col-span-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Subic Science & Nature Educational Tour 2026"
                />
              </Field>

              <Field label="School / Institution *">
                <input
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Eagle's Nest Learning Center"
                />
              </Field>

              <Field label="Grade / Batch Level">
                <input
                  value={gradeLevel}
                  onChange={e => setGradeLevel(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Grade 10"
                />
              </Field>

              <Field label="Departure Date & Time *">
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Return Date & Time *">
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Assembly & Pickup Point" className="sm:col-span-2">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                  <input
                    value={pickupLocation}
                    onChange={e => setPickupLocation(e.target.value)}
                    className={`${inputCls} pl-8`}
                    placeholder="e.g. School Main Campus Gate"
                  />
                </div>
              </Field>

              <Field label="Learning Objectives" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={learningObjectives}
                  onChange={e => setLearningObjectives(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-xs font-semibold text-ink focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  placeholder="Describe educational goals and academic scope..."
                />
              </Field>

              <Field label="Description" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-xs font-semibold text-ink focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  placeholder="Short public description of the tour package..."
                />
              </Field>

              <Field label="Status" className="sm:col-span-2">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className={inputCls}
                >
                  {['draft', 'published', 'in_progress', 'completed', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </Field>

              <Field label="Operations Notes" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={operationsNotes}
                  onChange={e => setOperationsNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2 text-xs font-semibold text-ink focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  placeholder="Internal staff notes, special requirements..."
                />
              </Field>
            </div>
          </Section>

          {/* 2. Pricing & Payment */}
          <Section
            icon={<DollarSign className="h-4 w-4" />}
            badge="2 · Pricing & Payment"
            title="Financial Structure"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Student / Child Rate (₱) *">
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={ratePerHead}
                  onChange={e => setRatePerHead(Number(e.target.value))}
                  className={inputCls}
                />
              </Field>

              <Field label="Adult / Companion Rate (₱) *">
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={adultRatePerHead}
                  onChange={e => setAdultRatePerHead(Number(e.target.value))}
                  className={inputCls}
                />
              </Field>

              <Field label="Maximum Capacity (Pax) *" className="sm:col-span-2">
                <input
                  type="number"
                  min={1}
                  value={maxCapacity}
                  onChange={e => setMaxCapacity(Number(e.target.value))}
                  className={inputCls}
                />
              </Field>

              <Field label="Payment Policy" className="sm:col-span-2">
                <select
                  value={paymentPolicy}
                  onChange={e => setPaymentPolicy(e.target.value)}
                  className={inputCls}
                >
                  <option value="flexible">Flexible (Down Payment or Full)</option>
                  <option value="down_payment">Down Payment Required</option>
                  <option value="installment">Installment Terms</option>
                  <option value="full_only">Full Settlement Only</option>
                </select>
              </Field>

              {paymentPolicy !== 'full_only' && (
                <Field label="Minimum Down Payment (₱)">
                  <input
                    type="number"
                    min={0}
                    value={downPaymentAmount}
                    onChange={e => setDownPaymentAmount(Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
              )}

              {['installment', 'flexible'].includes(paymentPolicy) && (
                <Field label="Installment Terms Count">
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={installmentCount}
                    onChange={e => setInstallmentCount(Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
              )}

              {/* Revenue snapshot */}
              <div className="sm:col-span-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 p-3 flex items-center justify-between gap-4">
                <div className="text-xs text-emerald-800 dark:text-emerald-200">
                  <p className="font-black">Projected Revenue</p>
                  <p className="font-medium text-[11px]">At full capacity</p>
                </div>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  ₱{(Number(ratePerHead) * Number(maxCapacity)).toLocaleString()}
                </p>
              </div>
            </div>
          </Section>

          {/* 3. Bus & Driver Allocation */}
          <Section
            icon={<Bus className="h-4 w-4" />}
            badge="3 · Fleet & Dispatch"
            title="Bus & Driver Allocation"
            subtitle="Assign the vehicles and drivers that will operate this tour"
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface-alt p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-black text-sm">
                    {busAssignments.length}
                  </div>
                  <div>
                    <p className="text-xs font-black text-ink">
                      {busAssignments.length} Bus{busAssignments.length === 1 ? '' : 'es'} Assigned
                    </p>
                    <p className="text-[11px] text-muted">
                      Total Fleet: <span className="font-bold text-ink">{totalFleetCapacity} Seats</span> · Max Capacity: <span className="font-bold text-ink">{maxCapacity} Pax</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    totalFleetCapacity >= maxCapacity
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  {totalFleetCapacity >= maxCapacity ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Capacity Covered ({totalFleetCapacity}/{maxCapacity})
                    </>
                  ) : (
                    <>
                      <Info className="h-3.5 w-3.5 text-amber-600" />
                      Short by {maxCapacity - totalFleetCapacity} seat(s)
                    </>
                  )}
                </span>
              </div>

              {fleetLoadError && (
                <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  {fleetLoadError}
                </div>
              )}

              {busAssignments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
                  <Bus className="h-8 w-8 text-muted mx-auto" />
                  <p className="text-xs font-bold text-muted">No bus or driver is assigned yet.</p>
                  <p className="text-[11px] text-muted">Choose an available bus below, then select its driver.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {busAssignments.map((alloc, idx) => (
                    <div
                      key={alloc.assignment_id ?? `new-${alloc.bus_id}-${idx}`}
                      className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                            Bus #{alloc.sequence_number || idx + 1}
                          </span>
                          <span className="text-xs font-bold text-ink">
                            {alloc.plate_number || 'Coach Assignment'}
                          </span>
                          <span className="text-[11px] text-muted">
                            ({alloc.seating_capacity || 49} Seats)
                          </span>
                          {(alloc.occupied ?? 0) > 0 && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {alloc.occupied} passenger{alloc.occupied === 1 ? '' : 's'} seated
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBusAssignment(idx)}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
                          aria-label={`Remove bus ${alloc.plate_number || idx + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Assigned Vehicle / Plate">
                          <select
                            value={alloc.bus_id}
                            onChange={e => handleUpdateBusAssignment(idx, { bus_id: Number(e.target.value) })}
                            className={inputCls}
                          >
                            {availableFleetBuses.map(b => {
                              const isCurrent = Number(b.id) === Number(alloc.bus_id);
                              const isUsedElsewhere = busAssignments.some((item, itemIdx) => itemIdx !== idx && Number(item.bus_id) === Number(b.id));
                              return <option key={b.id} value={b.id} disabled={!isCurrent && (!b.available || isUsedElsewhere)}>
                                {b.plate_number} · {b.model || 'Tourist Coach'} ({b.seating_capacity || 49} seats) {!b.available && Number(b.id) !== Number(alloc.bus_id) ? '· In Use' : ''}
                              </option>;
                            })}
                            {!availableFleetBuses.some(b => Number(b.id) === Number(alloc.bus_id)) && (
                              <option value={alloc.bus_id}>
                                {alloc.plate_number || `Bus ID #${alloc.bus_id}`} · ({alloc.seating_capacity || 49} seats)
                              </option>
                            )}
                          </select>
                        </Field>

                        <Field label="Assigned Driver">
                          <select
                            value={alloc.driver_id ?? ''}
                            onChange={e => handleUpdateBusAssignment(idx, { driver_id: e.target.value ? Number(e.target.value) : undefined })}
                            className={inputCls}
                          >
                            <option value="">-- Unassigned Driver --</option>
                            {availableDrivers.map(d => {
                              const isCurrent = Number(d.id) === Number(alloc.driver_id);
                              const isUsedElsewhere = busAssignments.some((item, itemIdx) => itemIdx !== idx && Number(item.driver_id) === Number(d.id));
                              return <option key={d.id} value={d.id} disabled={!isCurrent && (!d.available || isUsedElsewhere)}>
                                {d.first_name} {d.last_name} {!d.available && Number(d.id) !== Number(alloc.driver_id) ? '· In Use' : ''}
                              </option>;
                            })}
                            {alloc.driver_id && !availableDrivers.some(d => Number(d.id) === Number(alloc.driver_id)) && (
                              <option value={alloc.driver_id}>
                                {alloc.driver_name || `Driver ID #${alloc.driver_id}`}
                              </option>
                            )}
                          </select>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-border">
                <label htmlFor="new-bus-select" className={labelCls}>Add another bus</label>
                <select
                  id="new-bus-select"
                  defaultValue=""
                  disabled={isLoadingFleet || Boolean(fleetLoadError)}
                  onChange={e => {
                    if (e.target.value) {
                      handleAddBusAssignment(Number(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  className={`${inputCls} mt-1 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <option value="" disabled>
                    {isLoadingFleet ? 'Checking fleet availability…' : 'Select an available bus…'}
                  </option>
                  {availableFleetBuses
                    .filter(b => b.available && !busAssignments.some(a => Number(a.bus_id) === Number(b.id)))
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.plate_number} · {b.model || 'Tourist Coach'} ({b.seating_capacity || 49} seats)
                      </option>
                    ))}
                </select>
                {!isLoadingFleet && !fleetLoadError && availableFleetBuses.filter(b => b.available && !busAssignments.some(a => Number(a.bus_id) === Number(b.id))).length === 0 && (
                  <p className="mt-1.5 text-[11px] font-medium text-muted">No additional buses are available for the selected schedule.</p>
                )}
                <p className="mt-2 text-[11px] text-muted">
                  Assignment edits are applied only after you select <span className="font-bold text-ink">Save Changes</span>. Trip-ticket bus and driver details will synchronize automatically.
                </p>
              </div>
            </div>
          </Section>

          {/* 4. Package Images */}
          <Section
            icon={<ImageIcon className="h-4 w-4" />}
            badge="4 · Media"
            title="Package Images"
            subtitle="Up to 8 photos shown on cards and manifests"
            defaultOpen={false}
          >
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((src, i) => (
                  <div key={i} className="relative h-24 rounded-xl overflow-hidden border border-border">
                    <img src={imgUrl(src)} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(cur => cur.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 8 && (
                  <button
                    type="button"
                    onClick={pickImages}
                    className="h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted hover:border-blue-400 hover:text-blue-500 transition"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={pickImages}
                className="w-full h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted hover:border-blue-400 hover:text-blue-500 transition"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-bold">Add cover photos</span>
              </button>
            )}
          </Section>

          {/* 5. Itinerary */}
          <Section
            icon={<Calendar className="h-4 w-4" />}
            badge="5 · Itinerary"
            title="Day-by-Day Programme"
            defaultOpen={false}
          >
            <ItineraryBuilder value={itinerary} onChange={setItinerary} />
          </Section>

          {/* 6. Inclusions & Exclusions */}
          <Section
            icon={<CheckCircle2 className="h-4 w-4" />}
            badge="6 · Inclusions & Exclusions"
            title="What's Covered"
            defaultOpen={false}
          >
            <InclusionsExclusionsEditor
              inclusions={inclusions}
              exclusions={exclusions}
              onChange={(inc, exc) => {
                setInclusions(inc);
                setExclusions(exc);
              }}
            />
          </Section>

        </div>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 border-t border-border px-5 py-4 flex items-center justify-between gap-3 bg-surface">
          <p className="text-[11px] text-muted font-medium">
            {pkg.capacity.confirmed} confirmed pax · ₱{pkg.sales.collected.toLocaleString()} collected
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted border border-border hover:bg-surface-alt transition"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </aside>

    </>
  );
}

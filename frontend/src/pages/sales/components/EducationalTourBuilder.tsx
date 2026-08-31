import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Bus, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Download,
  FileSpreadsheet,
  FileText, 
  GraduationCap, 
  Info, 
  ImagePlus,
  Layers, 
  MapPin, 
  Plus, 
  Printer, 
  Sparkles, 
  Trash2, 
  Upload,
  UserPlus, 
  Users, 
  X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  educationalTourApi, 
  type CreateEducationalPackagePayload, 
  type EducationalProgram 
} from '../../../api/educationalTours';
import { Button, Modal } from '../../../components/ds';
import { BusSeatAllocationModal } from '../../../components/ui';
import type { AllocatedBus } from '../../../components/ui/BusSeatAllocationModal';
import BusLayout from '../../../components/ui/BusLayout';
import TripLocationMapPicker from '../../../components/travel/TripLocationMapPicker';
import ItineraryBuilder from './ItineraryBuilder';
import InclusionsExclusionsEditor from '../../../components/travel/InclusionsExclusionsEditor';
import PassengerManifestModal, { type PassengerManifestRow } from '../../../components/travel/PassengerManifestModal';
import { downloadEducationalRosterTemplate, parseEducationalRosterExcel } from '../../../utils/educationalTourExcel';
import EducationalTourTemplatePicker from './EducationalTourTemplatePicker';
import EducationalTourReview from './EducationalTourReview';
import SeatSelectorModal, { type SeatSelectionResult, type VehicleBookingMode } from '../../../components/travel/SeatSelectorModal';
import type { ItineraryDayInput } from '../../../api/contracts';

interface Props {
  onBack: () => void;
  onCreated: (packageId: number) => void;
}

const getTomorrowStartEnd = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return { starts_at: `${dateStr}T08:00`, ends_at: `${dateStr}T17:00` };
};

interface InitialParticipantRow {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  role: 'student' | 'adult' | 'companion';
  type?: 'student' | 'adult' | 'companion';
  student_number: string;
  grade_level: string;
  section: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  payment_plan: 'full' | 'down_payment' | 'installment';
  bus_assignment_id?: number;
  seat_number?: string;
}

export default function EducationalTourBuilder({ onBack, onCreated }: Props) {
  const queryClient = useQueryClient();

  // Navigation / Template State
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EducationalProgram | null>(null);

  // Core Package Information State
  const [tourName, setTourName] = useState('Metro Manila Discovery & Science Tour');
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 10 & 11');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('Hands-on experiential learning across robotics, biodiversity, and local governance.');
  const [startsAt, setStartsAt] = useState(getTomorrowStartEnd().starts_at);
  const [endsAt, setEndsAt] = useState(getTomorrowStartEnd().ends_at);
  const [pickupLocation, setPickupLocation] = useState('School Main Campus Assembly Gate');
  const [operationsNotes, setOperationsNotes] = useState('');
  const [packageImages, setPackageImages] = useState<string[]>([]);

  // Participants & Pricing State
  const [expectedStudents, setExpectedStudents] = useState<number>(45);
  const [expectedAdults, setExpectedAdults] = useState<number>(2);
  const [maximumCapacity, setMaximumCapacity] = useState<number>(150);
  const [ratePerHead, setRatePerHead] = useState<number>(3450);
  const [adultRatePerHead, setAdultRatePerHead] = useState<number>(3450);

  // Payment Terms
  const [paymentPolicy, setPaymentPolicy] = useState<'flexible' | 'down_payment' | 'installment' | 'full_only'>('flexible');
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(1000);
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  // Fleet & Bus State
  const [busAllocationModalOpen, setBusAllocationModalOpen] = useState(false);
  const [busAllocations, setBusAllocations] = useState<AllocatedBus[]>([]);
  const [activeBusIndex, setActiveBusIndex] = useState(0);

  // Itinerary & Inclusions State
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

  // Initial Desk Manifest / Participant Entries (Optional)
  const [initialParticipants, setInitialParticipants] = useState<InitialParticipantRow[]>([]);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);

  // Fetch Available Fleet Resources for dates
  const { data: resources } = useQuery({
    queryKey: ['educational-resources', startsAt, endsAt],
    queryFn: () => educationalTourApi.resources(startsAt, endsAt),
    enabled: Boolean(startsAt && endsAt),
  });

  // Calculate Required Buses
  const totalTravelers = Number(expectedStudents || 0) + Number(expectedAdults || 0);
  const requiredBuses = Math.max(1, Math.ceil((totalTravelers || 1) / 49));

  // Cross-Sales Universal Seat Selector State
  const [seatSelectorOpen, setSeatSelectorOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookingMode, setBookingMode] = useState<VehicleBookingMode>('entire_vehicle');
  const [activeParticipantIndex, setActiveParticipantIndex] = useState<number | null>(null);

  const availableBusesForSelector = useMemo(() => {
    if (busAllocations.length > 0) {
      return busAllocations.map((a) => ({
        id: Number(a.bus_id),
        plate_number: a.plate_number || 'Coach Bus',
        model: '49-Seater Coach',
        seating_capacity: 49,
        driver: resources?.drivers.find((d) => d.id === Number(a.driver_id)),
      }));
    }
    return (resources?.buses || []).map((b) => ({
      id: b.id,
      plate_number: b.plate_number,
      model: b.model || '49-Seater Coach',
      seating_capacity: b.seating_capacity || 49,
      driver: resources?.drivers.find((d) => d.id === (b as any).assigned_driver),
    }));
  }, [busAllocations, resources]);

  const handleSeatConfirm = (result: SeatSelectionResult) => {
    if (activeParticipantIndex !== null) {
      if (result.selectedSeats.length === 0) {
        toast.error('Please select a seat on the coach layout before confirming.');
        return;
      }
      const seatCode = `Seat ${result.selectedSeats[0]}`;
      updateParticipantRow(activeParticipantIndex, { 
        seat_number: seatCode,
        bus_assignment_id: Number(result.busId),
      });
      setActiveParticipantIndex(null);
      setSeatSelectorOpen(false);
      toast.success(`Assigned ${seatCode} on ${result.busPlate || 'Coach'} to participant.`);
      return;
    }

    setBookingMode(result.bookingMode);
    setSelectedSeats(result.selectedSeats);
    if (result.busId) {
      const existingIdx = busAllocations.findIndex((a) => Number(a.bus_id) === Number(result.busId));
      if (existingIdx === -1) {
        const busObj = (resources?.buses || []).find((b) => b.id === Number(result.busId));
        if (busObj) {
          setBusAllocations((curr) => [
            ...curr,
            {
              bus_id: Number(busObj.id),
              bus_name: busObj.model || '49-Seater Coach',
              plate_number: busObj.plate_number,
              capacity: 49,
              driver_id: result.driverId ? Number(result.driverId) : undefined,
              driver_name: result.driverName || undefined,
              seat_assignments: {},
            },
          ]);
        }
      }
    }
    setSeatSelectorOpen(false);
    toast.success(
      result.bookingMode === 'entire_vehicle'
        ? 'Whole vehicle charter mode selected.'
        : `Selected ${result.selectedSeats.length} seat(s) on ${result.busPlate}.`
    );
  };

  // Handler for Template Selection
  const handleSelectTemplate = (template: EducationalProgram) => {
    setSelectedTemplate(template);
    setTourName(template.name);
    setLearningObjectives(template.learning_objectives || '');
    setRatePerHead(Number(template.student_price || 3450));
    setAdultRatePerHead(Number(template.additional_chaperone_price || template.student_price || 3450));
    setExpectedStudents(Number(template.minimum_students || 45));
    setPackageImages(Array.isArray(template.images) ? template.images.filter(Boolean) : []);
    if (template.default_stops && template.default_stops.length > 0) {
      setItinerary([
        {
          day_number: 1,
          date: startsAt.slice(0, 10),
          location: template.default_stops[0] || 'Educational Circuit',
          activity_description: template.default_stops.join(' -> '),
          meal_plan: 'Plated Lunch Box Included',
          accommodation_name: 'N/A (Day Tour)',
        }
      ]);
    }
    toast.success(`Template "${template.name}" applied!`);
  };

  const pickPackageImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (event: Event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []).slice(0, Math.max(0, 8 - packageImages.length));
      files.forEach((file) => {
        if (file.size > 5_000_000) {
          toast.error(`${file.name} is larger than 5 MB.`);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => setPackageImages((current) => [...current, String(reader.result)].slice(0, 8));
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const packageImageUrl = (path: string) => {
    if (path.startsWith('data:')) return path;
    const normalized = path
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/^\/storage\/public\//, '/storage/')
      .replace(/^\/?public\//, '');
    return normalized.startsWith('/storage/')
      ? normalized
      : `/storage/${normalized.replace(/^\/?storage\//, '')}`;
  };

  // Add a participant row
  const addParticipantRow = () => {
    setInitialParticipants(curr => [
      ...curr,
      {
        first_name: '',
        last_name: '',
        date_of_birth: '2010-01-01',
        role: 'student',
        student_number: '',
        grade_level: gradeLevel || 'Grade 10',
        section: '',
        guardian_name: contactPerson || '',
        guardian_email: contactEmail || '',
        guardian_phone: contactNumber || '',
        payment_plan: paymentPolicy === 'full_only' ? 'full' : 'down_payment',
      }
    ]);
  };

  const removeParticipantRow = (index: number) => {
    setInitialParticipants(curr => curr.filter((_, i) => i !== index));
  };

  const updateParticipantRow = (index: number, updates: Partial<InitialParticipantRow>) => {
    setInitialParticipants(curr => curr.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Parsing Excel roster...', { id: 'import-builder-excel' });
      const result = await parseEducationalRosterExcel(file);
      if (result.validParticipants.length === 0) {
        toast.error('No valid student entries found in the file.', { id: 'import-builder-excel' });
        return;
      }

      const rows: InitialParticipantRow[] = result.validParticipants.map((p) => {
        const isAdult = p.participant.type === 'adult' || p.participant_type === 'adult';
        return {
          first_name: p.participant.first_name,
          last_name: p.participant.last_name,
          date_of_birth: p.participant.date_of_birth || '2008-01-01',
          role: isAdult ? ('adult' as const) : ('student' as const),
          type: isAdult ? ('adult' as const) : ('student' as const),
          student_number: p.participant.student_number || '',
          grade_level: p.participant.grade_level || gradeLevel || 'Grade 10',
          section: p.participant.section || 'General',
          guardian_name: p.guardian?.name || contactPerson || '',
          guardian_email: p.guardian?.email || contactEmail || '',
          guardian_phone: p.guardian?.phone || contactNumber || '',
          payment_plan: p.payment_plan || (paymentPolicy === 'full_only' ? 'full' : 'down_payment'),
          seat_number: p.seat_number,
        };
      });

      setInitialParticipants((curr) => [...curr, ...rows]);
      const studentCount = rows.filter(r => r.role === 'student').length;
      const adultCount = rows.filter(r => r.role !== 'student').length;
      setExpectedStudents((curr) => Math.max(curr, studentCount));
      if (adultCount > 0) setExpectedAdults((curr) => Math.max(curr, adultCount));
      toast.success(`Imported ${rows.length} participant(s) from Excel.`, { id: 'import-builder-excel' });
      e.target.value = '';
    } catch (err: any) {
      toast.error(err?.message || 'Failed to read Excel file.', { id: 'import-builder-excel' });
    }
  };

  // Tour Creation Mutation
  const createTourMutation = useMutation({
    mutationFn: async () => {
      if (!tourName.trim()) throw new Error('Please provide a Tour Name.');
      if (!schoolName.trim()) throw new Error('Please provide the School / Institution Name.');
      if (!ratePerHead || ratePerHead <= 0) throw new Error('Please set a valid Student Rate Per Head.');
      if (!pickupLocation.trim()) throw new Error('Please specify the Pickup Location.');

      // Format Itinerary
      const formattedItinerary = itinerary.map((item, idx) => ({
        day_number: item.day_number || idx + 1,
        sequence: idx + 1,
        date: item.date,
        location: item.location || 'Activity Destination',
        activity: item.activity_description || 'Scheduled Activity',
        activity_description: item.activity_description || 'Scheduled Activity',
        meal_plan: item.meal_plan || 'N/A',
        accommodation_name: item.accommodation_name || 'N/A',
      }));

      // Bus Assignments
      const busAssignments = busAllocations.map((alloc) => ({
        bus_id: alloc.bus_id,
        driver_id: alloc.driver_id,
      }));

      const payload: CreateEducationalPackagePayload & { bus_assignments?: any[] } = {
        name: tourName.trim(),
        school_name: schoolName.trim(),
        grade_level: gradeLevel.trim() || undefined,
        program_id: selectedTemplate?.id,
        learning_objectives: learningObjectives.trim() || undefined,
        description: `Educational tour for ${schoolName.trim()} (${gradeLevel})`,
        starts_at: startsAt,
        ends_at: endsAt,
        pickup_location: pickupLocation.trim(),
        itinerary: formattedItinerary,
        inclusions: inclusions.filter(Boolean),
        exclusions: exclusions.filter(Boolean),
        // File previews are data URLs and must not be persisted in the package
        // JSON column. They are uploaded to public storage after creation.
        images: packageImages.filter((image) => !image.startsWith('data:')),
        maximum_capacity: Number(maximumCapacity || 150),
        rate_per_head: Number(ratePerHead),
        adult_rate_per_head: Number(adultRatePerHead || ratePerHead),
        payment_policy: paymentPolicy,
        down_payment_amount: paymentPolicy !== 'full_only' ? Number(downPaymentAmount || 0) : undefined,
        installment_count: paymentPolicy === 'installment' || paymentPolicy === 'flexible' ? Number(installmentCount || 3) : undefined,
        status: 'published',
        operations_notes: operationsNotes.trim() || undefined,
        bus_assignments: busAssignments.length > 0 ? busAssignments : undefined,
      };

      // 1. Create the package
      let createdPkg = await educationalTourApi.createPackage(payload);

      const newImageFiles = packageImages.filter((image) => image.startsWith('data:'));
      let failedImageUploads = 0;
      if (newImageFiles.length > 0) {
        const imageResults = await Promise.allSettled(
          newImageFiles.map((image) => educationalTourApi.uploadImageBase64(createdPkg.id, image)),
        );
        failedImageUploads = imageResults.filter((result) => result.status === 'rejected').length;
        createdPkg = await educationalTourApi.packageDetails(createdPkg.id);
      }

      // 2. Register the initial desk roster in one request. The package is already
      // durable at this point, and row-level failures are returned without making
      // staff repeat package creation or risk duplicate tours.
      let registeredCount = 0;
      let failedCount = 0;
      const participantPayloads = initialParticipants
        .filter(p => p.first_name.trim() && p.last_name.trim())
        .map(p => {
          const matchingBusAlloc = p.bus_assignment_id
            ? busAllocations.find(a => Number(a.bus_id) === Number(p.bus_assignment_id))
            : busAllocations[0];
          const matchingCreatedBus = createdPkg.bus_assignments?.find(
            (b: any) => matchingBusAlloc && Number(b.bus_id) === Number(matchingBusAlloc.bus_id),
          ) || createdPkg.bus_assignments?.[0];

          const isAdult = p.role === 'adult' || p.role === 'companion' || p.type === 'adult';

          return {
            participant: {
              first_name: p.first_name.trim(),
              last_name: p.last_name.trim(),
              type: isAdult ? ('adult' as const) : ('student' as const),
              date_of_birth: p.date_of_birth || undefined,
              student_number: isAdult ? undefined : (p.student_number.trim() || undefined),
              grade_level: isAdult ? (p.grade_level.trim() || 'Non-Student') : (p.grade_level.trim() || gradeLevel || undefined),
              section: p.section.trim() || undefined,
            },
            participant_type: isAdult ? ('adult' as const) : ('student' as const),
            guardian: {
              name: p.guardian_name.trim() || contactPerson || undefined,
              email: p.guardian_email.trim() || contactEmail || undefined,
              phone: p.guardian_phone.trim() || contactNumber || undefined,
            },
            payment_plan: p.payment_plan,
            allocation_mode: p.seat_number ? 'manual' as const : 'automatic' as const,
            bus_assignment_id: matchingCreatedBus?.id,
            seat_number: p.seat_number || undefined,
          };
        });

      if (participantPayloads.length > 0) {
        const bulkResult = await educationalTourApi.bulkRegisterParticipants(createdPkg.id, participantPayloads);
        registeredCount = bulkResult.created;
        failedCount = bulkResult.failed;
      }

      return {
        package: createdPkg,
        registeredParticipants: registeredCount,
        failedParticipants: failedCount,
        failedImageUploads,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['educational-packages'] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      const participantNote = result.registeredParticipants > 0 
        ? ` with ${result.registeredParticipants} participant(s) registered` 
        : '';
      toast.success(`Tour "${result.package.tour_code}" launched successfully${participantNote}!`);
      if (result.failedParticipants > 0) {
        toast.error(`${result.failedParticipants} roster row(s) need correction. The tour package was still created safely.`);
      }
      if (result.failedImageUploads > 0) {
        toast.error(`${result.failedImageUploads} package image(s) could not be uploaded. You can retry from the package editor.`);
      }
      onCreated(result.package.id);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create educational tour package.';
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar / Header */}
      <header className="flex flex-col gap-4 rounded-3xl bg-[#071b33] p-6 text-white sm:flex-row sm:items-center sm:justify-between shadow-xl">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Educational Tours
          </button>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
              Tour Studio · Package Builder
            </p>
            {selectedTemplate && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[9px] font-black uppercase">
                Template: {selectedTemplate.name}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl lg:text-3xl font-black">Build & Launch Educational Tour</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
            Configure institutional details, fixed per-head pricing, 49-seater bus fleet, daily itinerary, inclusions, and participant registrations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setTemplatePickerOpen(true)}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            {selectedTemplate ? 'Change Template' : 'Use Template'}
          </Button>

          <Button
            type="button"
            onClick={() => createTourMutation.mutate()}
            disabled={createTourMutation.isPending}
            className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg"
          >
            <Plus className="h-4 w-4" />
            {createTourMutation.isPending ? 'Creating Tour...' : 'Save & Launch Tour'}
          </Button>
        </div>
      </header>

      {/* Main Builder Grid */}
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          {/* Section 1: School & Tour Particulars */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 flex items-center justify-center font-bold shrink-0">
                <GraduationCap size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">1 · School & Tour Information</p>
                <h2 className="text-lg font-black text-ink">Institutional Exposure Blueprint</h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-bold text-muted md:col-span-2">
                Tour / Program Title *
                <input
                  type="text"
                  required
                  placeholder="e.g. Subic & Clark Science & Nature Educational Adventure 2026"
                  value={tourName}
                  onChange={e => setTourName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                School / Institution Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. Eagle's Nest Foundational Learning Center"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Target Grade / Batch Level
                <input
                  type="text"
                  placeholder="e.g. Grade 10 / Senior High School"
                  value={gradeLevel}
                  onChange={e => setGradeLevel(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                School Contact Person Name
                <input
                  type="text"
                  placeholder="e.g. Maria Santos (Principal / Coordinator)"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Contact Phone / Mobile
                <input
                  type="text"
                  placeholder="e.g. 09171234567"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted md:col-span-2">
                Contact Email Address
                <input
                  type="email"
                  placeholder="e.g. contact@school.edu.ph"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-border">
              <label className="text-xs font-bold text-muted">
                Departure Date & Time *
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={e => {
                    const newStartsAt = e.target.value;
                    setStartsAt(newStartsAt);
                    if (newStartsAt && itinerary.length > 0) {
                      const newDate = newStartsAt.slice(0, 10);
                      setItinerary(curr => curr.map((day, i) => (i === 0 ? { ...day, date: newDate } : day)));
                    }
                  }}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Return Date & Time *
                <input
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted md:col-span-2 lg:col-span-1">
                Assembly & Pickup Point *
                <input
                  type="text"
                  required
                  placeholder="e.g. School Main Campus Assembly Gate"
                  value={pickupLocation}
                  onChange={e => setPickupLocation(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>
            </div>

            <div className="border-t border-border pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-ink">Package images</h3>
                  <p className="mt-1 text-xs text-muted">Add up to eight photos for staff to recognize this tour package.</p>
                </div>
                <Button type="button" variant="secondary" onClick={pickPackageImages} disabled={packageImages.length >= 8}>
                  <ImagePlus className="h-4 w-4" /> Add images
                </Button>
              </div>
              {packageImages.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {packageImages.map((image, index) => (
                    <div key={`${image.slice(0, 32)}-${index}`} className="relative h-28 overflow-hidden rounded-2xl border border-border bg-surface-muted">
                      <img src={packageImageUrl(image)} alt={`${tourName || 'Educational tour'} image ${index + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setPackageImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove image ${index + 1}`} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-slate-950/80 text-white hover:bg-slate-950">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button type="button" onClick={pickPackageImages} className="mt-4 flex h-28 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted text-xs font-bold text-muted hover:border-brand hover:text-brand">
                  <ImagePlus className="h-4 w-4" /> Add a cover photo or package gallery
                </button>
              )}
            </div>

            {/* Interactive Leaflet Map Location Picker */}
            <div className="pt-2">
              <TripLocationMapPicker
                pickupLocation={pickupLocation || 'School Campus Gate'}
                dropOffLocation={itinerary[0]?.location || 'Metro Manila Educational Circuit'}
                vehicleType="Bus"
                onLocationSelect={(pickup, dropoff) => {
                  setPickupLocation(pickup);
                  if (itinerary[0]) {
                    const updated = [...itinerary];
                    updated[0] = { ...updated[0], location: dropoff };
                    setItinerary(updated);
                  }
                }}
              />
            </div>

            <label className="block text-xs font-bold text-muted pt-2 border-t border-border">
              Learning Objectives & Academic Scope
              <textarea
                rows={2}
                value={learningObjectives}
                onChange={e => setLearningObjectives(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-ink"
              />
            </label>
          </section>

          {/* Section 2: Participants, Pricing & Payment Policy */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 flex items-center justify-center font-bold shrink-0">
                  <DollarSign className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">2 · Headcount & Fixed Per-Head Pricing</p>
                  <h2 className="text-lg font-black text-ink">Per-Participant Financial Structure</h2>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-bold text-muted">
                Student / Child Rate (₱) *
                <input
                  type="number"
                  required
                  min="0"
                  value={ratePerHead}
                  onChange={e => setRatePerHead(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Adult / Companion Rate (₱) *
                <input
                  type="number"
                  required
                  min="0"
                  value={adultRatePerHead}
                  onChange={e => setAdultRatePerHead(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Maximum Tour Capacity (Pax) *
                <input
                  type="number"
                  required
                  min="1"
                  value={maximumCapacity}
                  onChange={e => setMaximumCapacity(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Expected Students
                <input
                  type="number"
                  min="1"
                  value={expectedStudents}
                  onChange={e => setExpectedStudents(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Expected Adults / Companions
                <input
                  type="number"
                  min="0"
                  value={expectedAdults}
                  onChange={e => setExpectedAdults(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Payment Policy
                <select
                  value={paymentPolicy}
                  onChange={e => setPaymentPolicy(e.target.value as any)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                >
                  <option value="flexible">Flexible (Down Payment or Full)</option>
                  <option value="down_payment">Down Payment Required</option>
                  <option value="installment">Installment Terms</option>
                  <option value="full_only">Full Settlement Only</option>
                </select>
              </label>

              {paymentPolicy !== 'full_only' && (
                <label className="text-xs font-bold text-muted">
                  Minimum Down Payment (₱)
                  <input
                    type="number"
                    min="0"
                    value={downPaymentAmount}
                    onChange={e => setDownPaymentAmount(Number(e.target.value))}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                  />
                </label>
              )}

              {(paymentPolicy === 'installment' || paymentPolicy === 'flexible') && (
                <label className="text-xs font-bold text-muted">
                  Installment Terms Count
                  <input
                    type="number"
                    min="2"
                    max="12"
                    value={installmentCount}
                    onChange={e => setInstallmentCount(Number(e.target.value))}
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink"
                  />
                </label>
              )}
            </div>
          </section>

          {/* Section 3: Fleet Planning & 49-Seater Bus Setup */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 flex items-center justify-center font-bold shrink-0">
                  <Bus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">3 · Fleet Logistics & Capacity</p>
                  <h2 className="text-lg font-black text-ink">49-Seater Bus Logistics & Pre-Allocation</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setSeatSelectorOpen(true)}
                  className="!bg-blue-600 hover:!bg-blue-700 !text-white text-xs font-black uppercase tracking-wider shadow shrink-0"
                >
                  <Bus className="h-4 w-4" /> Seat Selector {selectedSeats.length > 0 ? `(${selectedSeats.length} Seats)` : ''}
                </Button>
                <Button
                  type="button"
                  onClick={() => setBusAllocationModalOpen(true)}
                  className="!bg-amber-500 hover:!bg-amber-600 !text-slate-950 text-xs font-black uppercase tracking-wider shadow shrink-0"
                >
                  <Bus className="h-4 w-4" /> Assign Fleet ({busAllocations.length} Bus Assigned)
                </Button>
              </div>
            </div>

            {/* Live 49-Seater Calculation Banner */}
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest">
                  Automatic Fleet Sizing
                </span>
                <span className="text-xs font-black text-blue-900 dark:text-blue-200">
                  {totalTravelers} Travelers → {requiredBuses} x 49-Seater Coach Bus(es) Required ({requiredBuses * 49} Max Seats)
                </span>
              </div>

              {busAllocations.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                    Assigned Fleet:
                  </span>
                  {busAllocations.map((alloc, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-black bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 flex items-center gap-1.5"
                    >
                      <Bus className="h-3.5 w-3.5 text-blue-600" />
                      Bus #{idx + 1}: {alloc.plate_number} ({alloc.driver_name || 'Driver TBD'})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-blue-700 dark:text-blue-300 pt-1">
                  Click "Assign Fleet" to map specific buses and drivers to this tour.
                </p>
              )}
            </div>

            {/* Interactive 49-Seater Bus Visualizer */}
            {requiredBuses > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">49-Seater Bus Blueprint Inspector</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: requiredBuses }, (_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveBusIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                          activeBusIndex === idx
                            ? 'bg-blue-600 text-white'
                            : 'bg-surface-alt border border-border text-muted'
                        }`}
                      >
                        Bus #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-surface-alt/40">
                  <BusLayout
                    totalSeats={49}
                    hasRestroom={false}
                    selectedSeats={[]}
                    occupiedSeats={[]}
                    onSeatToggle={() => {}}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Day-by-Day Operating Itinerary */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <ItineraryBuilder value={itinerary} onChange={setItinerary} />
          </section>

          {/* Section 5: Inclusions & Exclusions */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <InclusionsExclusionsEditor
              inclusions={inclusions}
              exclusions={exclusions}
              onChange={(inc, exc) => {
                setInclusions(inc);
                setExclusions(exc);
              }}
            />
          </section>

          {/* Section 6: Initial Participant Desk Roster (Optional) */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 flex items-center justify-center font-bold shrink-0">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">4 · Participant Registration</p>
                  <h2 className="text-lg font-black text-ink">Initial Desk Participant Entry (Optional)</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadEducationalRosterTemplate({
                    name: tourName || 'Educational Tour',
                    tour_code: 'DRAFT-TOUR',
                    school_name: schoolName || 'School',
                    grade_level: gradeLevel,
                    pricing: { rate_per_head: ratePerHead } as any,
                  } as any)}
                  className="text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Template
                </Button>

                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-ink transition shadow-sm">
                  <Upload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Import Excel</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                </label>

                <Button
                  type="button"
                  onClick={addParticipantRow}
                  className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider"
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Add Row
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Single-Pax Invoicing Invariant</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                Any participants entered below will be automatically registered upon tour launch. Every student receives a <strong>unique booking reference</strong> and an <strong>individual invoice (₱{ratePerHead.toLocaleString()})</strong>.
              </p>
            </div>

            {initialParticipants.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl text-muted">
                <Users className="h-8 w-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-bold">No initial participants added</p>
                <p className="text-[11px] mt-0.5">You can launch the package now and add student registrations individually from the Tour Dashboard.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addParticipantRow}
                  className="mt-3 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Student Row
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {initialParticipants.map((p, idx) => {
                  const isAdult = p.role === 'adult' || p.role === 'companion' || p.type === 'adult';
                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-border bg-surface-alt/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-white text-[10px] font-black uppercase ${isAdult ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                            {isAdult ? `Adult / Companion #${idx + 1}` : `Student #${idx + 1}`}
                          </span>
                          <select
                            value={isAdult ? 'adult' : 'student'}
                            onChange={e => {
                              const newRole = e.target.value as 'student' | 'adult';
                              updateParticipantRow(idx, { role: newRole, type: newRole });
                            }}
                            className="h-7 rounded-lg border border-border bg-surface px-2 text-[11px] font-bold text-ink"
                          >
                            <option value="student">Student / Child (₱{ratePerHead.toLocaleString()})</option>
                            <option value="adult">Adult / Companion (₱{adultRatePerHead.toLocaleString()})</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeParticipantRow(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          type="text"
                          placeholder="First Name *"
                          required
                          value={p.first_name}
                          onChange={e => updateParticipantRow(idx, { first_name: e.target.value })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        />
                        <input
                          type="text"
                          placeholder="Last Name *"
                          required
                          value={p.last_name}
                          onChange={e => updateParticipantRow(idx, { last_name: e.target.value })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        />
                        <div>
                          <label className="text-[9px] font-bold text-muted uppercase block">Date of Birth (Insurance *)</label>
                          <input
                            type="date"
                            required
                            value={p.date_of_birth}
                            onChange={e => updateParticipantRow(idx, { date_of_birth: e.target.value })}
                            className="h-9 w-full rounded-xl border border-border bg-surface px-2 text-xs font-semibold text-ink"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          type="text"
                          placeholder={isAdult ? "Role / Faculty ID (Optional)" : "Student ID Number"}
                          value={p.student_number}
                          onChange={e => updateParticipantRow(idx, { student_number: e.target.value })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        />
                        <input
                          type="text"
                          placeholder={isAdult ? "Section / Branch (e.g. Fairview Branch)" : "Section / Branch"}
                          value={p.section}
                          onChange={e => updateParticipantRow(idx, { section: e.target.value })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        />
                        <select
                          value={p.payment_plan}
                          onChange={e => updateParticipantRow(idx, { payment_plan: e.target.value as any })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        >
                          <option value="full">Full Payment Plan</option>
                          <option value="down_payment">Down Payment Plan</option>
                          <option value="installment">Installment Plan</option>
                        </select>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          type="text"
                          placeholder={isAdult ? "Emergency Contact Name" : "Guardian / Billing Contact"}
                          value={p.guardian_name}
                          onChange={e => updateParticipantRow(idx, { guardian_name: e.target.value })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        />
                        <input
                          type="email"
                          placeholder={isAdult ? "Contact Email" : "Billing Email"}
                          value={p.guardian_email}
                          onChange={e => updateParticipantRow(idx, { guardian_email: e.target.value })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        />
                        <input
                          type="text"
                          placeholder={isAdult ? "Emergency Contact Phone" : "Guardian Phone"}
                          value={p.guardian_phone}
                          onChange={e => updateParticipantRow(idx, { guardian_phone: e.target.value })}
                          className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveParticipantIndex(idx);
                            setSeatSelectorOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                        >
                          <Bus className="h-3.5 w-3.5 text-blue-600" />
                          {p.seat_number ? `Assigned: ${p.seat_number}` : 'Select Specific Seat on Coach'}
                        </button>
                        {p.seat_number && (
                          <button
                            type="button"
                            onClick={() => updateParticipantRow(idx, { seat_number: undefined })}
                            className="text-[11px] text-rose-500 hover:underline font-bold"
                          >
                            Clear Seat (Auto-Assign)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 7: Operations & Dispatch Notes */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <label className="block text-xs font-bold text-muted">
              Operations, Gate Permits & Logistics Notes
              <textarea
                rows={2}
                placeholder="Gate permits, dietary accommodations, parking access, or special coordinator instructions"
                value={operationsNotes}
                onChange={e => setOperationsNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm font-semibold text-ink"
              />
            </label>
          </section>
        </div>

        {/* Sidebar Review & Calculations */}
        <aside className="sticky top-4 h-fit space-y-5">
          <EducationalTourReview
            tourName={tourName}
            schoolName={schoolName}
            gradeLevel={gradeLevel}
            expectedStudents={expectedStudents}
            expectedAdults={expectedAdults}
            ratePerHead={ratePerHead}
            adultRatePerHead={adultRatePerHead}
            assignedBusesCount={busAllocations.length}
            paymentPolicy={paymentPolicy}
            downPaymentAmount={downPaymentAmount}
            installmentCount={installmentCount}
            onSubmit={() => createTourMutation.mutate()}
            isSubmitting={createTourMutation.isPending}
          />
        </aside>
      </div>

      {/* Template Picker Modal */}
      <EducationalTourTemplatePicker
        isOpen={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        onStartFromScratch={() => {
          setSelectedTemplate(null);
          toast.success('Ready to build custom tour from scratch.');
        }}
      />

      {/* Bus Allocation Modal */}
      <BusSeatAllocationModal
        isOpen={busAllocationModalOpen}
        onClose={() => setBusAllocationModalOpen(false)}
        requiredCapacity={totalTravelers}
        passengers={initialParticipants.map((p, idx) => ({
          id: idx,
          first_name: p.first_name,
          last_name: p.last_name,
          role: p.role,
          seat_code: p.seat_number ? p.seat_number.replace(/^(?:Seat|S)\s*/i, '') : undefined,
          bus_index: p.bus_assignment_id
            ? busAllocations.findIndex((a) => Number(a.bus_id) === Number(p.bus_assignment_id))
            : undefined,
        }))}
        initialAllocations={busAllocations}
        availableDrivers={resources?.drivers || []}
        onSaveAllocations={(allocs: AllocatedBus[]) => {
          setBusAllocations(allocs);
          // Sync any seat assignments made inside the fleet modal into initialParticipants
          setInitialParticipants((currentParticipants) => {
            return currentParticipants.map((p, pIdx) => {
              for (const alloc of allocs) {
                for (const [seatCode, assignedPassenger] of Object.entries(alloc.seat_assignments || {})) {
                  const matchById = assignedPassenger.id !== undefined && assignedPassenger.id === pIdx;
                  const matchByName =
                    assignedPassenger.first_name?.trim().toLowerCase() === p.first_name?.trim().toLowerCase() &&
                    assignedPassenger.last_name?.trim().toLowerCase() === p.last_name?.trim().toLowerCase();
                  if (matchById || matchByName) {
                    return {
                      ...p,
                      bus_assignment_id: Number(alloc.bus_id),
                      seat_number: `Seat ${seatCode}`,
                    };
                  }
                }
              }
              return p;
            });
          });
          toast.success(`Assigned ${allocs.length} bus(es) to tour fleet.`);
        }}
      />

      {/* Cross-Sales Universal Seat Selector Modal */}
      <SeatSelectorModal
        isOpen={seatSelectorOpen}
        onClose={() => {
          setSeatSelectorOpen(false);
          setActiveParticipantIndex(null);
        }}
        onConfirm={handleSeatConfirm}
        buses={availableBusesForSelector}
        initialBusId={busAllocations[0]?.bus_id ? Number(busAllocations[0].bus_id) : undefined}
        initialMode={activeParticipantIndex !== null ? 'selected_seats' : bookingMode}
        initialSeats={
          activeParticipantIndex !== null && initialParticipants[activeParticipantIndex]?.seat_number
            ? [String(initialParticipants[activeParticipantIndex].seat_number).replace(/^(?:Seat|S)\s*/i, '')]
            : selectedSeats
        }
        travelDate={startsAt ? startsAt.slice(0, 10) : undefined}
        returnDate={endsAt ? endsAt.slice(0, 10) : undefined}
        paxCount={activeParticipantIndex !== null ? 1 : totalTravelers}
        packageName={tourName || 'Educational Tour Package'}
        allowWholeVehicle={activeParticipantIndex === null}
      />
    </div>
  );
}

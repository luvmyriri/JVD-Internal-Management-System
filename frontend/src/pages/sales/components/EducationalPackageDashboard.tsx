import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  FileSpreadsheet,
  GraduationCap,
  Mail,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { educationalTourApi, type EducationalTourParticipantBooking, type RegisterParticipantPayload } from '../../../api/educationalTours';
import { Button, Modal } from '../../../components/ds';
import SeatSelectorModal, { type SeatSelectionResult } from '../../../components/travel/SeatSelectorModal';
import { BusSeatAllocationModal } from '../../../components/ui';
import type { AllocatedBus } from '../../../components/ui/BusSeatAllocationModal';
import {
  downloadEducationalRosterTemplate,
  exportEducationalRosterToExcel,
  parseEducationalRosterExcel,
  type ParseExcelResult,
} from '../../../utils/educationalTourExcel';
import { generateUUID } from '../../../utils';

interface Props {
  packageId: number;
  onBack: () => void;
}

const packageImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('data:')) return path;
  let normalized = path
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/storage\/public\//, '/storage/')
    .replace(/^\/public\//, '/')
    .replace(/^\/+/, '/');

  if (normalized.startsWith('/storage/uploads/')) {
    normalized = normalized.replace('/storage/uploads/', '/uploads/');
  }

  if (normalized.startsWith('/storage/') || normalized.startsWith('/uploads/')) {
    return normalized;
  }

  return `/storage/${normalized.replace(/^\/?(storage|uploads)\//, '')}`;
};

const initialParticipantForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  participant_type: 'student' as 'student' | 'adult',
  student_number: '',
  grade_level: '',
  section: '',
  email: '',
  phone: '',
  guardian_name: '',
  guardian_email: '',
  guardian_phone: '',
  payment_plan: 'full' as 'full' | 'down_payment' | 'installment',
  dietary_restrictions: '',
  medical_or_accessibility_notes: '',
  allocation_mode: 'automatic' as 'manual' | 'automatic',
  bus_assignment_id: '' as string | number,
  seat_number: '',
};

const rosterActionButtonBase =
  'inline-flex h-7 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950';

const rosterActionButtonTone = {
  invoice:
    'border-blue-700 bg-blue-600 text-white hover:border-blue-800 hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500',
  statement:
    'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  email:
    'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/70',
  payment:
    'border-emerald-700 bg-emerald-600 text-white hover:border-emerald-800 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500',
  seat:
    'border-indigo-300 bg-indigo-50 text-indigo-800 hover:border-indigo-400 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/70',
  cancel:
    'border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-400 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-900/70',
} as const;

export default function EducationalPackageDashboard({ packageId, onBack }: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'roster' | 'fleet'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Staff-encoded participant booking
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [participantForm, setParticipantForm] = useState(initialParticipantForm);

  // Payment Modal State
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<EducationalTourParticipantBooking | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_kind: 'full' as 'full' | 'down_payment' | 'installment' | 'balance',
    payment_method: 'Cash',
    amount: '',
    notes: '',
    idempotency_key: generateUUID(),
  });

  // Cross-Sales Seat Selector State for Seat Moves & Participant Addition
  const [seatSelectorModalOpen, setSeatSelectorModalOpen] = useState(false);
  const [seatSelectionMode, setSeatSelectionMode] = useState<'move' | 'add_participant'>('move');
  const [selectedBookingForMove, setSelectedBookingForMove] = useState<EducationalTourParticipantBooking | null>(null);

  // Add Bus Modal State
  const [addBusModalOpen, setAddBusModalOpen] = useState(false);
  const [addBusForm, setAddBusForm] = useState({
    bus_id: '',
    driver_id: '',
  });

  // Edit Bus Modal State
  const [editingBusAssignment, setEditingBusAssignment] = useState<any | null>(null);
  const [editBusForm, setEditBusForm] = useState({
    bus_id: '',
    driver_id: '',
  });
  const [busSeatModalOpen, setBusSeatModalOpen] = useState(false);

  const { data: pkg, isLoading: pkgLoading } = useQuery({
    queryKey: ['educational-package', packageId],
    queryFn: () => educationalTourApi.packageDetails(packageId),
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['educational-participant-bookings', packageId],
    queryFn: () => educationalTourApi.participantBookings({ package_id: packageId }),
  });

  const { data: resources } = useQuery({
    queryKey: ['educational-resources', pkg?.starts_at, pkg?.ends_at],
    queryFn: () => pkg ? educationalTourApi.resources(pkg.starts_at, pkg.ends_at) : Promise.resolve({ buses: [], drivers: [] }),
    enabled: Boolean(pkg?.starts_at && pkg?.ends_at),
  });

  const busesForSeatSelector = useMemo(() => {
    if (!pkg?.bus_assignments || pkg.bus_assignments.length === 0) {
      return (resources?.buses || []).map((b) => ({
        id: b.id,
        plate_number: b.plate_number,
        model: b.model || '49-Seater Coach',
        seating_capacity: b.seating_capacity || 49,
        driver: resources?.drivers.find((d) => d.id === (b as any).assigned_driver),
        occupiedSeats: [],
      }));
    }
    return pkg.bus_assignments.map((ba) => {
      const activeBookings = (bookings || []).filter(
        (b) => b.bus_assignment_id === ba.id && !['cancelled', 'expired'].includes(b.status)
      );
      const occupiedSeats = activeBookings
        .map((b) => b.seat_number ? b.seat_number.replace(/^(?:Seat|S)\s*/i, '') : null)
        .filter(Boolean) as string[];

      return {
        id: Number(ba.bus_id || ba.id),
        bus_assignment_id: ba.id,
        plate_number: ba.bus_plate || `Bus #${ba.sequence_number}`,
        model: ba.bus_model || '49-Seater Coach',
        seating_capacity: ba.capacity || 49,
        driver: ba.driver_name ? { first_name: ba.driver_name, last_name: '' } : undefined,
        occupiedSeats,
      };
    });
  }, [pkg, resources, bookings]);

  const handleSeatConfirm = (result: SeatSelectionResult) => {
    const seatCode = result.selectedSeats[0] ? `Seat ${result.selectedSeats[0]}` : 'Seat 1';
    const assignment = (pkg?.bus_assignments || []).find(
      (ba) => Number(ba.bus_id) === Number(result.busId) || Number(ba.id) === Number(result.busId)
    );
    const busAssignmentId = assignment?.id || pkg?.bus_assignments?.[0]?.id || result.busId;

    if (seatSelectionMode === 'add_participant') {
      setParticipantForm((current) => ({
        ...current,
        allocation_mode: 'manual',
        bus_assignment_id: busAssignmentId,
        seat_number: seatCode,
      }));
      toast.success(`Selected ${seatCode} on ${result.busPlate || 'Coach'}`);
      setParticipantModalOpen(true);
    } else if (selectedBookingForMove) {
      moveSeatMutation.mutate({
        bookingId: selectedBookingForMove.id,
        busId: Number(busAssignmentId),
        seatNumber: seatCode,
      });
    }

    setSeatSelectorModalOpen(false);
    setSelectedBookingForMove(null);
  };

  const manifestMutation = useMutation({
    mutationFn: () => educationalTourApi.packageManifest(packageId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `educational-tour-${packageId}-manifest.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success('Participant manifest downloaded.');
    },
    onError: () => toast.error('The participant manifest could not be generated.'),
  });

  // Mutations
  const recordPaymentMutation = useMutation({
    mutationFn: (data: { bookingId: number; payload: any }) =>
      educationalTourApi.recordPayment(data.bookingId, data.payload),
    onSuccess: () => {
      toast.success('Payment recorded and synced to Accounting.');
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-participant-bookings', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      setSelectedBookingForPayment(null);
      setPaymentForm({ payment_kind: 'full', payment_method: 'Cash', amount: '', notes: '', idempotency_key: generateUUID() });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Payment could not be recorded.'),
  });

  const participantDocumentMutation = useMutation({
    mutationFn: async (data: { booking: EducationalTourParticipantBooking; type: 'invoice' | 'statement' }) => {
      const blob = data.type === 'invoice'
        ? await educationalTourApi.participantInvoice(data.booking.id)
        : await educationalTourApi.participantStatement(data.booking.id);
      return { ...data, blob };
    },
    onSuccess: ({ booking, type, blob }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type === 'invoice' ? 'Invoice' : 'SOA'}_${booking.invoice?.invoice_number || booking.reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success(`${type === 'invoice' ? 'Invoice' : 'Statement of Account'} downloaded.`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'The participant document could not be generated.'),
  });

  const emailDocumentsMutation = useMutation({
    mutationFn: (data: { bookingId: number; email?: string }) =>
      educationalTourApi.sendParticipantDocuments(data.bookingId, data.email),
    onSuccess: (response) => toast.success(response.message || 'Invoice documents queued for email.'),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'The invoice documents could not be emailed.'),
  });

  const moveSeatMutation = useMutation({
    mutationFn: (data: { bookingId: number; busId: number; seatNumber: string }) =>
      educationalTourApi.moveSeat(data.bookingId, data.busId, data.seatNumber),
    onSuccess: () => {
      toast.success('Participant seat updated.');
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-participant-bookings', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      setSelectedBookingForMove(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not move participant seat.'),
  });

  const allocateBusesMutation = useMutation({
    mutationFn: () => educationalTourApi.allocateBuses(packageId, { strategy: 'fill_current_bus_first' }),
    onSuccess: (data: any) => {
      toast.success(`Allocated seats for ${data.allocated || 0} participants.`);
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-participant-bookings', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Auto-allocation failed.'),
  });

  const assignBusMutation = useMutation({
    mutationFn: () => educationalTourApi.assignBus(packageId, {
      bus_id: Number(addBusForm.bus_id),
      driver_id: addBusForm.driver_id ? Number(addBusForm.driver_id) : undefined,
    }),
    onSuccess: () => {
      toast.success('Vehicle assigned to tour fleet.');
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      setAddBusModalOpen(false);
      setAddBusForm({ bus_id: '', driver_id: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Vehicle could not be assigned.'),
  });

  const updateBusAssignmentMutation = useMutation({
    mutationFn: (data: { assignmentId: number; bus_id: number; driver_id?: number | null }) =>
      educationalTourApi.updateBusAssignment(packageId, data.assignmentId, {
        bus_id: data.bus_id,
        driver_id: data.driver_id,
      }),
    onSuccess: () => {
      toast.success('Bus & driver assignment updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      setEditingBusAssignment(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Bus assignment could not be updated.'),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => educationalTourApi.cancelParticipantBooking(bookingId, 'Admin cancelled'),
    onSuccess: () => {
      toast.success('Booking cancelled and seat released.');
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-participant-bookings', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not cancel booking.'),
  });

  const registerParticipantMutation = useMutation({
    mutationFn: () => educationalTourApi.registerParticipantAtDesk(packageId, {
      participant: {
        first_name: participantForm.first_name.trim(),
        middle_name: participantForm.middle_name.trim() || undefined,
        last_name: participantForm.last_name.trim(),
        type: participantForm.participant_type,
        participant_type: participantForm.participant_type,
        student_number: participantForm.participant_type === 'adult' ? undefined : (participantForm.student_number.trim() || undefined),
        grade_level: participantForm.participant_type === 'adult' ? (participantForm.grade_level.trim() || 'Non-Student') : (participantForm.grade_level.trim() || pkg?.grade_level || undefined),
        section: participantForm.section.trim() || undefined,
        email: participantForm.email.trim() || undefined,
        phone: participantForm.phone.trim() || undefined,
        dietary_restrictions: participantForm.dietary_restrictions.trim() || undefined,
        medical_or_accessibility_notes: participantForm.medical_or_accessibility_notes.trim() || undefined,
      },
      participant_type: participantForm.participant_type,
      guardian: {
        name: participantForm.guardian_name.trim() || undefined,
        email: participantForm.guardian_email.trim() || undefined,
        phone: participantForm.guardian_phone.trim() || undefined,
      },
      payment_plan: participantForm.payment_plan,
      allocation_mode: participantForm.allocation_mode,
      bus_assignment_id: participantForm.allocation_mode === 'manual' && participantForm.bus_assignment_id
        ? Number(participantForm.bus_assignment_id)
        : undefined,
      seat_number: participantForm.allocation_mode === 'manual' && participantForm.seat_number.trim()
        ? participantForm.seat_number.trim()
        : undefined,
    }),
    onSuccess: (result) => {
      const message = result.duplicate
        ? `Existing booking ${result.booking_reference} was found for this student.`
        : `Booking ${result.booking_reference} and invoice ${result.billing.invoice_number} created.`;
      toast.success(message, { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-participant-bookings', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      setParticipantModalOpen(false);
      setParticipantForm(initialParticipantForm);
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-participant-bookings', packageId] });
      const validationErrors = err?.response?.data?.errors;
      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat().find(Boolean)
        : null;
      toast.error(String(firstValidationError || err?.response?.data?.message || 'Participant booking could not be created.'));
    },
  });

  // Bulk Upload State & Handlers
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [parsedExcelResult, setParsedExcelResult] = useState<ParseExcelResult | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const bulkRegisterMutation = useMutation({
    mutationFn: (participants: RegisterParticipantPayload[]) =>
      educationalTourApi.bulkRegisterParticipants(packageId, participants),
    onSuccess: (res) => {
      toast.success(`Bulk upload complete: ${res.created} registered, ${res.duplicates} duplicate(s) skipped.`);
      if (res.failed > 0) {
        toast.error(`${res.failed} row(s) failed during registration.`);
      }
      queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-participant-bookings', packageId] });
      queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
      setBulkUploadModalOpen(false);
      setSelectedExcelFile(null);
      setParsedExcelResult(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Bulk upload failed.');
    },
  });

  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedExcelFile(file);
    setIsParsingExcel(true);
    try {
      const result = await parseEducationalRosterExcel(file);
      setParsedExcelResult(result);
      if (result.totalRows === 0) {
        toast.error('No participant rows found in the uploaded file.');
      } else if (result.errorCount > 0) {
        toast.error(`Found ${result.errorCount} row(s) with incomplete data.`);
      } else {
        toast.success(`Ready to import ${result.validParticipants.length} participant(s).`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to parse Excel file.');
      setParsedExcelResult(null);
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleExportRoster = async () => {
    if (!pkg) return;
    setIsExportingExcel(true);
    try {
      toast.loading('Generating Excel roster...', { id: 'export-roster' });
      await exportEducationalRosterToExcel(pkg, bookings);
      toast.success('Roster exported to Excel successfully.', { id: 'export-roster' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export roster.', { id: 'export-roster' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || [
      b.reference,
      b.participant_first_name,
      b.participant_last_name,
      b.student_number,
      b.section,
    ].some(v => String(v || '').toLowerCase().includes(q));

    const matchStatus = statusFilter === 'all' || b.status === statusFilter;

    return matchSearch && matchStatus;
  });

  if (pkgLoading || !pkg) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-bold">
          <RefreshCw className="h-5 w-5 animate-spin" /> Loading tour...
        </div>
      </div>
    );
  }

  const capacityPct = Math.min(100, Math.round(((pkg.capacity.confirmed + pkg.capacity.reserved) / Math.max(1, pkg.capacity.maximum)) * 100));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <header className="relative overflow-hidden flex flex-col gap-5 rounded-3xl bg-[#071b33] p-7 text-white lg:flex-row lg:items-end lg:justify-between shadow-xl">
        {pkg.images && pkg.images.length > 0 && packageImageUrl(pkg.images[0]) && (
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <img src={packageImageUrl(pkg.images[0])!} alt={pkg.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#071b33] via-[#071b33]/90 to-transparent" />
          </div>
        )}
        <div className="relative z-10 space-y-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
          ← Back to Tours
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              {pkg.tour_code}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
              {pkg.status}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black">{pkg.name}</h1>
          <p className="text-sm text-slate-300 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-amber-400" /> {pkg.school_name} ({pkg.grade_level || 'All Grades'})</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-blue-400" /> {new Date(pkg.starts_at).toLocaleDateString()}</span>
          </p>
          <p className="max-w-2xl text-xs leading-5 text-blue-100">
            Add each student, then use Record Payment in the roster to complete desk checkout.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleExportRoster}
            disabled={isExportingExcel || bookings.length === 0}
            className="!border !border-white/20 !bg-white/10 !text-white hover:!bg-white/20 text-xs font-bold"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Roster
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelectedExcelFile(null);
              setParsedExcelResult(null);
              setBulkUploadModalOpen(true);
            }}
            disabled={pkg.capacity.available <= 0}
            className="!border !border-white/20 !bg-white/10 !text-white hover:!bg-white/20 text-xs font-bold"
          >
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>

          <Button
            type="button"
            onClick={() => {
              setParticipantForm({ ...initialParticipantForm, grade_level: pkg.grade_level || '' });
              setParticipantModalOpen(true);
            }}
            disabled={pkg.capacity.available <= 0}
            className="!bg-blue-600 !text-white hover:!bg-blue-500 text-xs font-black uppercase tracking-wider"
          >
            <UserPlus className="h-4 w-4" /> {pkg.capacity.available > 0 ? 'Add Participant' : 'Tour Full'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => manifestMutation.mutate()}
            disabled={manifestMutation.isPending}
            className="!border !border-white/20 !bg-white/10 !text-white hover:!bg-white/20 text-xs font-bold"
          >
            {manifestMutation.isPending
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Printer className="h-4 w-4" />}
            PDF Manifest
          </Button>
        </div>
      </header>

      {/* Metric Cards Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Card 1: Capacity */}
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">Participant Capacity</span>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">{pkg.capacity.confirmed}</span>
            <span className="text-xs font-bold text-muted">/ {pkg.capacity.maximum} Confirmed</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
              {pkg.capacity.students_count ?? bookings.filter(b => !['adult', 'companion', 'guardian', 'teacher'].includes(String(b.participant_type).toLowerCase())).length} Students
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              {pkg.capacity.adults_count ?? bookings.filter(b => ['adult', 'companion', 'guardian', 'teacher'].includes(String(b.participant_type).toLowerCase())).length} Adults
            </span>
          </div>
          {pkg.capacity.reserved > 0 && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              +{pkg.capacity.reserved} Pending Payment Holds
            </p>
          )}
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${capacityPct}%` }} />
          </div>
          <div className="flex flex-wrap justify-between gap-1 text-[11px] font-bold text-muted">
            <span>{pkg.capacity.available} Slots Left</span>
            <span>Student: ₱{pkg.pricing.rate_per_head.toLocaleString()} | Adult: ₱{(pkg.pricing.adult_rate_per_head ?? pkg.pricing.rate_per_head).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Financials */}
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">Participant Payments</span>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">₱{pkg.sales.collected.toLocaleString()}</span>
            <span className="text-xs font-bold text-muted">Collected</span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-muted">
            <span>Gross Billed: ₱{pkg.sales.gross_billed.toLocaleString()}</span>
            <span className="text-amber-600 font-bold">Bal: ₱{pkg.sales.outstanding.toLocaleString()}</span>
          </div>
          <div className="pt-1 text-[11px] font-bold text-muted">
            {pkg.sales.booking_count} Participant Invoices
          </div>
        </div>

        {/* Card 3: Fleet & Bus Occupancy */}
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">Fleet Occupancy</span>
            <Bus className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">{pkg.fleet.allocated_participants}</span>
            <span className="text-xs font-bold text-muted">/ {pkg.fleet.planned_bus_capacity} Seats Occupied</span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-muted">
            <span>{pkg.fleet.assignments_count} Assigned Buses</span>
            {pkg.fleet.waiting_for_allocation > 0 ? (
              <span className="text-rose-500 font-bold">{pkg.fleet.waiting_for_allocation} Waiting Seat</span>
            ) : (
              <span className="text-emerald-600 font-bold">All Seated</span>
            )}
          </div>
          <Button
            type="button"
            onClick={() => allocateBusesMutation.mutate()}
            disabled={allocateBusesMutation.isPending}
            className="w-full !bg-amber-500 !text-white text-xs font-black uppercase tracking-wider"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${allocateBusesMutation.isPending ? 'animate-spin' : ''}`} /> Auto-Assign Seats
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition ${
            activeTab === 'roster'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Participant Roster ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fleet')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition ${
            activeTab === 'fleet'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Assigned Buses & Drivers ({pkg.bus_assignments?.length || 0})
        </button>
      </div>

      {/* Tab 1: Participant Roster */}
      {activeTab === 'roster' && (
        <section className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search student, reference, section/branch..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-xs font-bold text-ink"
                />
              </label>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
              >
                <option value="all">All Booking Statuses</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-muted mr-2">
                {bookings.length} of {pkg.capacity.maximum} pax
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportRoster}
                disabled={isExportingExcel || bookings.length === 0}
                className="text-xs font-black uppercase tracking-wider"
              >
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBulkUploadModalOpen(true)}
                disabled={pkg.capacity.available <= 0}
                className="text-xs font-black uppercase tracking-wider"
              >
                <Upload className="h-4 w-4" /> Bulk Import
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setParticipantForm({ ...initialParticipantForm, grade_level: pkg.grade_level || '' });
                  setParticipantModalOpen(true);
                }}
                disabled={pkg.capacity.available <= 0}
                className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider"
              >
                <UserPlus className="h-4 w-4" /> Add Participant
              </Button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[1380px] text-left text-xs">
              <thead className="border-b border-border bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Participant Name</th>
                  <th className="py-3 px-4">Grade & Section / Branch</th>
                  <th className="py-3 px-4">Billing & Paid</th>
                  <th className="py-3 px-4">Bus & Seat</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="w-[34rem] min-w-[34rem] py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold text-ink">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted">
                      {bookings.length === 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <span>No participants have been added at the desk yet.</span>
                          <Button
                            type="button"
                            onClick={() => {
                              setParticipantForm({ ...initialParticipantForm, grade_level: pkg.grade_level || '' });
                              setParticipantModalOpen(true);
                            }}
                            disabled={pkg.capacity.available <= 0}
                            className="!bg-blue-600 !text-white text-xs font-black"
                          >
                            <UserPlus className="h-4 w-4" /> Add First Participant
                          </Button>
                        </div>
                      ) : 'No participant bookings match the current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const isAdult = ['adult', 'companion', 'guardian', 'teacher'].includes(String(b.participant_type).toLowerCase());
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {b.reference}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isAdult
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {isAdult ? 'Adult / Companion' : 'Student'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold">{b.participant_first_name} {b.participant_last_name}</div>
                          {b.student_number && <div className="text-[10px] text-muted">ID: {b.student_number}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div>{isAdult ? 'Non-Student' : (b.grade_level || 'Grade 10')}</div>
                          <div className="text-[10px] text-muted">{b.section || (isAdult ? 'Non-Student' : 'General')}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>₱{(b.invoice?.amount_received || 0).toLocaleString()} / ₱{b.amount_due.toLocaleString()}</div>
                          <div className="text-[10px] capitalize text-muted">{b.payment_status} ({b.payment_plan})</div>
                        </td>
                        <td className="py-3 px-4">
                          {b.bus_assignment_id ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                              <Bus className="h-3 w-3" /> Bus #{b.bus_assignment?.sequence_number || 1} · {b.seat_number || 'General'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                              <Clock className="h-3 w-3" /> Queued
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            b.status === 'partially_paid' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            b.status === 'cancelled' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="w-[34rem] min-w-[34rem] py-3 px-4 align-middle">
                          <div className="grid grid-cols-[5rem_4rem_4.5rem_7.5rem_5.5rem_4.5rem] items-center justify-end gap-1.5">
                          <div>
                            {b.invoice && (
                              <button
                                type="button"
                                onClick={() => participantDocumentMutation.mutate({ booking: b, type: 'invoice' })}
                                disabled={participantDocumentMutation.isPending}
                                className={`${rosterActionButtonBase} ${rosterActionButtonTone.invoice}`}
                                aria-label={`Download invoice ${b.invoice.invoice_number}`}
                                title="Download invoice"
                              >
                                <FileText className="h-3 w-3" /> Invoice
                              </button>
                            )}
                          </div>
                          <div>
                            {b.invoice && (
                              <button
                                type="button"
                                onClick={() => participantDocumentMutation.mutate({ booking: b, type: 'statement' })}
                                disabled={participantDocumentMutation.isPending}
                                className={`${rosterActionButtonBase} ${rosterActionButtonTone.statement}`}
                                aria-label={`Download statement for ${b.invoice.invoice_number}`}
                                title="Download statement of account"
                              >
                                <Download className="h-3 w-3" /> SOA
                              </button>
                            )}
                          </div>
                          <div>
                            {b.invoice && (
                              <button
                                type="button"
                                onClick={() => {
                                  const savedEmail = b.guardian_email || b.participant_email;
                                  const email = savedEmail || window.prompt('Enter the guardian or participant email for these invoice documents:')?.trim();
                                  if (!email) {
                                    if (!savedEmail) toast.error('An email address is required to send invoice documents.');
                                    return;
                                  }
                                  emailDocumentsMutation.mutate({ bookingId: b.id, email });
                                }}
                                disabled={emailDocumentsMutation.isPending}
                                className={`${rosterActionButtonBase} ${rosterActionButtonTone.email}`}
                                aria-label={`Email documents for ${b.invoice.invoice_number}`}
                                title="Email invoice documents"
                              >
                                <Mail className="h-3 w-3" /> Email
                              </button>
                            )}
                          </div>
                          <div>
                            {b.status !== 'cancelled' && (b.invoice?.balance ?? b.amount_due) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const balance = b.invoice?.balance ?? b.amount_due;
                                    const isFirstPayment = (b.invoice?.amount_received ?? 0) <= 0;
                                    const isDownPayment = isFirstPayment && b.payment_plan === 'down_payment';
                                    const isInstallment = isFirstPayment && b.payment_plan === 'installment';
                                    const defaultAmount = isDownPayment && pkg.pricing.down_payment_amount
                                      ? Math.min(pkg.pricing.down_payment_amount, balance)
                                      : isInstallment && pkg.pricing.installment_count
                                        ? Math.ceil((balance / pkg.pricing.installment_count) * 100) / 100
                                        : balance;

                                    setSelectedBookingForPayment(b);
                                    setPaymentForm({
                                      payment_kind: isDownPayment ? 'down_payment' : isInstallment ? 'installment' : isFirstPayment ? 'full' : 'balance',
                                      payment_method: 'Cash',
                                      amount: String(defaultAmount),
                                      notes: '',
                                      idempotency_key: generateUUID(),
                                    });
                                  }}
                                  className={`${rosterActionButtonBase} ${rosterActionButtonTone.payment}`}
                                  title="Record participant payment"
                                >
                                  Record Payment
                                </button>
                            )}
                          </div>
                          <div>
                            {b.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBookingForMove(b);
                                  setSeatSelectorModalOpen(true);
                                }}
                                className={`${rosterActionButtonBase} ${rosterActionButtonTone.seat}`}
                                title="Move participant to another seat"
                              >
                                Move Seat
                              </button>
                            )}
                          </div>
                          <div>
                            {b.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Cancel participant registration for ${b.participant_first_name} ${b.participant_last_name}?`)) {
                                    cancelBookingMutation.mutate(b.id);
                                  }
                                }}
                                className={`${rosterActionButtonBase} ${rosterActionButtonTone.cancel}`}
                                title="Cancel participant registration"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          </div>
                        </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 2: Fleet & Assigned Buses */}
      {activeTab === 'fleet' && (
        <section className="rounded-3xl border border-border bg-surface shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-ink">Assigned Tour Buses & Drivers</h3>
              <p className="text-xs text-muted">Manage fleet coaches, driver assignments, and seat layouts for this tour.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBusSeatModalOpen(true)}
                className="text-xs font-black uppercase tracking-wider"
              >
                <SlidersHorizontal className="h-4 w-4" /> Visual Fleet & Seat Allocator
              </Button>
              <Button
                type="button"
                onClick={() => setAddBusModalOpen(true)}
                className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider"
              >
                <Plus className="h-4 w-4" /> Add Vehicle Assignment
              </Button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(pkg.bus_assignments || []).map((bus) => (
              <div key={bus.id} className="rounded-2xl border border-border bg-surface-alt p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">
                    Bus #{bus.sequence_number}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {bus.occupied} / {bus.capacity} Seats
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-black text-ink">{bus.bus_plate || 'Bus Plate TBD'}</h4>
                  <p className="text-xs text-muted">{bus.bus_model || 'Coach'} · Driver: {bus.driver_name || 'Unassigned'}</p>
                </div>

                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (bus.occupied / Math.max(1, bus.capacity)) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-muted pt-2 border-t border-border">
                  <span>{bus.available} Seats Free</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBusAssignment(bus);
                        setEditBusForm({
                          bus_id: String(bus.bus_id || ''),
                          driver_id: String(bus.driver_id || ''),
                        });
                      }}
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove Bus #${bus.sequence_number} (${bus.bus_plate}) from this package?`)) {
                          educationalTourApi.removeBus(pkg.id, bus.id).then(() => {
                            toast.success('Bus removed from package.');
                            queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
                            queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
                          });
                        }
                      }}
                      className="text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Staff Participant Booking Modal */}
      {participantModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!registerParticipantMutation.isPending) {
              setParticipantModalOpen(false);
            }
          }}
          title="Add Participant at Desk"
          size="lg"
        >
          <form
            className="space-y-5 p-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!participantForm.first_name.trim() || !participantForm.last_name.trim()) {
                toast.error('Enter the participant first and last name.');
                return;
              }
              registerParticipantMutation.mutate();
            }}
          >
            {(() => {
              const isAdult = participantForm.participant_type === 'adult';
              const applicableRate = isAdult ? (pkg.pricing.adult_rate_per_head ?? pkg.pricing.rate_per_head) : pkg.pricing.rate_per_head;
              return (
                <div className={`rounded-2xl p-4 text-xs leading-5 border ${
                  isAdult
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/50'
                    : 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/50'
                }`}>
                  Staff will create one booking reference and one individual invoice for this <strong>{isAdult ? 'Adult / Companion' : 'Student / Child'}</strong> at the package rate of <strong>₱{applicableRate.toLocaleString()}</strong>.
                </div>
              );
            })()}

            <fieldset className="space-y-3">
              <legend className="text-sm font-black text-ink">Passenger Classification</legend>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setParticipantForm(c => ({ ...c, participant_type: 'student' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition ${
                    participantForm.participant_type === 'student'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
                      : 'border-border bg-surface text-muted hover:bg-surface-alt'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  Student / Child (₱{pkg.pricing.rate_per_head.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantForm(c => ({ ...c, participant_type: 'adult' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition ${
                    participantForm.participant_type === 'adult'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-sm'
                      : 'border-border bg-surface text-muted hover:bg-surface-alt'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Adult / Companion (₱{(pkg.pricing.adult_rate_per_head ?? pkg.pricing.rate_per_head).toLocaleString()})
                </button>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-black text-ink">Participant details</legend>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs font-bold text-muted">
                  First Name *
                  <input
                    required
                    autoFocus
                    value={participantForm.first_name}
                    onChange={event => setParticipantForm(current => ({ ...current, first_name: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Middle Name
                  <input
                    value={participantForm.middle_name}
                    onChange={event => setParticipantForm(current => ({ ...current, middle_name: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Last Name *
                  <input
                    required
                    value={participantForm.last_name}
                    onChange={event => setParticipantForm(current => ({ ...current, last_name: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  {participantForm.participant_type === 'adult' ? 'Role / Faculty ID (Optional)' : 'Student ID'}
                  <input
                    placeholder={participantForm.participant_type === 'adult' ? 'Optional for Adults' : ''}
                    value={participantForm.student_number}
                    onChange={event => setParticipantForm(current => ({ ...current, student_number: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  {participantForm.participant_type === 'adult' ? 'Classification' : 'Grade Level'}
                  <input
                    placeholder={participantForm.participant_type === 'adult' ? 'Adult Companion' : ''}
                    value={participantForm.grade_level}
                    onChange={event => setParticipantForm(current => ({ ...current, grade_level: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Section / Branch
                  <input
                    placeholder={participantForm.participant_type === 'adult' ? 'e.g. Fairview Branch' : 'e.g. Daisy / Fairview Branch'}
                    value={participantForm.section}
                    onChange={event => setParticipantForm(current => ({ ...current, section: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Participant Email
                  <input
                    type="email"
                    value={participantForm.email}
                    onChange={event => setParticipantForm(current => ({ ...current, email: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Participant Phone
                  <input
                    type="tel"
                    value={participantForm.phone}
                    onChange={event => setParticipantForm(current => ({ ...current, phone: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Payment Plan
                  <select
                    value={participantForm.payment_plan}
                    onChange={event => setParticipantForm(current => ({ ...current, payment_plan: event.target.value as typeof current.payment_plan }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  >
                    <option value="full">Full Payment</option>
                    {pkg.pricing.payment_policy !== 'full_only' && <option value="down_payment">Down Payment</option>}
                    {['installment', 'flexible'].includes(pkg.pricing.payment_policy) && <option value="installment">Installment</option>}
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-black text-ink">Guardian or contact person</legend>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs font-bold text-muted">
                  Full Name
                  <input
                    value={participantForm.guardian_name}
                    onChange={event => setParticipantForm(current => ({ ...current, guardian_name: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Email
                  <input
                    type="email"
                    value={participantForm.guardian_email}
                    onChange={event => setParticipantForm(current => ({ ...current, guardian_email: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
                <label className="text-xs font-bold text-muted">
                  Phone
                  <input
                    type="tel"
                    value={participantForm.guardian_phone}
                    onChange={event => setParticipantForm(current => ({ ...current, guardian_phone: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                  />
                </label>
              </div>
            </fieldset>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-muted">
                Dietary Restrictions
                <textarea
                  rows={3}
                  value={participantForm.dietary_restrictions}
                  onChange={event => setParticipantForm(current => ({ ...current, dietary_restrictions: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-ink"
                />
              </label>
              <label className="text-xs font-bold text-muted">
                Medical or Accessibility Notes
                <textarea
                  rows={3}
                  value={participantForm.medical_or_accessibility_notes}
                  onChange={event => setParticipantForm(current => ({ ...current, medical_or_accessibility_notes: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-ink"
                />
              </label>
            </div>

            {/* Bus Coach & Seat Allocation */}
            <fieldset className="space-y-3 rounded-2xl border border-border bg-surface-alt/40 p-4">
              <div>
                <legend className="text-sm font-black text-ink">Bus Coach & Seat Allocation</legend>
                <p className="text-xs text-muted">Choose whether to manually pick a specific seat on the coach floorplan or use sequential auto-allocation.</p>
              </div>

              {/* Allocation Mode Segmented Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setParticipantForm(c => ({ ...c, allocation_mode: 'automatic', bus_assignment_id: '', seat_number: '' }))}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all border ${
                    participantForm.allocation_mode === 'automatic'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-border bg-surface text-muted hover:bg-surface-alt'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Assign Automatically
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParticipantForm(c => ({ ...c, allocation_mode: 'manual' }));
                    if (!participantForm.seat_number && pkg?.bus_assignments && pkg.bus_assignments.length > 0) {
                      setSeatSelectionMode('add_participant');
                      setSelectedBookingForMove(null);
                      setParticipantModalOpen(false);
                      setSeatSelectorModalOpen(true);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all border ${
                    participantForm.allocation_mode === 'manual'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-border bg-surface text-muted hover:bg-surface-alt'
                  }`}
                >
                  <Bus className="h-4 w-4" />
                  Select Bus & Seat
                </button>
              </div>

              {/* Automatic Mode Details */}
              {participantForm.allocation_mode === 'automatic' && (
                <div className="rounded-xl border border-border bg-surface/70 p-3 text-xs text-muted space-y-1">
                  {pkg?.bus_assignments && pkg.bus_assignments.length > 0 ? (
                    <p className="flex items-center gap-1.5 text-ink font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>The system will automatically allocate the next available seat sequentially across assigned fleet coaches ({pkg.bus_assignments.length} coach(es) assigned).</span>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>No coaches currently assigned. This booking will be created in <strong>Pending Allocation</strong> status until coaches are added under Fleet Logistics.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Manual Mode Details */}
              {participantForm.allocation_mode === 'manual' && (
                <div className="space-y-3">
                  {(!pkg?.bus_assignments || pkg.bus_assignments.length === 0) ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                      <p className="flex items-center gap-2 font-bold mb-1">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        No Fleet Coaches Assigned
                      </p>
                      <span>Please assign at least one bus under the <strong>Fleet Logistics</strong> tab first before selecting specific seats manually, or switch to <strong>Assign Automatically</strong>.</span>
                    </div>
                  ) : participantForm.seat_number ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-900 dark:text-blue-200">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          <Bus className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-black text-ink text-sm">
                            {participantForm.seat_number}
                          </div>
                          <div className="text-[11px] text-muted font-semibold">
                            Coach: {pkg.bus_assignments.find(b => b.id === Number(participantForm.bus_assignment_id))?.bus_plate || `Bus #${pkg.bus_assignments.find(b => b.id === Number(participantForm.bus_assignment_id))?.sequence_number || 1}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSeatSelectionMode('add_participant');
                            setSelectedBookingForMove(null);
                            setParticipantModalOpen(false);
                            setSeatSelectorModalOpen(true);
                          }}
                          className="!bg-blue-600 hover:!bg-blue-700 !text-white text-xs font-bold"
                        >
                          Change Seat
                        </Button>
                        <button
                          type="button"
                          onClick={() => setParticipantForm(c => ({ ...c, bus_assignment_id: '', seat_number: '' }))}
                          className="text-xs text-rose-500 hover:underline font-bold px-2 py-1"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-border bg-surface text-xs">
                      <div className="text-muted font-medium">
                        No seat selected yet. Open the interactive bus floorplan to pick a seat.
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSeatSelectionMode('add_participant');
                          setSelectedBookingForMove(null);
                          setParticipantModalOpen(false);
                          setSeatSelectorModalOpen(true);
                        }}
                        className="!bg-blue-600 hover:!bg-blue-700 !text-white text-xs font-bold shrink-0"
                      >
                        <Bus className="h-3.5 w-3.5 mr-1" />
                        Choose Seat on Bus
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setParticipantModalOpen(false)}
                disabled={registerParticipantMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={registerParticipantMutation.isPending || pkg.capacity.available <= 0}
                className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider"
              >
                <UserPlus className="h-4 w-4" />
                {registerParticipantMutation.isPending ? 'Creating Booking...' : 'Create Individual Booking'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {selectedBookingForPayment && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBookingForPayment(null)}
          title={`Record Payment · ${selectedBookingForPayment.participant_first_name} ${selectedBookingForPayment.participant_last_name}`}
        >
          <div className="space-y-4 p-2">
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Booking Reference:</span>
                <strong className="text-ink font-mono">{selectedBookingForPayment.reference}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Invoice Total:</span>
                <strong className="text-ink">₱{selectedBookingForPayment.amount_due.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-amber-600 font-bold">
                <span>Remaining Balance:</span>
                <span>₱{(selectedBookingForPayment.invoice?.balance ?? selectedBookingForPayment.amount_due).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="text-xs font-bold text-muted">
                Payment Type
                <select
                  value={paymentForm.payment_kind}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_kind: e.target.value as any })}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                >
                  <option value="down_payment">Down Payment</option>
                  <option value="installment">Installment</option>
                  <option value="balance">Remaining Balance</option>
                  <option value="full">Full Payment</option>
                </select>
              </label>

              <label className="text-xs font-bold text-muted">
                Payment Method
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Bank Transfer">Bank Transfer / Deposit</option>
                  <option value="GCash">GCash</option>
                  <option value="Cheque">School Cheque</option>
                </select>
              </label>

              <label className="text-xs font-bold text-muted">
                Amount Received (₱) *
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                />
              </label>

              <label className="text-xs font-bold text-muted">
                Official Receipt / Notes
                <input
                  type="text"
                  placeholder="e.g. Official receipt OR-90412"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setSelectedBookingForPayment(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
                    toast.error('Enter a valid payment amount.');
                    return;
                  }
                  recordPaymentMutation.mutate({
                    bookingId: selectedBookingForPayment.id,
                    payload: {
                      payment_kind: paymentForm.payment_kind,
                      payment_method: paymentForm.payment_method,
                      amount: Number(paymentForm.amount),
                      notes: paymentForm.notes,
                      idempotency_key: paymentForm.idempotency_key,
                    },
                  });
                }}
                disabled={recordPaymentMutation.isPending}
                className="!bg-emerald-600 !text-white text-xs font-black uppercase tracking-wider"
              >
                Record Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cross-Sales Universal Seat Selector for Moving Seats & Desk Registrations */}
      <SeatSelectorModal
        isOpen={seatSelectorModalOpen}
        onClose={() => {
          setSeatSelectorModalOpen(false);
          if (seatSelectionMode === 'add_participant') {
            setParticipantModalOpen(true);
          }
          setSelectedBookingForMove(null);
        }}
        onConfirm={handleSeatConfirm}
        buses={busesForSeatSelector}
        initialBusId={
          seatSelectionMode === 'add_participant'
            ? (Number(participantForm.bus_assignment_id) || busesForSeatSelector[0]?.id)
            : (selectedBookingForMove?.bus_assignment?.bus_id ||
               selectedBookingForMove?.bus_assignment_id ||
               busesForSeatSelector[0]?.id)
        }
        initialMode="selected_seats"
        initialSeats={
          seatSelectionMode === 'add_participant'
            ? (participantForm.seat_number ? [participantForm.seat_number.replace(/^Seat\s*/i, '')] : [])
            : (selectedBookingForMove?.seat_number
                ? [selectedBookingForMove.seat_number.replace(/^Seat\s*/i, '')]
                : [])
        }
        travelDate={pkg?.starts_at ? pkg.starts_at.slice(0, 10) : undefined}
        returnDate={pkg?.ends_at ? pkg.ends_at.slice(0, 10) : undefined}
        paxCount={1}
        packageName={pkg?.name || 'Educational Tour Package'}
        allowWholeVehicle={false}
      />

      {/* Add Bus Assignment Modal */}
      {addBusModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setAddBusModalOpen(false)}
          title="Add Vehicle to Package Fleet"
        >
          <div className="space-y-4 p-2">
            <label className="text-xs font-bold text-muted">
              Select Bus Coach *
              <select
                value={addBusForm.bus_id}
                onChange={e => setAddBusForm({ ...addBusForm, bus_id: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
              >
                <option value="">-- Choose Available Bus --</option>
                {(resources?.buses || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.plate_number} ({b.model}) - {b.seating_capacity} seats
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-muted">
              Assign Active Driver
              <select
                value={addBusForm.driver_id}
                onChange={e => setAddBusForm({ ...addBusForm, driver_id: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
              >
                <option value="">-- Assign Driver Later --</option>
                {(resources?.drivers || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setAddBusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!addBusForm.bus_id) {
                    toast.error('Please choose a bus unit.');
                    return;
                  }
                  assignBusMutation.mutate();
                }}
                disabled={assignBusMutation.isPending}
                className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider"
              >
                Add Bus Assignment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Bus Assignment Modal */}
      {editingBusAssignment && (
        <Modal
          isOpen={true}
          onClose={() => setEditingBusAssignment(null)}
          title={`Edit Bus #${editingBusAssignment.sequence_number} Allocation`}
        >
          <div className="space-y-4 p-2">
            <label className="text-xs font-bold text-muted">
              Select Bus Coach *
              <select
                value={editBusForm.bus_id}
                onChange={e => setEditBusForm({ ...editBusForm, bus_id: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
              >
                {(resources?.buses || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.plate_number} ({b.model}) - {b.seating_capacity} seats {!b.available && Number(b.id) !== Number(editingBusAssignment.bus_id) ? '· In Use' : ''}
                  </option>
                ))}
                {editingBusAssignment.bus_id && !(resources?.buses || []).some(b => Number(b.id) === Number(editingBusAssignment.bus_id)) && (
                  <option value={editingBusAssignment.bus_id}>
                    {editingBusAssignment.bus_plate || `Bus #${editingBusAssignment.bus_id}`} ({editingBusAssignment.capacity || 49} seats)
                  </option>
                )}
              </select>
            </label>

            <label className="text-xs font-bold text-muted">
              Assign Active Driver
              <select
                value={editBusForm.driver_id}
                onChange={e => setEditBusForm({ ...editBusForm, driver_id: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-bold text-ink"
              >
                <option value="">-- Unassigned Driver --</option>
                {(resources?.drivers || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name} {!d.available && Number(d.id) !== Number(editingBusAssignment.driver_id) ? '· In Use' : ''}
                  </option>
                ))}
                {editingBusAssignment.driver_id && !(resources?.drivers || []).some(d => Number(d.id) === Number(editingBusAssignment.driver_id)) && (
                  <option value={editingBusAssignment.driver_id}>
                    {editingBusAssignment.driver_name || `Driver #${editingBusAssignment.driver_id}`}
                  </option>
                )}
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => setEditingBusAssignment(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!editBusForm.bus_id) {
                    toast.error('Please choose a bus unit.');
                    return;
                  }
                  updateBusAssignmentMutation.mutate({
                    assignmentId: editingBusAssignment.id,
                    bus_id: Number(editBusForm.bus_id),
                    driver_id: editBusForm.driver_id ? Number(editBusForm.driver_id) : null,
                  });
                }}
                disabled={updateBusAssignmentMutation.isPending}
                className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider"
              >
                {updateBusAssignmentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Bus Seat Allocation Modal */}
      {busSeatModalOpen && (
        <BusSeatAllocationModal
          isOpen={busSeatModalOpen}
          onClose={() => setBusSeatModalOpen(false)}
          requiredCapacity={pkg?.capacity?.maximum || 49}
          passengers={bookings.map((b, idx) => ({
            id: b.id || idx,
            first_name: b.participant_first_name || 'Participant',
            last_name: b.participant_last_name || `#${idx + 1}`,
            role: b.participant_type === 'adult' ? 'adult' : 'student',
            seat_code: b.seat_number ? b.seat_number.replace(/^(?:Seat|S)\s*/i, '') : undefined,
            bus_index: b.bus_assignment_id
              ? (pkg?.bus_assignments || []).findIndex(a => Number(a.id) === Number(b.bus_assignment_id))
              : undefined,
          }))}
          initialAllocations={(pkg?.bus_assignments || []).map((b, idx) => ({
            bus_id: b.bus_id,
            driver_id: b.driver_id,
            driver_name: b.driver_name,
            plate_number: b.bus_plate,
            model: b.bus_model,
            seating_capacity: b.capacity,
            total_seats: b.capacity,
            sequence_number: b.sequence_number || (idx + 1),
            assignment_id: b.id,
            seat_assignments: {},
          }))}
          availableDrivers={resources?.drivers || []}
          onSaveAllocations={(allocs: AllocatedBus[]) => {
            educationalTourApi.updatePackage(packageId, {
              bus_assignments: allocs.map((b, idx) => ({
                id: b.assignment_id,
                bus_id: Number(b.bus_id),
                driver_id: b.driver_id ? Number(b.driver_id) : null,
                sequence_number: idx + 1,
              })),
            }).then(() => {
              toast.success(`Updated ${allocs.length} bus assignment(s).`);
              queryClient.invalidateQueries({ queryKey: ['educational-package', packageId] });
              queryClient.invalidateQueries({ queryKey: ['educational-tour-packages'] });
              setBusSeatModalOpen(false);
            }).catch((err: any) => {
              toast.error(err?.response?.data?.message || 'Could not update fleet assignments.');
            });
          }}
        />
      )}

      {/* Bulk Upload Participants Modal */}
      {bulkUploadModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!bulkRegisterMutation.isPending) {
              setBulkUploadModalOpen(false);
              setSelectedExcelFile(null);
              setParsedExcelResult(null);
            }
          }}
          title={`Bulk Upload Participants · ${pkg.name}`}
          size="lg"
        >
          <div className="space-y-5 p-2">
            {/* Guide & Template Download Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950 dark:text-blue-200">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Official Student Roster Template
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                  Download our formatted template with columns for student details, guardian info, payment plan, and seat assignment.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => downloadEducationalRosterTemplate(pkg)}
                className="shrink-0 text-xs font-bold bg-white dark:bg-slate-800 shadow-sm"
              >
                <Download className="h-3.5 w-3.5 mr-1" /> Download Template
              </Button>
            </div>

            {/* File Upload Dropzone */}
            {!selectedExcelFile ? (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-3xl hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition cursor-pointer text-center group">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelFileSelect}
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-sm font-black text-ink">Choose Excel File or Drag & Drop</span>
                <span className="text-xs text-muted mt-1">Supports .xlsx and .xls spreadsheets</span>
              </label>
            ) : (
              <div className="space-y-4">
                {/* Selected File Summary Bar */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-surface text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-ink">{selectedExcelFile.name}</span>
                      <span className="text-muted ml-2 text-[11px]">
                        ({(selectedExcelFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedExcelFile(null);
                      setParsedExcelResult(null);
                    }}
                    disabled={bulkRegisterMutation.isPending}
                    className="text-xs text-rose-600 hover:text-rose-700"
                  >
                    Change File
                  </Button>
                </div>

                {isParsingExcel && (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-muted">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    Parsing and validating spreadsheet rows...
                  </div>
                )}

                {parsedExcelResult && !isParsingExcel && (
                  <>
                    {/* Status Statistics Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 text-center">
                        <span className="text-[10px] font-black uppercase text-muted">Total Rows</span>
                        <div className="text-lg font-black text-ink">{parsedExcelResult.totalRows}</div>
                      </div>
                      <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
                        <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">Valid to Import</span>
                        <div className="text-lg font-black text-emerald-600">{parsedExcelResult.validParticipants.length}</div>
                      </div>
                      <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-center">
                        <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300">Errors / Incomplete</span>
                        <div className="text-lg font-black text-rose-600">{parsedExcelResult.errorCount}</div>
                      </div>
                    </div>

                    {/* Error Notice */}
                    {parsedExcelResult.errorCount > 0 && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          Some rows could not be parsed:
                        </div>
                        <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                          {parsedExcelResult.rows
                            .filter(r => r.errors.length > 0)
                            .slice(0, 5)
                            .map((r, i) => (
                              <li key={i}>
                                Row {r.rowNumber}: {r.errors.join(', ')}
                              </li>
                            ))}
                          {parsedExcelResult.rows.filter(r => r.errors.length > 0).length > 5 && (
                            <li>...and {parsedExcelResult.rows.filter(r => r.errors.length > 0).length - 5} more row(s)</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="rounded-2xl border border-border overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/70 border-b border-border flex items-center justify-between text-[11px] font-bold text-muted">
                        <span>Participants Preview</span>
                        <span>Showing up to 50 rows</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-surface text-[10px] font-black uppercase tracking-wider text-muted border-b border-border sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Row</th>
                              <th className="py-2 px-3">Student Name</th>
                              <th className="py-2 px-3">ID #</th>
                              <th className="py-2 px-3">Grade & Section / Branch</th>
                              <th className="py-2 px-3">Guardian</th>
                              <th className="py-2 px-3">Payment</th>
                              <th className="py-2 px-3">Seat</th>
                              <th className="py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {parsedExcelResult.rows.slice(0, 50).map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                <td className="py-2 px-3 text-muted font-mono">{r.rowNumber}</td>
                                <td className="py-2 px-3 font-bold text-ink">{r.displayName}</td>
                                <td className="py-2 px-3 text-muted">{r.studentNumber}</td>
                                <td className="py-2 px-3 text-muted">{r.gradeAndSection}</td>
                                <td className="py-2 px-3 text-muted">{r.guardianName}</td>
                                <td className="py-2 px-3 capitalize font-semibold">{r.paymentPlan.replace('_', ' ')}</td>
                                <td className="py-2 px-3 text-blue-600 dark:text-blue-400 font-bold">{r.seatInfo}</td>
                                <td className="py-2 px-3">
                                  {r.errors.length === 0 ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                                      <XCircle className="h-3.5 w-3.5" /> Invalid
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setBulkUploadModalOpen(false);
                  setSelectedExcelFile(null);
                  setParsedExcelResult(null);
                }}
                disabled={bulkRegisterMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!parsedExcelResult || parsedExcelResult.validParticipants.length === 0) {
                    toast.error('No valid participants to import.');
                    return;
                  }
                  bulkRegisterMutation.mutate(parsedExcelResult.validParticipants);
                }}
                disabled={
                  !parsedExcelResult ||
                  parsedExcelResult.validParticipants.length === 0 ||
                  bulkRegisterMutation.isPending
                }
                className="!bg-blue-600 !text-white text-xs font-black uppercase tracking-wider shadow-md"
              >
                {bulkRegisterMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    Registering Participants...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Import {parsedExcelResult?.validParticipants.length || 0} Participant(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LuArrowLeft,
  LuArrowRight,
  LuBadgeCheck,
  LuCalendarCheck,
  LuCircleAlert,
  LuFileCheck,
  LuLoaderCircle,
  LuLock,
  LuMapPin,
  LuRefreshCcw,
  LuShieldCheck,
  LuWallet,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { passportingApi } from '../../../api/passporting';
import { formatMoneyInput, parseMoneyInput } from '../../../utils';
import {
  toIsoDateTime,
  type PreparedServiceLine,
  type ServiceWorkflowProps,
} from './workflowTypes';

type PassportApplicationType = 'new' | 'renewal' | 'lost' | 'damaged' | 'correction';

interface TravelCaseCustomer {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface PassportTravelCase {
  id: number;
  case_type: 'visa' | 'passport';
  status: string;
  reference_number?: string | null;
  checklist?: Record<string, boolean> | null;
  release_date?: string | null;
  customer?: TravelCaseCustomer | null;
  passenger?: {
    full_name?: string | null;
    passport_no?: string | null;
  } | null;
  is_billed?: boolean;
  billed_invoice_id?: number | null;
}

interface RequirementSnapshot {
  name: string;
  required: boolean;
}

interface PassportAssistanceMetadata extends Record<string, unknown> {
  customer_id: number;
  passport_case_id: number;
  applicant_name: string;
  application_type: PassportApplicationType;
  appointment_at?: string;
  site?: string;
  target_release_date?: string;
  requirements_snapshot: RequirementSnapshot[];
}

const APPLICATION_TYPES: Array<{ value: PassportApplicationType; label: string; guidance: string }> = [
  { value: 'new', label: 'New passport', guidance: 'First-time application' },
  { value: 'renewal', label: 'Renewal', guidance: 'Expiring or expired passport' },
  { value: 'lost', label: 'Lost passport', guidance: 'Replacement with loss requirements' },
  { value: 'damaged', label: 'Damaged passport', guidance: 'Replacement of unusable passport' },
  { value: 'correction', label: 'Data correction', guidance: 'Correction of biographical details' },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400';

const displayName = (travelCase: PassportTravelCase): string => {
  const customer = travelCase.customer;
  return travelCase.passenger?.full_name?.trim()
    || customer?.full_name?.trim()
    || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ')
    || 'Unnamed applicant';
};

const customerName = (customer: TravelCaseCustomer): string => (
  customer.full_name?.trim()
  || [customer.first_name, customer.last_name].filter(Boolean).join(' ')
  || 'Unnamed customer'
);

const statusLabel = (status: string): string => status.replaceAll('_', ' ');

export default function PassportAssistanceWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const navigate = useNavigate();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [preparedCaseIds, setPreparedCaseIds] = useState<Set<number>>(() => new Set());
  const [applicationType, setApplicationType] = useState<PassportApplicationType>('new');
  const [appointmentAt, setAppointmentAt] = useState('');
  const [appointmentSite, setAppointmentSite] = useState('');
  const [targetReleaseDate, setTargetReleaseDate] = useState('');
  const [professionalFee, setProfessionalFee] = useState('');
  const [notes, setNotes] = useState('');
  const [requiresContract, setRequiresContract] = useState(false);

  const {
    data: queriedCases = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['passport-cases', 'sales-workflow', 'passport', 'unbilled'],
    queryFn: async () => {
      const response = await passportingApi.list({ case_type: 'passport', per_page: 100 });
      return (response.data?.data ?? []) as PassportTravelCase[];
    },
  });

  const availableCases = useMemo(() => queriedCases.filter((travelCase) => (
    travelCase.case_type === 'passport'
    && travelCase.is_billed !== true
    && !preparedCaseIds.has(travelCase.id)
  )), [preparedCaseIds, queriedCases]);

  const selectedCase = useMemo(
    () => availableCases.find((travelCase) => travelCase.id === selectedCaseId) ?? null,
    [availableCases, selectedCaseId],
  );

  useEffect(() => {
    if (selectedCaseId && !availableCases.some((travelCase) => travelCase.id === selectedCaseId)) {
      setSelectedCaseId(null);
    }
  }, [availableCases, selectedCaseId]);

  useEffect(() => {
    if (selectedCase?.release_date && !targetReleaseDate) {
      setTargetReleaseDate(selectedCase.release_date.slice(0, 10));
    }
  }, [selectedCase, targetReleaseDate]);

  const selectedApplication = APPLICATION_TYPES.find((item) => item.value === applicationType) ?? APPLICATION_TYPES[0];
  const completedRequirements = selectedCase
    ? Object.values(selectedCase.checklist ?? {}).filter(Boolean).length
    : 0;
  const requirementCount = selectedCase ? Object.keys(selectedCase.checklist ?? {}).length : 0;

  const addServiceLine = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCase) {
      toast.error('Select an unbilled passport case from Travel Assistance.');
      return;
    }
    if (!selectedCase.customer?.id) {
      toast.error('This case has no customer owner. Correct it in Travel Assistance before billing.');
      return;
    }
    if ((appointmentAt && !appointmentSite.trim()) || (!appointmentAt && appointmentSite.trim())) {
      toast.error('Enter both the DFA appointment and its site, or leave both blank.');
      return;
    }
    if (appointmentAt && targetReleaseDate && new Date(`${targetReleaseDate}T23:59:59`) < new Date(appointmentAt)) {
      toast.error('The target release date cannot be earlier than the DFA appointment.');
      return;
    }

    const fee = Number(parseMoneyInput(professionalFee));
    if (!Number.isFinite(fee) || fee <= 0) {
      toast.error('Enter a professional fee greater than zero.');
      return;
    }

    const applicantName = displayName(selectedCase);
    const requirementsSnapshot = Object.entries(selectedCase.checklist ?? {}).map(([name, required]) => ({
      name,
      required: Boolean(required),
    }));
    const metadata: PassportAssistanceMetadata = {
      customer_id: selectedCase.customer.id,
      passport_case_id: selectedCase.id,
      applicant_name: applicantName,
      application_type: applicationType,
      appointment_at: toIsoDateTime(appointmentAt),
      site: appointmentSite.trim() || undefined,
      target_release_date: targetReleaseDate || undefined,
      requirements_snapshot: requirementsSnapshot,
    };
    const summary = `${selectedApplication.label} assistance for ${applicantName}; linked to Travel case #${selectedCase.id}.`;
    const line: PreparedServiceLine = {
      title: `Passport assistance — ${applicantName}`,
      description: notes.trim() || summary,
      price: fee,
      serviceType: 'passport_assistance',
      metadata,
      travelCaseId: selectedCase.id,
      customerSnapshot: {
        id: selectedCase.customer.id,
        name: customerName(selectedCase.customer),
        email: selectedCase.customer.email,
        phone: selectedCase.customer.phone,
        address: selectedCase.customer.address,
      },
      customDetail: {
        category: 'Passport Assistance',
        passport_case_id: selectedCase.id,
        booking_type: 'Passport Assistance',
        booking_details: notes.trim() || undefined,
        category_meta: metadata,
        additional_remarks: notes.trim() || undefined,
      },
      requiresContract,
      serviceDate: toIsoDateTime(appointmentAt) || targetReleaseDate || undefined,
      destination: appointmentSite.trim() || undefined,
    };

    onAdd(line);
    setPreparedCaseIds((current) => new Set(current).add(selectedCase.id));
    setSelectedCaseId(null);
    setApplicationType('new');
    setAppointmentAt('');
    setAppointmentSite('');
    setTargetReleaseDate('');
    setProfessionalFee('');
    setNotes('');
    setRequiresContract(false);
    toast.success('Passport assistance added with its Travel case and customer ownership locked.');
  };

  return (
    <form onSubmit={addServiceLine} className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-500/15 dark:border-slate-700 dark:hover:bg-sky-950/40"
            aria-label="Back to service selection"
          >
            <LuArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
              <LuShieldCheck className="h-4 w-4" /> Travel-owned case
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Passport assistance billing brief</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Price the assistance around the existing applicant file while the Travel module remains the source of status and documents.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/travel/passporting')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-500/20 dark:bg-white dark:text-slate-950 dark:hover:bg-sky-200"
        >
          Manage passport cases <LuArrowRight className="h-4 w-4" />
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/55 dark:border-sky-900/70 dark:bg-sky-950/20">
        <div className="flex items-center justify-between gap-3 border-b border-sky-200 px-4 py-3 dark:border-sky-900/70">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-800 dark:text-sky-300">Passport case register</p>
            <p className="mt-0.5 text-xs text-sky-800/70 dark:text-sky-300/70">Select one applicant file; its customer becomes the fixed billing owner.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg p-2 text-sky-700 transition hover:bg-white/70 disabled:opacity-50 dark:text-sky-300 dark:hover:bg-sky-900/50"
            aria-label="Refresh passport cases"
          >
            <LuRefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm font-semibold text-sky-800 dark:text-sky-300">
            <LuLoaderCircle className="h-5 w-5 animate-spin" /> Loading passport cases…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-5 py-9 text-center">
            <LuCircleAlert className="h-6 w-6 text-rose-500" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">Passport cases could not be loaded.</p>
            <button type="button" onClick={() => refetch()} className="text-xs font-bold text-sky-700 underline underline-offset-4 dark:text-sky-300">Try again</button>
          </div>
        ) : availableCases.length === 0 ? (
          <div className="px-5 py-9 text-center">
            <LuFileCheck className="mx-auto h-7 w-7 text-sky-600" />
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No unbilled passport cases are ready.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open an applicant case in Travel Assistance or refresh after correcting its ownership.</p>
          </div>
        ) : (
          <div className="grid max-h-72 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
            {availableCases.map((travelCase) => {
              const selected = travelCase.id === selectedCaseId;
              return (
                <button
                  key={travelCase.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedCaseId(travelCase.id)}
                  className={`rounded-xl border p-3 text-left transition focus:outline-none focus:ring-4 focus:ring-sky-500/15 ${selected
                    ? 'border-sky-500 bg-white shadow-sm dark:bg-slate-950'
                    : 'border-sky-100 bg-white/70 hover:border-sky-300 hover:bg-white dark:border-sky-900/60 dark:bg-slate-950/45 dark:hover:border-sky-700'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950 dark:text-white">{displayName(travelCase)}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Case #{travelCase.id}{travelCase.reference_number ? ` · ${travelCase.reference_number}` : ''}</p>
                    </div>
                    {selected && <LuBadgeCheck className="h-5 w-5 shrink-0 text-sky-600" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-sky-100 px-2 py-1 capitalize text-sky-800 dark:bg-sky-950 dark:text-sky-300">{statusLabel(travelCase.status)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{Object.values(travelCase.checklist ?? {}).filter(Boolean).length}/{Object.keys(travelCase.checklist ?? {}).length} requirements</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedCase && selectedCase.customer && (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-sky-600" />
          <div className="grid gap-5 pl-2 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <LuLock className="h-4 w-4 text-sky-600" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-800 dark:text-sky-300">Customer inherited from Travel case</p>
              </div>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{customerName(selectedCase.customer)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedCase.customer.email || 'No email'} · {selectedCase.customer.phone || 'No phone'}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right text-xs">
              <div><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Applicant</span><strong className="text-slate-800 dark:text-slate-100">{displayName(selectedCase)}</strong></div>
              <div><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Checklist</span><strong className="text-slate-800 dark:text-slate-100">{completedRequirements}/{requirementCount}</strong></div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/65 p-5 dark:border-slate-800 dark:bg-slate-900/45">
        <div>
          <p className={labelClass}>Application type</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {APPLICATION_TYPES.map((item) => {
              const selected = applicationType === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setApplicationType(item.value)}
                  className={`rounded-xl border p-3 text-left transition focus:outline-none focus:ring-4 focus:ring-sky-500/15 ${selected
                    ? 'border-sky-500 bg-sky-600 text-white shadow-md shadow-sky-600/15'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}
                >
                  <span className="block text-xs font-black">{item.label}</span>
                  <span className={`mt-1 block text-[10px] leading-4 ${selected ? 'text-sky-100' : 'text-slate-400'}`}>{item.guidance}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="passport-appointment">DFA appointment <span className="normal-case tracking-normal text-slate-400">(optional)</span></label>
            <div className="relative">
              <LuCalendarCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600" />
              <input id="passport-appointment" type="datetime-local" className={`${inputClass} pl-10`} value={appointmentAt} onChange={(event) => setAppointmentAt(event.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="passport-site">DFA site <span className="normal-case tracking-normal text-slate-400">(paired with appointment)</span></label>
            <div className="relative">
              <LuMapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600" />
              <input id="passport-site" className={`${inputClass} pl-10`} value={appointmentSite} onChange={(event) => setAppointmentSite(event.target.value)} placeholder="e.g. DFA Aseana" />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="passport-release">Target release date <span className="normal-case tracking-normal text-slate-400">(optional)</span></label>
            <input id="passport-release" type="date" className={inputClass} value={targetReleaseDate} onChange={(event) => setTargetReleaseDate(event.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="passport-fee">Professional fee</label>
            <div className="relative">
              <LuWallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600" />
              <input id="passport-fee" inputMode="decimal" className={`${inputClass} pl-10`} value={professionalFee} onChange={(event) => setProfessionalFee(formatMoneyInput(event.target.value))} placeholder="0.00" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="passport-notes">Billing notes <span className="normal-case tracking-normal text-slate-400">(optional)</span></label>
            <textarea id="passport-notes" rows={3} className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Assistance scope, expedited handling, or fee inclusions." />
          </div>
          <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <input type="checkbox" checked={requiresContract} onChange={(event) => setRequiresContract(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">Require a signed service contract</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">Use when replacement complexity, expedited handling, or the agreed fee needs explicit customer acceptance.</span>
            </span>
          </label>
        </div>
      </section>

      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-300/30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-sky-700/20 transition hover:bg-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-500/25">
          Add passport assistance <LuArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </form>
  );
}

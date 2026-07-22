import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LuArrowLeft,
  LuArrowRight,
  LuBadgeCheck,
  LuCalendarDays,
  LuCircleAlert,
  LuFileCheck,
  LuLoaderCircle,
  LuLock,
  LuRefreshCcw,
  LuShieldCheck,
  LuUser,
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

interface TravelCaseCustomer {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface VisaTravelCase {
  id: number;
  case_type: 'visa' | 'passport';
  status: string;
  reference_number?: string | null;
  destination_country?: string | null;
  visa_type?: string | null;
  checklist?: Record<string, boolean> | null;
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

interface VisaAssistanceMetadata extends Record<string, unknown> {
  customer_id: number;
  passport_case_id: number;
  applicant_name: string;
  destination_country: string;
  visa_type: string;
  travel_purpose: string;
  intended_departure: string;
  appointment_at?: string;
  passport_number?: string;
  requirements_snapshot: RequirementSnapshot[];
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400';

const localDate = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const displayName = (travelCase: VisaTravelCase): string => {
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

export default function VisaAssistanceWorkflow({ onAdd, onBack }: ServiceWorkflowProps) {
  const navigate = useNavigate();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [preparedCaseIds, setPreparedCaseIds] = useState<Set<number>>(() => new Set());
  const [travelPurpose, setTravelPurpose] = useState('Tourism');
  const [intendedDeparture, setIntendedDeparture] = useState('');
  const [appointmentAt, setAppointmentAt] = useState('');
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
    queryKey: ['passport-cases', 'sales-workflow', 'visa', 'unbilled'],
    queryFn: async () => {
      const response = await passportingApi.list({ case_type: 'visa', per_page: 100 });
      return (response.data?.data ?? []) as VisaTravelCase[];
    },
  });

  const availableCases = useMemo(() => queriedCases.filter((travelCase) => (
    travelCase.case_type === 'visa'
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

  const completedRequirements = selectedCase
    ? Object.values(selectedCase.checklist ?? {}).filter(Boolean).length
    : 0;
  const requirementCount = selectedCase ? Object.keys(selectedCase.checklist ?? {}).length : 0;

  const addServiceLine = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCase) {
      toast.error('Select an unbilled visa case from Travel Assistance.');
      return;
    }
    if (!selectedCase.customer?.id) {
      toast.error('This case has no customer owner. Correct it in Travel Assistance before billing.');
      return;
    }
    if (!selectedCase.destination_country?.trim() || !selectedCase.visa_type?.trim()) {
      toast.error('Complete the destination country and visa type in Travel Assistance before billing.');
      return;
    }
    if (!travelPurpose.trim()) {
      toast.error('Enter the applicant’s travel purpose.');
      return;
    }
    if (!intendedDeparture) {
      toast.error('Enter the applicant’s intended departure date.');
      return;
    }
    if (appointmentAt && new Date(appointmentAt) > new Date(`${intendedDeparture}T23:59:59`)) {
      toast.error('The visa appointment cannot be after the intended departure date.');
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
    const metadata: VisaAssistanceMetadata = {
      customer_id: selectedCase.customer.id,
      passport_case_id: selectedCase.id,
      applicant_name: applicantName,
      destination_country: selectedCase.destination_country.trim(),
      visa_type: selectedCase.visa_type.trim(),
      travel_purpose: travelPurpose.trim(),
      intended_departure: intendedDeparture,
      appointment_at: toIsoDateTime(appointmentAt),
      passport_number: selectedCase.passenger?.passport_no?.trim() || undefined,
      requirements_snapshot: requirementsSnapshot,
    };
    const summary = `${metadata.visa_type} visa assistance for ${metadata.destination_country}; linked to Travel case #${selectedCase.id}.`;
    const line: PreparedServiceLine = {
      title: `Visa assistance — ${applicantName}`,
      description: notes.trim() || summary,
      price: fee,
      serviceType: 'visa_assistance',
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
        category: 'Visa Assistance',
        passport_case_id: selectedCase.id,
        visa_country: metadata.destination_country,
        visa_type: metadata.visa_type,
        category_meta: metadata,
        additional_remarks: notes.trim() || undefined,
      },
      requiresContract,
      serviceDate: intendedDeparture,
      destination: metadata.destination_country,
    };

    onAdd(line);
    setPreparedCaseIds((current) => new Set(current).add(selectedCase.id));
    setSelectedCaseId(null);
    setTravelPurpose('Tourism');
    setIntendedDeparture('');
    setAppointmentAt('');
    setProfessionalFee('');
    setNotes('');
    setRequiresContract(false);
    toast.success('Visa assistance added with its Travel case and customer ownership locked.');
  };

  return (
    <form onSubmit={addServiceLine} className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:hover:bg-indigo-950/40"
            aria-label="Back to service selection"
          >
            <LuArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
              <LuShieldCheck className="h-4 w-4" /> Travel-owned case
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Visa assistance billing brief</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Link the fee to an existing applicant case. Sales records the charge; Travel Assistance keeps the operational record.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/travel/visa-processing')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-200"
        >
          Manage visa cases <LuArrowRight className="h-4 w-4" />
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/55 dark:border-indigo-900/70 dark:bg-indigo-950/20">
        <div className="flex items-center justify-between gap-3 border-b border-indigo-200 px-4 py-3 dark:border-indigo-900/70">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">Applicant case docket</p>
            <p className="mt-0.5 text-xs text-indigo-700/70 dark:text-indigo-300/70">Only unbilled visa cases available to this staff account are shown.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg p-2 text-indigo-700 transition hover:bg-white/70 disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            aria-label="Refresh visa cases"
          >
            <LuRefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            <LuLoaderCircle className="h-5 w-5 animate-spin" /> Loading visa cases…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-5 py-9 text-center">
            <LuCircleAlert className="h-6 w-6 text-rose-500" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">Visa cases could not be loaded.</p>
            <button type="button" onClick={() => refetch()} className="text-xs font-bold text-indigo-700 underline underline-offset-4 dark:text-indigo-300">Try again</button>
          </div>
        ) : availableCases.length === 0 ? (
          <div className="px-5 py-9 text-center">
            <LuFileCheck className="mx-auto h-7 w-7 text-indigo-500" />
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No unbilled visa cases are ready.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open or correct the applicant case in Travel Assistance, then refresh this list.</p>
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
                  className={`rounded-xl border p-3 text-left transition focus:outline-none focus:ring-4 focus:ring-indigo-500/15 ${selected
                    ? 'border-indigo-500 bg-white shadow-sm dark:bg-slate-950'
                    : 'border-indigo-100 bg-white/70 hover:border-indigo-300 hover:bg-white dark:border-indigo-900/60 dark:bg-slate-950/45 dark:hover:border-indigo-700'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950 dark:text-white">{displayName(travelCase)}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Case #{travelCase.id}{travelCase.reference_number ? ` · ${travelCase.reference_number}` : ''}</p>
                    </div>
                    {selected && <LuBadgeCheck className="h-5 w-5 shrink-0 text-indigo-600" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 capitalize text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{statusLabel(travelCase.status)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{travelCase.destination_country || 'Country missing'}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{travelCase.visa_type || 'Visa type missing'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedCase && selectedCase.customer && (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-indigo-600" />
          <div className="grid gap-5 pl-2 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <LuLock className="h-4 w-4 text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">Billing owner locked from case</p>
              </div>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{customerName(selectedCase.customer)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {selectedCase.customer.email || 'No email'} · {selectedCase.customer.phone || 'No phone'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right text-xs">
              <div><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Applicant</span><strong className="text-slate-800 dark:text-slate-100">{displayName(selectedCase)}</strong></div>
              <div><span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Checklist</span><strong className="text-slate-800 dark:text-slate-100">{completedRequirements}/{requirementCount}</strong></div>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/65 p-5 dark:border-slate-800 dark:bg-slate-900/45 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="visa-travel-purpose">Travel purpose</label>
          <input id="visa-travel-purpose" className={inputClass} value={travelPurpose} onChange={(event) => setTravelPurpose(event.target.value)} placeholder="Tourism, business, family visit" />
        </div>
        <div>
          <label className={labelClass} htmlFor="visa-intended-departure">Intended departure</label>
          <input id="visa-intended-departure" type="date" min={localDate()} className={inputClass} value={intendedDeparture} onChange={(event) => setIntendedDeparture(event.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="visa-appointment">Embassy or VAC appointment <span className="normal-case tracking-normal text-slate-400">(optional)</span></label>
          <input id="visa-appointment" type="datetime-local" className={inputClass} value={appointmentAt} onChange={(event) => setAppointmentAt(event.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="visa-fee">Professional fee</label>
          <div className="relative">
            <LuWallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
            <input id="visa-fee" inputMode="decimal" className={`${inputClass} pl-10`} value={professionalFee} onChange={(event) => setProfessionalFee(formatMoneyInput(event.target.value))} placeholder="0.00" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="visa-notes">Billing notes <span className="normal-case tracking-normal text-slate-400">(optional)</span></label>
          <textarea id="visa-notes" rows={3} className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Scope, special handling, or fee inclusions shown on the transaction." />
        </div>
        <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <input type="checkbox" checked={requiresContract} onChange={(event) => setRequiresContract(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Require a signed service contract</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">Use for high-value assistance or when the agreed scope needs customer acknowledgement before finalization.</span>
          </span>
        </label>
      </section>

      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-300/30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/25">
          Add visa assistance <LuArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </form>
  );
}

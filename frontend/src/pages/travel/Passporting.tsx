import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuStamp, LuPlus, LuSearch, LuLoaderCircle,
  LuCircleCheck, LuCircle, LuChevronRight,
} from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { customerApi } from '../../api/customers';
import { Pagination, Modal, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PassportCase {
  id: number;
  reference_number?: string;
  case_type: 'passport' | 'visa';
  status: string;
  checklist: Record<string, boolean>;
  submitted_date?: string;
  release_date?: string;
  customer?: { id: number; first_name?: string; last_name?: string; full_name?: string; email?: string };
  passenger?: { id: number; first_name?: string; last_name?: string; full_name?: string };
  handler?: { id: number; first_name?: string; last_name?: string; full_name?: string };
}

const STATUS_FLOW = [
  'requirements_gathering',
  'documents_complete',
  'submitted_for_processing',
  'processing',
  'ready_for_release',
  'released',
];

const STATUS_LABELS: Record<string, string> = {
  requirements_gathering: 'Requirements',
  documents_complete: 'Docs Complete',
  submitted_for_processing: 'Submitted',
  processing: 'Processing',
  ready_for_release: 'Ready',
  released: 'Released',
  denied: 'Denied',
};

const STATUS_COLORS: Record<string, string> = {
  requirements_gathering: 'bg-amber-50 text-amber-700 border-amber-200',
  documents_complete: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted_for_processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  ready_for_release: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  released: 'bg-gray-50 text-gray-600 border-gray-200',
  denied: 'bg-red-50 text-red-700 border-red-200',
};

const PASSPORT_CHECKLIST = [
  'Birth Certificate (PSA)',
  'Valid Government ID',
  'Accomplished DFA Form',
  'Passport Photo',
  'Payment Receipt',
];

const VISA_CHECKLIST = [
  'Valid Passport',
  'Visa Application Form',
  'Proof of Accommodation',
  'Flight Itinerary',
  'Bank Statement (3 months)',
  'Travel Insurance',
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  requirements_gathering: ['documents_complete'],
  documents_complete: ['submitted_for_processing', 'requirements_gathering'],
  submitted_for_processing: ['processing'],
  processing: ['denied', 'ready_for_release'],
  ready_for_release: ['released'],
  denied: ['requirements_gathering'],
};

// ── New Case Modal ─────────────────────────────────────────────────────────────
function NewCaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customer_id: '',
    case_type: 'passport' as const,
  });

  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list({ per_page: 200 }),
  });
  const customers = customersRes?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => passportingApi.create({ ...form, customer_id: parseInt(form.customer_id) }),
    onSuccess: () => {
      toast.success('Passport case opened successfully!');
      qc.invalidateQueries({ queryKey: ['passport_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to open case.'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Open New Passport Case" size="sm">
      <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-2">
        <div className="space-y-5">
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Customer Details</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Customer *</label>
                <select
                  value={form.customer_id}
                  onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </details>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!form.customer_id}>
              Open Passport Case
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Case Detail Modal ──────────────────────────────────────────────────────────
function CaseDetailModal({ caseData, onClose }: { caseData: PassportCase; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  const isHandler = user?.id === caseData.handler?.id;
  const isAdmin = user?.role ? ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user.role) : false;
  const readOnly = !isHandler && !isAdmin;

  const [activeTab, setActiveTab] = useState<'details'|'history'>('details');

  const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>(
    caseData.checklist ?? {}
  );
  const checklistItems = caseData.case_type === 'passport' ? PASSPORT_CHECKLIST : VISA_CHECKLIST;
  const allowedNext = STATUS_TRANSITIONS[caseData.status] ?? [];

  const statusMutation = useMutation({
    mutationFn: (status: string) => passportingApi.updateStatus(caseData.id, status),
    onSuccess: () => {
      toast.success('Status updated!');
      qc.invalidateQueries({ queryKey: ['passport_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to update status.'),
  });

  const checklistMutation = useMutation({
    mutationFn: (cl: Record<string, boolean>) => passportingApi.updateChecklist(caseData.id, cl),
    onSuccess: () => {
      toast.success('Checklist saved!');
      qc.invalidateQueries({ queryKey: ['passport_cases'] });
    },
  });

  const toggleItem = (item: string) => {
    if (readOnly) return;
    const updated = { ...localChecklist, [item]: !localChecklist[item] };
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
  };

  const completedCount = checklistItems.filter(i => localChecklist[i]).length;

  const { data: auditLogsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['passport_case_audit', caseData.id],
    queryFn: () => passportingApi.getAuditLogs(caseData.id),
    enabled: activeTab === 'history'
  });
  const logs = auditLogsRes?.data?.data ?? [];

  return (
    <Modal isOpen onClose={onClose} title={`Case #${caseData.id} — ${caseData.case_type === 'passport' ? 'Passport' : 'Visa'}`} size="lg">
      <div className="overflow-y-auto custom-scrollbar max-h-[75vh]">
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 pt-2 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            History
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="p-2 space-y-5 mt-4">
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span>Case Overview</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1">
                {/* Info row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {caseData.customer?.full_name || (caseData.customer?.first_name ? `${caseData.customer.first_name} ${caseData.customer.last_name}` : '—')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[caseData.status]}`}>
                      {STATUS_LABELS[caseData.status] ?? caseData.status}
                    </span>
                  </div>
                  {caseData.reference_number && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reference No.</p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{caseData.reference_number}</p>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Handler</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {caseData.handler ? (caseData.handler.full_name || `${caseData.handler.first_name} ${caseData.handler.last_name}`) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </details>

            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span>Progress & Requirements</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-6">
                {/* Progress */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Processing Progress</p>
                  <div className="flex items-center gap-1">
                    {STATUS_FLOW.map((s, i) => {
                      const idx = STATUS_FLOW.indexOf(caseData.status);
                      const done = i < idx;
                      const active = i === idx;
                      return (
                        <div key={s} className="flex items-center flex-1 gap-1">
                          <div className={`h-2 flex-1 rounded-full transition-all ${done || active ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`} />
                          {i < STATUS_FLOW.length - 1 && <LuChevronRight size={10} className="text-gray-300 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{STATUS_LABELS[STATUS_FLOW[0]]}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.length - 1]]}</span>
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Document Checklist</p>
                    <span className="text-[10px] font-bold text-blue-600">{completedCount}/{checklistItems.length} Complete</span>
                  </div>
                  <div className="space-y-2">
                    {checklistItems.map(item => (
                      <button
                        key={item}
                        onClick={() => toggleItem(item)}
                        disabled={readOnly}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 transition text-left ${readOnly ? 'opacity-75 cursor-default' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        {localChecklist[item]
                          ? <LuCircleCheck size={18} className="text-emerald-500 shrink-0" />
                          : <LuCircle size={18} className="text-gray-300 shrink-0" />
                        }
                        <span className={`text-sm font-medium ${localChecklist[item] ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                          {item}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            {/* Status transitions */}
            {!readOnly && allowedNext.length > 0 && (
              <details className="group" open>
                <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span>Actions</span>
                  <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
                </summary>
                <div className="pt-4 px-1">
                  <div className="flex flex-wrap gap-2">
                    {allowedNext.map(next => (
                      <Button
                        key={next}
                        onClick={() => statusMutation.mutate(next)}
                        isLoading={statusMutation.isPending}
                        size="sm"
                        className="capitalize"
                      >
                        → {STATUS_LABELS[next] ?? next}
                      </Button>
                    ))}
                  </div>
                </div>
              </details>
            )}
          </div>
        ) : (
        <div className="p-6">
          {logsLoading ? (
            <div className="text-sm text-gray-500 py-4 text-center">Loading history...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center">No history available.</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                      {log.action.replace('_', ' ')}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    By: {log.user?.first_name} {log.user?.last_name}
                  </p>
                  {log.old_values && log.new_values && log.action === 'update_status' && (
                    <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="text-gray-500">Status changed from </span>
                      <span className="font-bold">{log.old_values.status}</span>
                      <span className="text-gray-500"> to </span>
                      <span className="font-bold">{log.new_values.status}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Passporting() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<PassportCase | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['passport_cases', search, page],
    queryFn: () => passportingApi.list({
      search: search || undefined,
      case_type: 'passport',
      page,
      per_page: 20,
    }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const cases: PassportCase[] = response?.data?.data ?? [];
  const meta = response?.data?.meta;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Cases
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Passport Processing</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="flex items-center gap-2">
          <LuPlus size={16} /> Open Passport Case
        </Button>
      </div>

      {/* Search & Search Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by customer or reference..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      {/* List View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LuLoaderCircle size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading cases...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 border-dashed flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-4">
            <LuStamp size={28} />
          </div>
          <h3 className="text-gray-900 dark:text-white font-bold mb-1">No cases found</h3>
          <p className="text-sm text-gray-500 max-w-sm">Open a new passport or visa case to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden relative">
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/60 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest text-[10px]">
                  <th className="px-8 py-5">Case ID</th>
                  <th className="px-8 py-5">Customer</th>
                  <th className="px-8 py-5">Type</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Checklist</th>
                  <th className="px-8 py-5">Submitted Date</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-50 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
                {cases.map((c) => {
                  const checklistItems = c.case_type === 'passport' ? PASSPORT_CHECKLIST : VISA_CHECKLIST;
                  const done = checklistItems.filter(i => c.checklist?.[i]).length;
                  const pct = Math.round((done / checklistItems.length) * 100);

                  return (
                    <tr key={c.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group cursor-pointer" onClick={() => setSelected(c)}>
                      <td className="px-8 py-5">
                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">#{c.id}</span>
                        {c.reference_number && <div className="text-[10px] text-gray-400 uppercase mt-0.5">{c.reference_number}</div>}
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-white">
                        {c.customer?.full_name || (c.customer?.first_name ? `${c.customer.first_name} ${c.customer.last_name}` : '—')}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                          c.case_type === 'passport' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-violet-50 text-violet-600 border-violet-200'
                        }`}>
                          {c.case_type}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[c.status] ?? STATUS_COLORS['released']}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-500 w-8">{done}/{checklistItems.length}</span>
                          <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-medium text-gray-500">
                        {c.submitted_date ? new Date(c.submitted_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"
                          title="View Detail"
                        >
                          <LuChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Pagination currentPage={page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onPageChange={setPage} />
      )}

      {showNew && <NewCaseModal onClose={() => setShowNew(false)} />}
      {selected && <CaseDetailModal caseData={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

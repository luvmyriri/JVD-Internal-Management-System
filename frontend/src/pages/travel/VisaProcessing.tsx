import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuGlobe, LuPlus, LuSearch, LuLoaderCircle,
  LuChevronRight, LuCircleCheck, LuCircle,
} from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { customerApi } from '../../api/customers';
import { Pagination, Modal, Button } from '../../components/ui';

interface VisaCase {
  id: number;
  reference_number?: string;
  case_type: string;
  status: string;
  checklist: Record<string, boolean>;
  submitted_date?: string;
  release_date?: string;
  customer?: { id: number; first_name?: string; last_name?: string; full_name?: string };
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

const STATUS_TRANSITIONS: Record<string, string[]> = {
  requirements_gathering: ['documents_complete'],
  documents_complete: ['submitted_for_processing', 'requirements_gathering'],
  submitted_for_processing: ['processing'],
  processing: ['denied', 'ready_for_release'],
  ready_for_release: ['released'],
  denied: ['requirements_gathering'],
};

const VISA_CHECKLIST = [
  'Valid Passport',
  'Visa Application Form',
  'Proof of Accommodation',
  'Flight Itinerary',
  'Bank Statement (3 months)',
  'Travel Insurance',
  'Employer Certificate / ITR',
];

// ── New Visa Case Modal ────────────────────────────────────────────────────────
function NewVisaCaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState('');

  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list({ per_page: 200 }),
  });
  const customers = customersRes?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => passportingApi.create({ customer_id: parseInt(customerId), case_type: 'visa' }),
    onSuccess: () => {
      toast.success('Visa case opened!');
      qc.invalidateQueries({ queryKey: ['visa_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to open case.'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Open Visa Case" size="sm">
      <div className="p-6 space-y-5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Customer *</label>
          <select
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Customer...</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!customerId}>
            Open Visa Case
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Case Detail Modal ──────────────────────────────────────────────────────────
function VisaCaseDetailModal({ vc, onClose }: { vc: VisaCase; onClose: () => void }) {
  const qc = useQueryClient();
  const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>(vc.checklist ?? {});
  const allowedNext = STATUS_TRANSITIONS[vc.status] ?? [];
  const done = VISA_CHECKLIST.filter(i => localChecklist[i]).length;

  const statusMutation = useMutation({
    mutationFn: (status: string) => passportingApi.updateStatus(vc.id, status),
    onSuccess: () => {
      toast.success('Status updated!');
      qc.invalidateQueries({ queryKey: ['visa_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to update status.'),
  });

  const checklistMutation = useMutation({
    mutationFn: (cl: Record<string, boolean>) => passportingApi.updateChecklist(vc.id, cl),
    onSuccess: () => toast.success('Checklist saved!'),
  });

  const toggleItem = (item: string) => {
    const updated = { ...localChecklist, [item]: !localChecklist[item] };
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Visa Case #${vc.id}`} size="lg">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {vc.customer?.full_name || (vc.customer?.first_name ? `${vc.customer.first_name} ${vc.customer.last_name}` : '—')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[vc.status]}`}>
              {STATUS_LABELS[vc.status]}
            </span>
          </div>
          {vc.handler && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Handler</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{vc.handler.full_name || `${vc.handler.first_name} ${vc.handler.last_name}`}</p>
            </div>
          )}
          {vc.reference_number && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reference No.</p>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{vc.reference_number}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Processing Progress</p>
          <div className="flex items-center gap-1">
            {STATUS_FLOW.map((s, i) => {
              const idx = STATUS_FLOW.indexOf(vc.status);
              const done2 = i < idx;
              return (
                <div key={s} className="flex items-center flex-1 gap-1">
                  <div className={`h-2 flex-1 rounded-full transition-all ${done2 || i === idx ? 'bg-violet-500' : 'bg-gray-100 dark:bg-gray-700'}`} />
                  {i < STATUS_FLOW.length - 1 && <LuChevronRight size={10} className="text-gray-300 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Document Checklist</p>
            <span className="text-[10px] font-bold text-violet-600">{done}/{VISA_CHECKLIST.length} Complete</span>
          </div>
          <div className="space-y-2">
            {VISA_CHECKLIST.map(item => (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left"
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

        {/* Advance status */}
        {allowedNext.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Advance Status</p>
            <div className="flex flex-wrap gap-2">
              {allowedNext.map(next => (
                <Button
                  key={next}
                  onClick={() => statusMutation.mutate(next)}
                  isLoading={statusMutation.isPending}
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 capitalize"
                >
                  → {STATUS_LABELS[next] ?? next}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VisaProcessing() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<VisaCase | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['visa_cases', search, page],
    queryFn: () => passportingApi.list({ case_type: 'visa', search: search || undefined, page, per_page: 20 }),
  });

  const cases: VisaCase[] = response?.data?.data ?? [];
  const meta = response?.data?.meta;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Visa Cases
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Embassy & Consulate Processing</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 shadow-violet-200">
          <LuPlus size={16} /> Open Visa Case
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md">
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

      {/* List View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LuLoaderCircle size={32} className="animate-spin text-violet-600" />
          <p className="text-sm text-gray-500 font-medium">Loading visa cases...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 border-dashed flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-violet-50 text-violet-500 rounded-3xl flex items-center justify-center mb-4">
            <LuGlobe size={28} />
          </div>
          <h3 className="text-gray-900 dark:text-white font-bold mb-1">No visa cases found</h3>
          <p className="text-sm text-gray-500 max-w-sm">Open a new visa case to start processing.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                  <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 rounded-tl-3xl">Case ID</th>
                  <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Customer</th>
                  <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Type</th>
                  <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Status</th>
                  <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Checklist</th>
                  <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">Submitted Date</th>
                  <th className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 rounded-tr-3xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {cases.map((c) => {
                  const done = VISA_CHECKLIST.filter(i => c.checklist?.[i]).length;
                  const pct = Math.round((done / VISA_CHECKLIST.length) * 100);

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer group" onClick={() => setSelected(c)}>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">#{c.id}</span>
                        {c.reference_number && <div className="text-[10px] text-gray-400 uppercase mt-0.5">{c.reference_number}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                        {c.customer?.full_name || (c.customer?.first_name ? `${c.customer.first_name} ${c.customer.last_name}` : '—')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="shrink-0 inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border bg-violet-50 text-violet-600 border-violet-200">
                          {c.case_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[c.status] ?? STATUS_COLORS['released']}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-violet-600 w-8">{done}/{VISA_CHECKLIST.length}</span>
                          <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                            <div className="bg-violet-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">
                        {c.submitted_date ? new Date(c.submitted_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                          className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:bg-violet-100 transition"
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

      {showNew && <NewVisaCaseModal onClose={() => setShowNew(false)} />}
      {selected && <VisaCaseDetailModal vc={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

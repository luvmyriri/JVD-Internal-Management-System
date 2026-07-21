import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  LuGlobe, LuPlus, LuSearch, LuLoaderCircle,
  LuChevronRight,
} from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { Pagination, Button } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';
import {
  type VisaCase,
  STATUS_LABELS,
  STATUS_COLORS,
} from './visaProcessing.constants';
import NewVisaCaseModal from './NewVisaCaseModal';
import VisaCaseDetailModal from './VisaCaseDetailModal';

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VisaProcessing() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<VisaCase | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['visa_cases', search, page],
    queryFn: () => passportingApi.list({ case_type: 'visa', search: search || undefined, page, per_page: 20 }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const cases: VisaCase[] = response?.data?.data ?? [];
  const meta = response?.data?.meta;

  const columns: Column<VisaCase>[] = [
    {
      key: 'id',
      header: 'Case ID',
      render: (c) => (
        <>
          <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">#{c.id}</span>
          {c.reference_number && <div className="text-[10px] text-gray-400 uppercase mt-0.5">{c.reference_number}</div>}
        </>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (c) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {c.customer?.full_name || (c.customer?.first_name ? `${c.customer.first_name} ${c.customer.last_name}` : '—')}
        </span>
      ),
    },
    {
      key: 'case_type',
      header: 'Type',
      render: (c) => (
        <span className="shrink-0 inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border bg-violet-50 text-violet-600 border-violet-200">
          {c.case_type}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[c.status] ?? STATUS_COLORS['released']}`}>
          {STATUS_LABELS[c.status] ?? c.status}
        </span>
      ),
    },
    {
      key: 'checklist',
      header: 'Checklist',
      render: (c) => {
        const checklistKeys = c.checklist ? Object.keys(c.checklist) : [];
        const done = checklistKeys.filter(i => c.checklist?.[i]).length;
        const pct = checklistKeys.length > 0 ? Math.round((done / checklistKeys.length) * 100) : 0;
        return (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-violet-600 w-8">{done}/{checklistKeys.length}</span>
            <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
              <div className="bg-violet-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'submitted_date',
      header: 'Submitted Date',
      render: (c) => (
        <span className="text-xs font-medium text-gray-500">
          {c.submitted_date ? new Date(c.submitted_date).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelected(c); }}
          className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:bg-violet-100 transition"
          title="View Detail"
        >
          <LuChevronRight size={14} />
        </button>
      ),
    },
  ];

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
      <div className="relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <DataTable
          columns={columns}
          data={cases}
          rowKey={(c) => c.id}
          onRowClick={(c) => setSelected(c)}
          empty={
            isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <LuLoaderCircle size={32} className="animate-spin text-violet-600" />
                <p className="text-sm text-gray-500 font-medium">Loading visa cases...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="w-16 h-16 bg-violet-50 text-violet-500 rounded-3xl flex items-center justify-center mb-4">
                  <LuGlobe size={28} />
                </div>
                <h3 className="text-gray-900 dark:text-white font-bold mb-1">No visa cases found</h3>
                <p className="text-sm text-gray-500 max-w-sm">Open a new visa case to start processing.</p>
              </div>
            )
          }
          className={`transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}
        />
      </div>

      {meta && meta.last_page > 1 && (
        <Pagination currentPage={page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onPageChange={setPage} />
      )}

      {showNew && <NewVisaCaseModal onClose={() => setShowNew(false)} />}
      {selected && <VisaCaseDetailModal vc={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuSearch, LuEye, LuClock,
  LuActivity, LuPlus,
  LuFileCheck, LuWallet, LuLink
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { cashBudgetApi, tripTicketApi } from '../../api/operations';
import { purchaseOrderApi } from '../../api/purchaseOrders';
import { workOrderApi } from '../../api/workOrders';
import type { CashBudgetRequest } from '../../types';
import { Modal, Button, PipelineVisualizer } from '../../components/ui';
import { DataTable, EmptyState, TimeframeFilter, ExportButton, type Column, type DateRangeValue } from '../../components/ds';
import { exportToCsv, datedFilename } from '../../utils/exportCsv';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import CashBudgetDetailModal from './CashBudgetDetailModal';
import CreateCashBudgetModal from './CreateCashBudgetModal';

export function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    disbursed: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    draft: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
    approved: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
    pending_accounting: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50',
    pending_super_admin: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-900/50',
  };
  const icons: any = {
    disbursed: <LuFileCheck className="w-3 h-3" />,
    draft: <LuClock className="w-3 h-3" />,
    approved: <LuActivity className="w-3.5 h-3.5" />,
    pending_accounting: <LuClock className="w-3 h-3" />,
    pending_super_admin: <LuActivity className="w-3 h-3" />,
  };

  const s = status || 'draft';

  return (
    <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[s] || styles.draft}`}>
      {icons[s] || icons.draft}
      {s.replace('_', ' ')}
    </span>
  );
}


type StatusFilter = 'all' | 'draft' | 'pending_accounting' | 'approved' | 'disbursed';
const STATUS_FILTERS: StatusFilter[] = ['all', 'draft', 'pending_accounting', 'approved', 'disbursed'];

export default function CashBudgets() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [selectedBudget, setSelectedBudget] = useState<CashBudgetRequest | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['cash-budgets'],
    queryFn: () => cashBudgetApi.getAll(),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const budgets: CashBudgetRequest[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const hasGeneralAccess = !!(user?.role === 'super_admin' || user?.tags?.includes('access:general') || user?.tags?.includes('access:cash_budgets:general'));

  const filtered = budgets.filter((b) => {
    if (!hasGeneralAccess && b.prepared_by !== user?.id) {
      return false;
    }
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      b.destination?.toLowerCase().includes(q) ||
      b.plate_number?.toLowerCase().includes(q) ||
      String(b.purchase_order_id ?? '').includes(q) ||
      b.tripTicket?.control_no?.toLowerCase().includes(q) ||
      b.preparedBy?.name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const created = (b.created_at ?? '').slice(0, 10);
    const matchDate = (!dateRange.from || created >= dateRange.from) && (!dateRange.to || created <= dateRange.to);
    return matchSearch && matchStatus && matchDate;
  });

  // Summary counts
  const counts = {
    all: budgets.length,
    draft: budgets.filter(b => b.status === 'draft').length,
    approved: budgets.filter(b => b.status === 'approved').length,
    disbursed: budgets.filter(b => b.status === 'disbursed').length,
  };

  const columns: Column<CashBudgetRequest>[] = [
    {
      key: 'id',
      header: 'ID & Source',
      sortable: true,
      sortValue: (budget) => budget.id,
      render: (budget) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 shadow-sm">
            <LuWallet className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">#{budget.id}</p>
            {budget.purchase_order_id ? (
              <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 uppercase tracking-widest">
                P.O. #{budget.purchase_order_id}
              </span>
            ) : budget.work_order_id ? (
              <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-widest">
                W.O. #{(budget.workOrder as any)?.wo_number || budget.work_order_id}
              </span>
            ) : budget.trip_ticket_id ? (
              <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-widest">
                DTT #{(budget.trip_ticket ?? budget.tripTicket)?.control_no || budget.trip_ticket_id}
              </span>
            ) : (
              <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 uppercase tracking-widest">
                General
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'travel_date',
      header: 'Travel Date',
      sortable: true,
      sortValue: (budget) => budget.travel_date || '',
      render: (budget) => (
        <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">{budget.travel_date || '—'}</p>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      sortable: true,
      sortValue: (budget) => budget.destination || '',
      render: (budget) => (
        <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">{budget.destination || '—'}</p>
      ),
    },
    {
      key: 'plate_number',
      header: 'Plate No',
      render: (budget) => (
        <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">{budget.plate_number || '—'}</p>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Amount',
      sortable: true,
      sortValue: (budget) => Number(budget.total_amount || 0),
      render: (budget) => (
        <p className="text-sm font-black text-gray-950 dark:text-white leading-tight">
          ₱{Number(budget.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (budget) => <StatusBadge status={budget.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (budget) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => setSelectedBudget(budget)}>
            <LuEye className="w-4 h-4 mr-2" /> Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Cash Budgets</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
        >
          <LuPlus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0 relative z-20 no-print">

        {/* KPI 1: Draft */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuClock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Draft
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Pending Approval</p>
            <p className="text-2xl font-black leading-none">{counts.draft || 0}</p>
          </div>
        </div>

        {/* KPI 2: Approved */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-300/30 dark:shadow-blue-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuActivity className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Approved
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Ready to Disburse</p>
            <p className="text-2xl font-black leading-none">{counts.approved || 0}</p>
          </div>
        </div>

        {/* KPI 3: Disbursed */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuFileCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Disbursed
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Released Budgets</p>
            <p className="text-2xl font-black leading-none">{counts.disbursed || 0}</p>
          </div>
        </div>

        {/* KPI 4: Total */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-lg shadow-purple-300/30 dark:shadow-purple-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuWallet className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Total
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Total Requests</p>
            <p className="text-2xl font-black leading-none">{counts.all || 0}</p>
          </div>
        </div>

      </div>

      {/* Main Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full sm:w-72">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search destination, plate, DTT..."
              className="pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto hide-scrollbar flex-nowrap w-full sm:w-auto bg-gray-50 dark:bg-gray-800/70 p-1.5 rounded-full border border-gray-100/50 dark:border-gray-700/30">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Timeframe filter */}
          <TimeframeFilter value={dateRange} onChange={setDateRange} className="w-full sm:w-auto sm:ml-auto" />
          <ExportButton
            disabled={filtered.length === 0}
            onClick={() => exportToCsv(datedFilename('cash_budgets'), filtered, [
              { header: 'ID', value: (b) => b.id },
              { header: 'Destination', value: (b) => b.destination ?? '' },
              { header: 'Plate #', value: (b) => b.plate_number ?? '' },
              { header: 'DTT', value: (b) => b.tripTicket?.control_no ?? '' },
              { header: 'Prepared By', value: (b) => b.preparedBy?.name ?? '' },
              { header: 'Total Amount', value: (b) => b.total_amount ?? '' },
              { header: 'Status', value: (b) => b.status },
              { header: 'Date', value: (b) => (b.created_at ?? '').slice(0, 10) },
            ])}
          />
        </div>

        {/* Data Table */}
        <div className={`jvd relative ${filtered.length > 0 ? 'min-h-[350px]' : ''} ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50 transition-all duration-300' : 'transition-all duration-300'}`}>
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(budget) => budget.id}
            empty={
              isLoading ? (
                <div className="flex flex-col items-center py-16 text-muted">
                  <LuActivity size={22} className="mb-2 animate-spin text-brand" />
                  <p className="text-sm">Loading cash budgets…</p>
                </div>
              ) : (
                <EmptyState icon={<LuWallet size={22} />} title="No records found" description="Try adjusting your search or status filter." />
              )
            }
          />
        </div>
      </div>

      {selectedBudget && (
        <CashBudgetDetailModal budget={selectedBudget} onClose={() => setSelectedBudget(null)} />
      )}

      {showCreate && (
        <CreateCashBudgetModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
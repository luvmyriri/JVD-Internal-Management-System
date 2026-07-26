import { useState, useEffect } from 'react';
import { 
  LuScrollText, 
  LuCalendar,
  LuEye,
  LuUser,
  LuGlobe,
  LuActivity,
  LuLoaderCircle,
  LuSearch,
  LuRefreshCcw,
  LuDownload,
  LuFilter,
  LuList,
  LuGitBranch,
  LuShieldCheck,
  LuSparkles,
  LuUserCheck,
  LuLayers,
} from 'react-icons/lu';
import { useAuditLogs, useAuditLogStats, type AuditLog } from '../../hooks/useAuditLogs';
import { StatusBadge, Modal, Pagination, Button, AuditLogDiffViewer } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';
import { formatDate, timeAgo } from '../../utils';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

const getActionVariant = (action: string): 'success' | 'info' | 'danger' | 'warning' | 'neutral' => {
  const act = action.toUpperCase();
  if (['POST', 'CREATE', 'APPROVE', 'ACTIVATE'].includes(act)) return 'success';
  if (['PUT', 'PATCH', 'UPDATE', 'FINALIZE', 'DISBURSE', 'SETTLE'].includes(act)) return 'info';
  if (['HOLD', 'REJECT', 'CANCEL'].includes(act)) return 'warning';
  if (['DELETE', 'DEACTIVATE'].includes(act)) return 'danger';
  return 'neutral';
};

const MODULE_OPTIONS = [
  { value: '',            label: 'All System Modules' },
  { value: 'accounting',  label: 'Accounting & Billing' },
  { value: 'operations',  label: 'Operations & Kyc' },
  { value: 'logistics',   label: 'Logistics & Fleet' },
  { value: 'procurement', label: 'Procurement & Suppliers' },
  { value: 'inventory',   label: 'Inventory & Supplies' },
  { value: 'sales',       label: 'Sales & Joiner Departures' },
  { value: 'hr',          label: 'Human Resources & Payroll' },
  { value: 'travel',      label: 'Travel Assistance & Visa' },
  { value: 'driver',      label: 'Driver Portal' },
  { value: 'admin',       label: 'Administration' },
  { value: 'auth',        label: 'Authentication & Security' },
];

const ACTION_OPTIONS = [
  { value: '',            label: 'Any Action Type' },
  { value: 'CREATE',      label: 'Create / Add (POST)' },
  { value: 'UPDATE',      label: 'Update / Modify (PUT/PATCH)' },
  { value: 'DELETE',      label: 'Delete / Remove (DELETE)' },
  { value: 'APPROVE',     label: 'Approve' },
  { value: 'FINALIZE',    label: 'Finalize' },
  { value: 'DISBURSE',    label: 'Disburse' },
  { value: 'HOLD',        label: 'Seat Hold' },
  { value: 'DEACTIVATE',  label: 'Deactivate' },
];

export default function AuditLogs() {
  const { theme } = useTheme();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userIdFilter, setUserIdFilter] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: stats } = useAuditLogStats();

  const { data: logsData, isLoading } = useAuditLogs({ 
    page, 
    search,
    module, 
    action,
    user_id: userIdFilter,
    date_from: dateFrom,
    date_to: dateTo,
    per_page: 20 
  });

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setModule('');
    setAction('');
    setDateFrom('');
    setDateTo('');
    setUserIdFilter(undefined);
    setPage(1);
  };

  const applyPresetDate = (days: number | 'today') => {
    if (days === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else {
      const now = new Date();
      const past = new Date(now.getTime() - days * 86400000);
      setDateFrom(past.toISOString().split('T')[0]);
      setDateTo(now.toISOString().split('T')[0]);
    }
    setPage(1);
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (module) params.append('module', module);
      if (action) params.append('action', action);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (userIdFilter) params.append('user_id', String(userIdFilter));

      const response = await api.get(`/audit-logs/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Audit trail CSV exported successfully!');
    } catch {
      toast.error('Failed to export audit trail.');
    } finally {
      setIsExporting(false);
    }
  };

  const filterByUser = (userId: number) => {
    setUserIdFilter(userId);
    setIsDetailModalOpen(false);
    setPage(1);
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'user',
      header: 'Timestamp & User',
      render: (log) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-100 dark:border-blue-900/40 shadow-sm shrink-0">
            {log.performed_by?.avatar_url ? (
              <img src={log.performed_by.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
            ) : log.performed_by ? (
              `${log.performed_by.first_name[0]}${log.performed_by.last_name[0]}`
            ) : (
              <LuUser size={16} />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {log.performed_by ? `${log.performed_by.first_name} ${log.performed_by.last_name}` : 'System Automation'}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
              <span>{formatDate(log.created_at, 'MMM dd, yyyy HH:mm')}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              <span>{timeAgo(log.created_at)}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <StatusBadge
          status={log.action}
          variant={getActionVariant(log.action)}
        />
      ),
    },
    {
      key: 'module',
      header: 'Module & Context',
      render: (log) => (
        <div>
          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-extrabold uppercase tracking-wider border border-gray-200 dark:border-gray-700">
            {log.module.replace(/-/g, ' ')}
          </span>
          {log.entity_type && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
              {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'origin',
      header: 'Origin IP',
      align: 'right',
      render: (log) => (
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 flex items-center justify-end gap-1">
            <LuGlobe size={11} className="text-blue-500" /> {log.ip_address}
          </span>
          <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">IPv4 Address</span>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'State Delta',
      align: 'center',
      render: (log) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleViewDetails(log)}
          className="text-xs flex items-center gap-1.5"
        >
          <LuEye size={14} /> Diff
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header & KPI Summary Cards ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <LuScrollText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Audit Trail Intelligence
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Immutable log of system actions, state mutations, and user activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              <LuList size={14} /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              <LuGitBranch size={14} /> Timeline
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={handleExportCSV}
            isLoading={isExporting}
            className="flex items-center gap-1.5 text-xs"
          >
            <LuDownload size={14} /> Export CSV
          </Button>

          <Button
            variant="secondary"
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs"
          >
            <LuRefreshCcw size={14} /> Reset
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Logged Events</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <LuLayers size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2">
            {(stats?.total_events ?? logsData?.meta?.total ?? 0).toLocaleString()}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Across all system modules</p>
        </div>

        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Mutations Today</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <LuActivity size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {(stats?.mutations_today ?? 0).toLocaleString()}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">State-changing requests today</p>
        </div>

        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Active Users Today</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <LuUserCheck size={16} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
            {stats?.active_users_today ?? 0}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Unique user sessions with actions</p>
        </div>

        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Most Active Module</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <LuSparkles size={16} />
            </div>
          </div>
          <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 capitalize truncate">
            {stats?.top_module?.replace(/-/g, ' ') || 'General'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Highest event volume</p>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className={`p-4 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
            <LuFilter className="w-4 h-4 text-blue-500" />
            <span>Search & Audit Filters</span>
            {userIdFilter && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                Filtered by User #{userIdFilter}
              </span>
            )}
          </div>
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-gray-400">Quick Range:</span>
            <button type="button" onClick={() => applyPresetDate('today')} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">Today</button>
            <button type="button" onClick={() => applyPresetDate(7)} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">7 Days</button>
            <button type="button" onClick={() => applyPresetDate(30)} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">30 Days</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search user, ID, action, IP..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
              }`}
            />
          </div>

          {/* Module Selector */}
          <select
            value={module}
            onChange={(e) => { setModule(e.target.value); setPage(1); }}
            className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}
          >
            {MODULE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Action Selector */}
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}
          >
            {ACTION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className={`w-1/2 px-2.5 py-2 rounded-xl border text-xs font-medium focus:outline-none ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
              }`}
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className={`w-1/2 px-2.5 py-2 rounded-xl border text-xs font-medium focus:outline-none ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Table View vs Timeline View ── */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={logsData?.data ?? []}
          rowKey={(log) => log.id}
          empty={
            isLoading ? (
              <div className="px-8 py-16 text-center text-gray-400">
                <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-xs font-medium">Retrieving audit trail...</p>
              </div>
            ) : (
              <div className="px-8 py-16 text-center text-gray-400">
                <LuScrollText size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-xs font-medium">No logs found matching your active filters.</p>
              </div>
            )
          }
        />
      ) : (
        /* ── Timeline View ── */
        <div className={`rounded-2xl border p-6 space-y-6 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
          {isLoading ? (
            <div className="py-16 text-center text-gray-400">
              <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-xs font-medium">Loading event timeline...</p>
            </div>
          ) : (logsData?.data ?? []).length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <LuGitBranch size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-xs font-medium">No events in this timeline period.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
              {(logsData?.data ?? []).map((log) => (
                <div key={log.id} className="relative flex items-start gap-4">
                  {/* Node Dot */}
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 shadow-sm" />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {log.performed_by ? `${log.performed_by.first_name} ${log.performed_by.last_name}` : 'System Automation'}
                        </span>
                        <StatusBadge status={log.action} variant={getActionVariant(log.action)} />
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-mono uppercase">
                          {log.module}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {formatDate(log.created_at, 'MMM dd, yyyy HH:mm:ss')} ({timeAgo(log.created_at)})
                      </span>
                    </div>

                    {log.entity_type && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Target: <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</span>
                      </p>
                    )}

                    <div className="pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <LuEye size={13} /> View State Delta Diff
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {logsData?.meta && logsData.meta.last_page > 1 && (
        <Pagination
          currentPage={page}
          lastPage={logsData.meta.last_page}
          total={logsData.meta.total}
          perPage={logsData.meta.per_page}
          onPageChange={setPage}
        />
      )}

      {/* ── Event Intelligence & Diff Modal ── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Audit Event Delta Intelligence"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-6 p-1">
            {/* Header info card */}
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {selectedLog.performed_by ? `${selectedLog.performed_by.first_name[0]}${selectedLog.performed_by.last_name[0]}` : 'SYS'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {selectedLog.performed_by ? `${selectedLog.performed_by.first_name} ${selectedLog.performed_by.last_name}` : 'System Automation'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {selectedLog.performed_by?.employee_id ?? 'SYSTEM_ID'} · {selectedLog.performed_by?.role ?? 'automated'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedLog.action} variant={getActionVariant(selectedLog.action)} />
                  <span className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase">
                    {selectedLog.module}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><LuGlobe size={13} className="text-blue-500" /> IP: {selectedLog.ip_address}</span>
                <span className="flex items-center gap-1"><LuCalendar size={13} className="text-blue-500" /> {formatDate(selectedLog.created_at, 'MMM dd, yyyy HH:mm:ss')}</span>
              </div>
            </div>

            {/* Field-by-Field Diff Component */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Attribute State Delta</h3>
              <AuditLogDiffViewer
                oldValues={selectedLog.old_values}
                newValues={selectedLog.new_values}
              />
            </div>

            {/* Traceability Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
              {selectedLog.performed_by?.id ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => filterByUser(selectedLog.performed_by!.id)}
                  className="text-xs"
                >
                  Filter all logs by {selectedLog.performed_by.first_name}
                </Button>
              ) : <div />}

              <Button
                variant="secondary"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-6"
              >
                Close Trace
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

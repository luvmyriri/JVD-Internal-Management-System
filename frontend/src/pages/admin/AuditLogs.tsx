import { useState } from 'react';
import { 
  LuScrollText, 
  LuCalendar,
  LuEye,
  LuUser,
  LuGlobe,
  LuActivity,
  LuLoaderCircle,
  LuSearch,
  LuRefreshCcw
} from 'react-icons/lu';
import { useAuditLogs, type AuditLog } from '../../hooks/useAuditLogs';
import { StatusBadge, Modal, Pagination, Button } from '../../components/ui';
import { formatDate, timeAgo } from '../../utils';

const getActionVariant = (action: string): 'success' | 'info' | 'danger' | 'neutral' => {
  switch (action.toUpperCase()) {
    case 'POST': return 'success';
    case 'PUT': 
    case 'PATCH': return 'info';
    case 'DELETE': return 'danger';
    default: return 'neutral';
  }
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: logsData, isLoading } = useAuditLogs({ 
    page, 
    module, 
    action,
    date_from: dateFrom,
    date_to: dateTo,
    per_page: 20 
  });

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const resetFilters = () => {
    setModule('');
    setAction('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800/50">
            {logsData?.meta?.total ?? '0'} Events
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-[0.2em]">
            System Audit Trail
          </p>
        </div>
        <Button 
          variant="secondary"
          onClick={resetFilters}
          className="flex items-center gap-2 px-6"
        >
          <LuRefreshCcw size={18} /> Reset Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Module</label>
          <div className="relative">
            <select
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
              value={module}
              onChange={(e) => setModule(e.target.value)}
            >
              <option value="">All Modules</option>
              <option value="users">Employees</option>
              <option value="purchase-orders">Purchase Orders</option>
              <option value="suppliers">Suppliers</option>
              <option value="billing">Billing/Accounting</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500 dark:text-gray-400">
              <LuActivity size={14} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Action Type</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Any Action</option>
            <option value="POST">Created (POST)</option>
            <option value="PUT">Updated (PUT)</option>
            <option value="PATCH">Modified (PATCH)</option>
            <option value="DELETE">Deleted (DELETE)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Date From</label>
          <div className="relative">
            <input
              type="date"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Date To</label>
          <input
            type="date"
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest text-[10px]">
                <th className="px-8 py-5">Timestamp & User</th>
                <th className="px-8 py-5">Action</th>
                <th className="px-8 py-5">Module</th>
                <th className="px-8 py-5 text-right">Origin</th>
                <th className="px-8 py-5 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">Retrieving audit trail...</p>
                  </td>
                </tr>
              ) : logsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400">
                    <LuScrollText size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300 dark:text-gray-600 dark:text-gray-300" />
                    <p className="text-sm font-medium">No logs found matching filters.</p>
                  </td>
                </tr>
              ) : (
                logsData?.data?.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all group border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-400 border border-gray-100 dark:border-gray-700 shadow-sm group-hover:scale-110 transition-transform">
                          <LuUser size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white text-base">
                            {log.performed_by ? `${log.performed_by.first_name} ${log.performed_by.last_name}` : 'System Process'}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                            {formatDate(log.created_at, 'MMM dd, yyyy HH:mm')}
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                            {timeAgo(log.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge 
                        status={log.action}
                        variant={getActionVariant(log.action)}
                      />
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black tracking-widest uppercase border border-gray-100 dark:border-gray-700">
                        {log.module.replace(/-/g, ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-gray-900 dark:text-white font-black text-base tracking-tight">{log.ip_address}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-0.5">IPv4 Address</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                        className="p-3"
                      >
                        <LuEye size={20} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Event Intelligence"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-8 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/20 transition-colors" />
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-4">Transaction Context</p>
                <div className="flex items-center gap-4">
                  <StatusBadge 
                    status={selectedLog.action}
                    variant={getActionVariant(selectedLog.action)}
                  />
                  <div className="text-xl font-black text-gray-900 dark:text-white capitalize tracking-tight">
                    {selectedLog.module.replace(/-/g, ' ')}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-500/20 transition-colors" />
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-4">Identity Matrix</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-blue-500 shadow-sm border border-gray-100 dark:border-gray-700">
                    <LuUser size={24} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                      {selectedLog.performed_by ? `${selectedLog.performed_by.first_name} ${selectedLog.performed_by.last_name}` : 'System'}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">
                      {selectedLog.performed_by?.employee_id || 'SYSTEM_PROCESS'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 ml-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
                  <LuSearch size={16} />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">State Delta Analysis</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest">Baseline State</p>
                    <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 dark:text-gray-300">PRE-EVENT</span>
                  </div>
                  <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-inner overflow-hidden relative">
                    <pre className="text-[11px] font-mono text-gray-400 dark:text-gray-500 dark:text-gray-400 overflow-auto max-h-[300px] leading-relaxed custom-scrollbar">
                      {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '// No previous state recorded'}
                    </pre>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">Resultant State</p>
                    <span className="text-[10px] font-bold text-blue-200 dark:text-blue-500/30 font-mono italic">UPDATED</span>
                  </div>
                  <div className="p-6 bg-blue-50/30 dark:bg-blue-500/5 rounded-[2rem] border border-blue-100 dark:border-blue-500/10 shadow-inner overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
                    <pre className="text-[11px] font-mono text-blue-700/80 dark:text-blue-300 overflow-auto max-h-[300px] leading-relaxed relative z-10 custom-scrollbar">
                      {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '// No changes applied'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-700/50 mt-8">
              <div className="flex items-center gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Source IP</span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><LuGlobe size={14} className="text-blue-500 dark:text-blue-400" /> {selectedLog.ip_address}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Execution Time</span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><LuCalendar size={14} className="text-blue-500 dark:text-blue-400" /> {formatDate(selectedLog.created_at)}</span>
                </div>
              </div>
              <Button 
                variant="secondary"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-8"
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

import { useState } from 'react';
import {
  LuScrollText, 
  LuFilter, 
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuEye,
  LuUser,
  LuGlobe,
  LuActivity,
  LuShieldAlert
} from 'react-icons/lu';
import { useAuditLogs, type AuditLog } from '../../hooks/useAuditLogs';
import { Button, StatusBadge, Modal } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';
import { formatDate, timeAgo } from '../../utils';

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: logsData, isLoading } = useAuditLogs({ 
    page, 
    module, 
    action,
    per_page: 20 
  });

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'POST': return 'emerald';
      case 'PUT': 
      case 'PATCH': return 'amber';
      case 'DELETE': return 'rose';
      default: return 'indigo';
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-300">{formatDate(log.created_at)}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <LuCalendar size={10} />
            {timeAgo(log.created_at)}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (log) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <LuUser size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-200">
              {log.performed_by ? `${log.performed_by.first_name} ${log.performed_by.last_name}` : 'System'}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-tighter uppercase">{log.performed_by?.role || 'SYSTEM'}</p>
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
          variant={getActionColor(log.action) as any}
          className="font-mono text-[10px]"
        />
      ),
    },
    {
      key: 'module',
      header: 'Module',
      render: (log) => (
        <span className="text-xs font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded capitalize tracking-tight">
          {log.module.replace('-', ' ')}
        </span>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: (log) => (
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-mono text-xs">
          <LuGlobe size={12} />
          {log.ip_address}
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      align: 'right',
      render: (log) => (
        <button
          onClick={() => handleViewDetails(log)}
          className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all"
        >
          <LuEye size={18} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <LuScrollText className="text-indigo-500" size={32} />
            System Activity Log
          </h1>
          <p className="text-gray-400 mt-1">Immutable audit trail of all administrative and operational actions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Module</label>
          <div className="relative">
            <LuActivity className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
            <select
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
              value={module}
              onChange={(e) => setModule(e.target.value)}
            >
              <option value="">All Modules</option>
              <option value="users">Employees</option>
              <option value="purchase-orders">Purchase Orders</option>
              <option value="suppliers">Suppliers</option>
              <option value="billing">Billing/Accounting</option>
            </select>
          </div>
        </div>

        <div className="w-full md:w-48 space-y-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Action</label>
          <select
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Any Action</option>
            <option value="POST">Created</option>
            <option value="PUT">Updated</option>
            <option value="DELETE">Deleted</option>
          </select>
        </div>

        <Button variant="secondary" className="px-6 py-2.5 h-[46px] w-full md:w-auto">
          <LuFilter size={18} />
          Filter
        </Button>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <DataTable
          columns={columns}
          data={logsData?.data ?? []}
          rowKey={(log) => log.id}
          empty={
            isLoading ? (
              <div className="divide-y divide-gray-800/50">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse px-6 py-8 bg-gray-900/20" />
                ))}
              </div>
            ) : (
              <div className="px-6 py-20 text-center text-gray-500 dark:text-gray-400">
                <LuScrollText size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm font-medium">No activity logs found.</p>
              </div>
            )
          }
        />

        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="text-gray-300">{(page - 1) * 20 + 1}</span> to <span className="text-gray-300">{Math.min(page * 20, logsData?.meta?.total || 0)}</span> of <span className="text-gray-300">{logsData?.meta?.total || 0}</span> logs
          </p>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="p-2 h-9 w-9 rounded-lg"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <LuChevronLeft size={16} />
            </Button>
            <Button 
              variant="secondary" 
              className="p-2 h-9 w-9 rounded-lg"
              disabled={page >= (logsData?.meta?.last_page || 1)}
              onClick={() => setPage(p => p + 1)}
            >
              <LuChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Log Event Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Action Performed</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedLog.action} variant={getActionColor(selectedLog.action) as any} />
                  <span className="text-lg font-bold text-gray-200 capitalize">{selectedLog.module.replace('-', ' ')}</span>
                </div>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Performed By</p>
                <p className="text-lg font-bold text-gray-200">
                  {selectedLog.performed_by ? `${selectedLog.performed_by.first_name} ${selectedLog.performed_by.last_name}` : 'System'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedLog.performed_by?.employee_id || 'SYSTEM_PROCESS'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                <LuShieldAlert size={16} className="text-amber-500" />
                State Changes
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Previous Values</p>
                  <pre className="p-4 bg-gray-950 rounded-xl border border-gray-800 text-[10px] font-mono text-gray-400 overflow-auto max-h-[300px]">
                    {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '// No previous state'}
                  </pre>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">New Values</p>
                  <pre className="p-4 bg-indigo-950/20 rounded-xl border border-indigo-500/20 text-[10px] font-mono text-indigo-300/80 overflow-auto max-h-[300px]">
                    {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '// No new state'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-800 mt-6">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><LuGlobe size={14} /> {selectedLog.ip_address}</span>
                <span className="flex items-center gap-1.5"><LuCalendar size={14} /> {formatDate(selectedLog.created_at)}</span>
              </div>
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

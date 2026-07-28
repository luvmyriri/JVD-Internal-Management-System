import { useQuery } from '@tanstack/react-query';
import { auditLogApi } from '../../../api/admin';
import { LuShield, LuUser, LuClock, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function AuditLogsCard() {
  const navigate = useNavigate();
  const { data: logsRaw, isLoading } = useQuery({
    queryKey: ['audit-logs-widget'],
    queryFn: () => auditLogApi.list({ per_page: 5 }).then(r => r.data),
    staleTime: 1000 * 30,
  });

  const logs: any[] = (logsRaw as any)?.data ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <LuShield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Security & Audit Logs</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Real-time system activity trail</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/audit-logs')}
          className="text-xs font-bold text-slate-600 hover:text-slate-700 dark:text-slate-400 uppercase tracking-wider"
        >
          Audit Trail &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-xs font-medium">
          No audit logs recorded recently.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.slice(0, 4).map((log: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                  <LuUser size={12} />
                </div>
                <div>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {log.user_name || log.user?.first_name || 'System User'}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-medium">
                    {log.action || log.event || 'System Action'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                <LuClock size={10} /> {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

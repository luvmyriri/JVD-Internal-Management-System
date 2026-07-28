import { useQuery } from '@tanstack/react-query';
import { passportCaseApi } from '../../../api/travel';
import { LuGlobe, LuFileText, LuLoader } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

export default function PassportCasesCard() {
  const navigate = useNavigate();
  const { data: casesRaw, isLoading } = useQuery({
    queryKey: ['passport-cases-widget'],
    queryFn: () => passportCaseApi.list({ per_page: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const cases: any[] = (casesRaw as any)?.data ?? [];
  const pending = cases.filter(c => c.status === 'pending' || c.status === 'submitted');
  const completed = cases.filter(c => c.status === 'issued' || c.status === 'completed');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <LuGlobe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Passport & Visa Processing</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Customer visa applications & documents</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/travel/passporting')}
          className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 uppercase tracking-wider"
        >
          View Cases &rarr;
        </button>
      </div>

      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <LuLoader className="w-6 h-6 animate-spin text-sky-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 rounded-2xl border border-sky-100 dark:border-sky-900/30">
            <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest block">In Review / Processing</span>
            <p className="text-2xl font-black text-sky-700 dark:text-sky-300 mt-1">{pending.length}</p>
            <p className="text-[10px] text-sky-600/80 font-bold uppercase tracking-tight mt-1">Pending Verification</p>
          </div>

          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Issued / Approved</span>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{completed.length}</p>
            <p className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-tight mt-1">Ready for Delivery</p>
          </div>
        </div>
      )}
    </div>
  );
}

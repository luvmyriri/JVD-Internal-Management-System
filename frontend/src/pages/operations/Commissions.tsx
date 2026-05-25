import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LuSignature, LuSearch, LuPlus, LuX } from 'react-icons/lu';
import { Eye } from 'lucide-react';
import { commissionApi } from '../../api/operations';
import type { Commission } from '../../types';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  released: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function CommissionDetailModal({ commission, onClose }: { commission: Commission; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shadow-sm">
              <LuSignature size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Commission #{commission.serial_no}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={commission.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
            <LuX size={20} />
          </button>
        </div>

        <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commissioner</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{commission.commissioner_name}</h3>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{commission.date}</h3>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Travel Items</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Travel Date</th>
                    <th className="px-6 py-4 font-semibold">Destination</th>
                    <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {commission.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{item.travel_date}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{item.destination}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300 text-right">{item.quantity}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300 text-right">₱ {item.amount?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!commission.items || commission.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Commissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => commissionApi.getAll(),
  });

  // Handle ApiResponse structure where data is inside response.data
  const commissions: Commission[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = commissions.filter((c) =>
    c.commissioner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.serial_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-widest">
            <LuSignature size={18} /> Operations Module
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Commissions</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search serial no or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
            <LuPlus size={18} /> New Commission
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-6 rounded-tl-[2rem]">Serial No.</th>
                <th className="px-8 py-6">Commissioner</th>
                <th className="px-8 py-6">Date</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right rounded-tr-[2rem]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">Loading commissions...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">No commissions found.</td></tr>
              ) : (
                filtered.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">{commission.serial_no}</td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">{commission.commissioner_name}</td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">{commission.date}</td>
                    <td className="px-8 py-5"><StatusBadge status={commission.status} /></td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setSelectedCommission(commission)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCommission && (
        <CommissionDetailModal commission={selectedCommission} onClose={() => setSelectedCommission(null)} />
      )}
    </div>
  );
}

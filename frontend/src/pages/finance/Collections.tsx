import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuBanknote, LuSearch, LuPlus, LuX } from 'react-icons/lu';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { collectionApi } from '../../api/finance';
import type { Collection } from '../../types';
import { Modal, Button } from '../../components/ui';

const statusStyles: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function CreateCollectionModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_name: '',
    date: new Date().toISOString().split('T')[0],
    travel_date: new Date().toISOString().split('T')[0],
    pick_up: '',
    drop_off: '',
    rate: 0,
    status: 'open' as const,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => collectionApi.create(data),
    onSuccess: () => {
      toast.success('Collection created successfully');
      qc.invalidateQueries({ queryKey: ['collections'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to create collection');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="New Collection" size="md">
      <form onSubmit={handleSubmit} className="space-y-6 p-2">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Name</label>
          <input
            type="text"
            required
            value={form.client_name}
            onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="e.g. John Doe"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Travel Date</label>
            <input
              type="date"
              required
              value={form.travel_date}
              onChange={e => setForm(p => ({ ...p, travel_date: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pick Up</label>
            <input
              type="text"
              value={form.pick_up}
              onChange={e => setForm(p => ({ ...p, pick_up: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Manila"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Drop Off</label>
            <input
              type="text"
              value={form.drop_off}
              onChange={e => setForm(p => ({ ...p, drop_off: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Baguio"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rate (₱)</label>
            <input
              type="number"
              required
              min="0"
              value={form.rate}
              onChange={e => setForm(p => ({ ...p, rate: Number(e.target.value) }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as 'open' | 'completed' }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-transparent"
            >
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Create Collection
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CollectionDetailModal({ collection, onClose }: { collection: Collection; onClose: () => void }) {
  const totalPaid = collection.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalRate = collection.rate || 0;
  const balance = totalRate - totalPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 shadow-sm">
              <LuBanknote size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Collection #{collection.id}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={collection.status} />
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
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Name</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{collection.client_name}</h3>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Date</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{collection.travel_date}</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Route</p>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><span className="font-medium text-gray-900 dark:text-white">From:</span> {collection.pick_up || 'TBA'}</p>
                <p><span className="font-medium text-gray-900 dark:text-white">To:</span> {collection.drop_off || 'TBA'}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate Information</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Rate: <span className="font-bold text-gray-900 dark:text-white">₱ {totalRate.toLocaleString()}</span></p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid: <span className="font-bold text-emerald-600 dark:text-emerald-400">₱ {totalPaid.toLocaleString()}</span></p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Balance: <span className="font-bold text-red-600 dark:text-red-400">₱ {balance.toLocaleString()}</span></p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Payment History</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Method</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount</th>
                    <th className="px-6 py-4 font-semibold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {collection.payments?.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{payment.payment_date}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300">{payment.payment_method}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300 text-right">₱ {Number(payment.amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300 text-right">₱ {Number(payment.balance).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!collection.payments || collection.payments.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No payments found</td>
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

export default function Collections() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionApi.getAll(),
  });

  const collections: Collection[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = collections.filter((c) =>
    c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pick_up?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.drop_off?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-teal-600 dark:text-teal-500 mb-2 uppercase tracking-widest">
            <LuBanknote size={18} /> Accounting Module
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Collections</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search client or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
            />
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-teal-600/20 active:scale-95 cursor-pointer">
            <LuPlus size={18} /> New Collection
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-55 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-6 rounded-tl-[2rem]">Client</th>
                <th className="px-8 py-6">Travel Date</th>
                <th className="px-8 py-6">Route</th>
                <th className="px-8 py-6 text-right">Rate</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right rounded-tr-[2rem]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">Loading collections...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">No collections found.</td></tr>
              ) : (
                filtered.map((collection) => (
                  <tr key={collection.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">{collection.client_name}</td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">{collection.travel_date}</td>
                    <td className="px-8 py-5 text-gray-600 dark:text-gray-300">
                      {collection.pick_up && collection.drop_off 
                        ? `${collection.pick_up} → ${collection.drop_off}` 
                        : 'TBA'}
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-gray-900 dark:text-white">₱ {collection.rate?.toLocaleString() || 0}</td>
                    <td className="px-8 py-5"><StatusBadge status={collection.status} /></td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => setSelectedCollection(collection)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all cursor-pointer">
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

      {selectedCollection && (
        <CollectionDetailModal collection={selectedCollection} onClose={() => setSelectedCollection(null)} />
      )}

      {showCreate && (
        <CreateCollectionModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

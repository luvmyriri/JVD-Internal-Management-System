import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuSignature, LuSearch, LuPlus, LuX, LuNavigation, LuTrash2, LuChevronRight } from 'react-icons/lu';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { commissionApi } from '../../api/operations';
import type { Commission } from '../../types';
import { Modal, Button } from '../../components/ui';

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

interface NewCommissionItem {
  travel_date: string;
  destination: string;
  quantity: number;
  amount: number;
}

function CreateCommissionModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    commissioner_name: '',
    serial_no: `CMS-${new Date().getFullYear()}${(Math.floor(Math.random() * 100000)).toString().padStart(5, '0')}`,
    date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<NewCommissionItem[]>([]);
  const [newItem, setNewItem] = useState<NewCommissionItem>({
    travel_date: new Date().toISOString().split('T')[0],
    destination: '',
    quantity: 1,
    amount: 0,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => commissionApi.create(data),
    onSuccess: () => {
      toast.success('Commission created successfully');
      qc.invalidateQueries({ queryKey: ['commissions'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create commission');
    },
  });

  const handleAddItem = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newItem.destination) {
      toast.error('Please enter a destination for the item');
      return;
    }
    if (newItem.quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    if (newItem.amount < 0) {
      toast.error('Amount cannot be negative');
      return;
    }

    setItems(prev => [...prev, {
      ...newItem,
      quantity: Number(newItem.quantity),
      amount: Number(newItem.amount)
    }]);

    // Reset mini form
    setNewItem({
      travel_date: new Date().toISOString().split('T')[0],
      destination: '',
      quantity: 1,
      amount: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Please add at least one travel item');
      return;
    }

    const payload = {
      ...form,
      items
    };

    mutation.mutate(payload);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="New Commission" size="xl">
      <form onSubmit={handleSubmit} className="space-y-8 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {/* Section 1: Commissioner Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuSignature size={14} /> Commissioner Information</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Commissioner Name</label>
                <input
                  type="text"
                  required
                  value={form.commissioner_name}
                  onChange={e => setForm(p => ({ ...p, commissioner_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Serial Number</label>
                <input
                  type="text"
                  readOnly
                  value={form.serial_no}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed focus:outline-none"
                  placeholder="Auto-generated"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Commission Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Section 2: Items Dynamic Form */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuNavigation size={14} /> Add Travel Items</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          
          <div className="p-4 pt-0 space-y-4">
            <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end border border-gray-100 dark:border-gray-800">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Travel Date</label>
                <input
                  type="date"
                  value={newItem.travel_date}
                  onChange={e => setNewItem(p => ({ ...p, travel_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination</label>
                <input
                  type="text"
                  value={newItem.destination}
                  onChange={e => setNewItem(p => ({ ...p, destination: e.target.value }))}
                  placeholder="e.g. San Fernando, Pampanga"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={e => setNewItem(p => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2 flex gap-2 items-center">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.amount}
                    onChange={e => setNewItem(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer mt-7"
                >
                  <LuPlus size={20} />
                </button>
              </div>
            </div>

            {/* Current Items List Table */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Added Items ({items.length})</label>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                    <tr>
                      <th className="px-6 py-4">Travel Date</th>
                      <th className="px-6 py-4">Destination</th>
                      <th className="px-6 py-4 text-right">Quantity</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-55/50 dark:hover:bg-gray-800/30">
                        <td className="px-6 py-4.5 text-gray-900 dark:text-white">{item.travel_date}</td>
                        <td className="px-6 py-4.5 text-gray-900 dark:text-white">{item.destination}</td>
                        <td className="px-6 py-4.5 text-right text-gray-600 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-6 py-4.5 text-right text-gray-900 dark:text-white font-bold">₱ {item.amount.toLocaleString()}</td>
                        <td className="px-6 py-4.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                          >
                            <LuTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          No travel items added yet. Enter item details above and click the (+) button.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </details>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} disabled={items.length === 0}>
            Create Commission
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Commissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => commissionApi.getAll(),
  });

  // Handle ApiResponse structure where data is inside response.data
  const commissions: Commission[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = commissions.filter((c) =>
    c.commissioner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.serial_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-widest">
            <LuSignature size={18} /> Operations Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Commissions</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="relative group w-full sm:w-auto">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search serial no or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-4 py-3 w-full sm:w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer">
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

      {showCreate && (
        <CreateCommissionModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

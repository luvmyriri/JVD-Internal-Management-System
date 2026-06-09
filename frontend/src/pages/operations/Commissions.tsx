import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuSignature, LuSearch, LuPlus, LuX,
  LuNavigation, LuTrash2, LuChevronRight,
  LuEye, LuClock, LuActivity, LuFileCheck
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { commissionApi } from '../../api/operations';
import type { Commission } from '../../types';
import { Modal, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/users';

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    released: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    draft: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
    approved: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
  };
  const icons: any = {
    released: <LuFileCheck className="w-3.5 h-3.5" />,
    draft: <LuClock className="w-3.5 h-3.5" />,
    approved: <LuActivity className="w-3.5 h-3.5" />,
  };

  const s = status || 'draft';

  return (
    <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[s] || styles.draft}`}>
      {icons[s] || icons.draft}
      {s.replace('_', ' ')}
    </span>
  );
}

function CommissionDetailModal({ commission, onClose }: { commission: Commission; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  const approveMutation = useMutation({
    mutationFn: (id: number) => commissionApi.update(id, { status: 'approved' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Commission approved and forwarded to Cash Budgets!');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve commission');
    }
  });

  const canApprove = (user?.tags?.includes('process:approve_commission') || user?.tags?.includes('access:general')) && commission.status === 'draft';

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
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">
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

        <div className="p-8 px-10 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-8 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
            Close
          </button>
          {canApprove && (
            <button
              onClick={() => approveMutation.mutate(commission.id)}
              disabled={approveMutation.isPending}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve Commission'}
            </button>
          )}
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
  const { user } = useAuth();

  const isAdmin = !!(user?.tags?.includes('access:general') || user?.tags?.includes('access:commissions:general'));

  // Fetch users for selection if admin
  const { data: usersRes } = useQuery({
    queryKey: ['users-commission-select'],
    queryFn: () => userApi.list({ per_page: 999 }),
    enabled: isAdmin,
  });

  const users = usersRes?.data?.data || [];

  const [form, setForm] = useState({
    commissioner_name: isAdmin ? '' : `${user?.first_name || ''} ${user?.last_name || ''}`,
    employee_id: isAdmin ? '' : String(user?.id || ''),
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
      toast.success('Commission request submitted successfully');
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

    if (isAdmin && !form.employee_id) {
      toast.error('Please select an employee for the commission');
      return;
    }

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
    <Modal isOpen={true} onClose={onClose} title="Request Commission" size="xl">
      <form onSubmit={handleSubmit} className="space-y-8 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {/* Section 1: Commissioner Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span className="flex items-center gap-2"><LuSignature size={14} /> Commissioner Information</span>
            <LuChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400" />
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isAdmin ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Employee</label>
                  <select
                    required
                    value={form.employee_id}
                    onChange={e => {
                      const selectedUser = users.find((u: any) => String(u.id) === e.target.value);
                      setForm(p => ({
                        ...p,
                        employee_id: e.target.value,
                        commissioner_name: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : ''
                      }));
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Employee --</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Commissioner Name</label>
                  <input
                    type="text"
                    readOnly
                    value={form.commissioner_name}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-750 text-gray-450 dark:text-gray-400 rounded-2xl text-sm font-bold cursor-not-allowed focus:outline-none"
                  />
                </div>
              )}
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
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'released'>('all');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => commissionApi.getAll(),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  // Handle ApiResponse structure where data is inside response.data
  const commissions: Commission[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const hasGeneralAccess = !!(user?.tags?.includes('access:general') || user?.tags?.includes('access:commissions:general'));
  const isGeneralEmployee = !hasGeneralAccess;

  const filtered = commissions.filter((c) => {
    // General employees only see their own requests
    if (isGeneralEmployee && c.employee_id !== user?.id) {
      return false;
    }
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      c.commissioner_name?.toLowerCase().includes(q) ||
      c.serial_no?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary counts
  const counts = {
    all: filtered.length,
    draft: filtered.filter(c => c.status === 'draft').length,
    approved: filtered.filter(c => c.status === 'approved').length,
    released: filtered.filter(c => c.status === 'released').length,
  };

  const getRowIndicatorStyle = (_status?: string) => {
    return '';
  };

  const STATUS_FILTERS = ['all', 'draft', 'approved', 'released'] as const;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Commissions</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
        >
          <LuPlus className="w-4 h-4" /> New Commission
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
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Ready to Release</p>
            <p className="text-2xl font-black leading-none">{counts.approved || 0}</p>
          </div>
        </div>

        {/* KPI 3: Released */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuFileCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Released
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Paid Commissions</p>
            <p className="text-2xl font-black leading-none">{counts.released || 0}</p>
          </div>
        </div>

        {/* KPI 4: Total */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-lg shadow-purple-300/30 dark:shadow-purple-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuSignature className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Total
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Total Records</p>
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
              placeholder="Search serial no or name..."
              className="pl-11 pr-4 py-3 bg-gray-55 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
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
        </div>

        {/* Data Table */}
        <div className={`relative overflow-x-auto custom-scrollbar ${filtered.length > 0 ? 'min-h-[350px]' : ''}`}>
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-l-2xl">Serial No.</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Commissioner</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right rounded-r-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className={`transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</td>
                </tr>
              ) : (
                filtered.map((commission) => {
                  const totalAmt = commission.items?.reduce((sum, item) => sum + (Number(item.amount || 0) * Number(item.quantity || 1)), 0) || 0;
                  return (
                    <tr key={commission.id} className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${getRowIndicatorStyle(commission.status)}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            <LuSignature className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">{commission.serial_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">
                          {commission.commissioner_name}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">
                          {commission.date || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-gray-950 dark:text-white leading-tight">
                          ₱{totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={commission.status} />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedCommission(commission)}
                        >
                          <LuEye className="w-4 h-4 mr-2" /> Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
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

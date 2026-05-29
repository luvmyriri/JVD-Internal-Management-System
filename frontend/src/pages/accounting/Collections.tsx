import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuSearch, LuFileCheck, LuEye,
  LuClock, LuX,
  LuActivity, LuBanknote, LuPlus
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { collectionApi } from '../../api/finance';
import type { Collection } from '../../types';
import { Modal, Button } from '../../components/ui';

const SERVICE_TYPES = [
  'Bus Rental',
  'Educational Tour',
  'Tour Package',
  'Visa Processing',
  'Joiners',
  'Booking',
  'Other',
] as const;

function CreateCollectionModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_name: '',
    service_type: '',
    other_service_type: '',
    date: new Date().toISOString().split('T')[0],
    travel_date: new Date().toISOString().split('T')[0],
    pick_up: '',
    drop_off: '',
    rate: 0,
    status: 'open' as 'open' | 'completed',
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

  const isOther = form.service_type === 'Other';

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
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service Type</label>
          <select
            value={form.service_type}
            onChange={e => setForm(p => ({ ...p, service_type: e.target.value, other_service_type: '' }))}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">— Select service type —</option>
            {SERVICE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {isOther && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-teal-500 uppercase tracking-widest ml-1">Specify Service Type</label>
            <input
              type="text"
              required={isOther}
              value={form.other_service_type}
              onChange={e => setForm(p => ({ ...p, other_service_type: e.target.value }))}
              className="w-full px-4 py-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service Date</label>
            <input
              type="date"
              required
              value={form.travel_date}
              onChange={e => setForm(p => ({ ...p, travel_date: e.target.value }))}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rate / Amount</label>
          <input
            type="number"
            required
            value={form.rate || ''}
            onChange={e => setForm(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>Create Collection</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Collections() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    amount: 0,
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);



  const { data: responseData, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['collections', { search: debouncedSearch, status: statusFilter }],
    queryFn: async () => {
      const response = await collectionApi.getAll({
        search: debouncedSearch,
        status: statusFilter
      });
      return response;
    },
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const collections: Collection[] = responseData?.data || [];
  const stats = responseData?.stats || null;

  const paymentMutation = useMutation({
    mutationFn: (data: any) => collectionApi.addPayment(selectedCollection!.id, data),
    onSuccess: (res) => {
      toast.success('Payment added successfully');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedCollection(res.data);
      setShowPaymentModal(false);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        amount: 0,
      });
    },
    onError: () => {
      toast.error('Failed to add payment');
    }
  });

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.amount <= 0) return toast.error('Amount must be greater than 0');
    paymentMutation.mutate(paymentForm);
  };

  const remarksMutation = useMutation({
    mutationFn: (remarks: string) => collectionApi.updateRemarks(selectedCollection!.id, remarks),
    onSuccess: (res) => {
      toast.success('Remarks updated');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedCollection(res.data);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => collectionApi.confirm(id),
    onSuccess: (res) => {
      toast.success('Collection confirmed as fully paid');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedCollection(res.data);
      setShowDetailModal(false);
    },
    onError: () => {
      toast.error('Failed to confirm collection');
    }
  });

  const handleConfirmCollection = (id: number) => {
    if (window.confirm('Are you sure you want to confirm this transaction as fully paid? This will also mark the linked invoice as paid.')) {
      confirmMutation.mutate(id);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
      completed: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
      pending: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
      partial: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
      overdue: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
    };
    const icons: any = {
      completed: <LuFileCheck className="w-3 h-3" />,
      pending: <LuClock className="w-3 h-3" />,
      partial: <LuActivity className="w-3 h-3" />,
      overdue: <LuX className="w-3 h-3" />,
    };

    const s = status || 'pending';

    return (
      <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[s] || styles.pending}`}>
        {icons[s] || icons.pending}
        {s.replace('_', ' ')}
      </span>
    );
  };

  const getRowIndicatorStyle = (status?: string) => {
    switch (status) {
      case 'overdue': return 'border-l-4 border-rose-500';
      case 'pending': return 'border-l-4 border-amber-400';
      case 'partial': return 'border-l-4 border-blue-500';
      default: return 'border-l-4 border-transparent hover:border-gray-200';
    }
  };

  return (
    <div className="space-y-8 pb-12 mt-10">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Collections</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
        >
          <LuPlus className="w-4 h-4" /> New Collection
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0 relative z-20 no-print">
        
        {/* KPI 1: Pending */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuClock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Pending
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Pending Accounts</p>
            <p className="text-2xl font-black leading-none">{stats?.pending || 0}</p>
          </div>
        </div>

        {/* KPI 2: Overdue */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-rose-300/30 dark:shadow-rose-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuX className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Overdue
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Overdue Accounts</p>
            <p className="text-2xl font-black leading-none">{stats?.overdue || 0}</p>
          </div>
        </div>

        {/* KPI 3: Partial */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-300/30 dark:shadow-blue-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuActivity className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Partial
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Partially Paid</p>
            <p className="text-2xl font-black leading-none">{stats?.partial || 0}</p>
          </div>
        </div>

        {/* KPI 4: Completed */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LuFileCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white shadow-sm uppercase tracking-wider">
              Completed
            </div>
          </div>
          <div className="mt-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Completed This Month</p>
            <p className="text-2xl font-black leading-none">{stats?.completed || 0}</p>
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
              placeholder="Search Client or Invoice #..."
              className="pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto hide-scrollbar flex-nowrap w-full sm:w-auto bg-gray-50 dark:bg-gray-800/70 p-1.5 rounded-full border border-gray-100/50 dark:border-gray-700/30">
            {['all', 'pending', 'partial', 'overdue', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className={`relative hidden md:block overflow-x-auto custom-scrollbar ${collections.length > 0 ? 'min-h-[350px]' : ''}`}>
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-l-2xl">Client & Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount / Balance</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right rounded-r-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</td>
                </tr>
              ) : (
                collections.map((coll) => (
                  <tr key={coll.id} className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${getRowIndicatorStyle(coll.collection_status)}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <LuBanknote className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">{coll.client_name}</p>
                          {coll.auto_generated && coll.invoice ? (
                            <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-widest">
                              From: {coll.invoice.invoice_number}
                            </span>
                          ) : (
                            <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 uppercase tracking-widest">
                              Manual Entry
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">
                        {coll.service_type === 'Other' ? coll.other_service_type : coll.service_type || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-gray-950 dark:text-white leading-tight">Total: ₱{Number(coll.billing_amount || coll.rate || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">Bal: ₱{Number(coll.remaining_balance ?? coll.rate).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className={`text-xs font-bold leading-tight ${coll.collection_status === 'overdue' ? 'text-rose-600' : 'text-gray-950 dark:text-gray-200'}`}>
                        {coll.due_date ? new Date(coll.due_date).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">Service Date</p>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={coll.collection_status || 'pending'} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setSelectedCollection(coll); setShowDetailModal(true); }}
                      >
                        <LuEye className="w-4 h-4 mr-2" /> View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCollection && (
        <Modal isOpen={true} onClose={() => setShowDetailModal(false)} title="Collection Details" size="xl">
          <div className="p-6 space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedCollection.client_name}</h2>
                <p className="text-sm font-bold text-gray-500">
                  {selectedCollection.service_type === 'Other' ? selectedCollection.other_service_type : selectedCollection.service_type}
                </p>
                {selectedCollection.auto_generated && selectedCollection.invoice && (
                  <p className="text-xs font-bold text-blue-600 mt-2">Linked to Invoice: {selectedCollection.invoice.invoice_number}</p>
                )}
              </div>
              <div className="text-right">
                <StatusBadge status={selectedCollection.collection_status || 'pending'} />
                <p className="text-xs font-bold text-gray-500 mt-2">Due (Service Date): {selectedCollection.due_date ? new Date(selectedCollection.due_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billing Amount</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-1">₱{Number(selectedCollection.billing_amount || selectedCollection.rate || 0).toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Paid</p>
                <p className="text-xl font-black text-blue-600 mt-1">₱{Number(selectedCollection.paid_amount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Remaining Balance</p>
                <p className="text-xl font-black text-amber-600 mt-1">₱{Number(selectedCollection.remaining_balance ?? selectedCollection.rate).toLocaleString()}</p>
              </div>
            </div>

            {/* Remarks Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Remarks / Notes</label>
              <textarea
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                rows={3}
                defaultValue={selectedCollection.remarks || ''}
                onBlur={(e) => {
                  if (e.target.value !== selectedCollection.remarks) {
                    remarksMutation.mutate(e.target.value);
                  }
                }}
                placeholder="Add collection notes here... (Saves automatically on blur)"
              />
            </div>

            {/* Payments Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Payment History</h3>
                {selectedCollection.collection_status !== 'completed' && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                      onClick={() => handleConfirmCollection(selectedCollection.id)}
                      isLoading={confirmMutation.isPending}
                    >
                      <LuFileCheck className="w-4 h-4 mr-1" /> Confirm Transaction
                    </Button>
                    <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                      <LuPlus className="w-4 h-4 mr-1" /> Add Payment
                    </Button>
                  </div>
                )}
              </div>

              {selectedCollection.payments && selectedCollection.payments.length > 0 ? (
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 font-bold text-gray-500">Date</th>
                        <th className="px-4 py-3 font-bold text-gray-500">Method</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedCollection.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-medium">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">{p.payment_method}</td>
                          <td className="px-4 py-3 font-black text-right">₱{Number(p.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-bold text-gray-400">No payments recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && selectedCollection && (
        <Modal isOpen={true} onClose={() => setShowPaymentModal(false)} title="Record Payment" size="sm">
          <form onSubmit={handleAddPayment} className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-6">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Current Balance</p>
              <p className="text-2xl font-black text-blue-600">₱{Number(selectedCollection.remaining_balance ?? selectedCollection.rate).toLocaleString()}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))}
                  className="w-full mt-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full mt-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="GCash">GCash</option>
                  <option value="Check">Check</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedCollection.remaining_balance ?? selectedCollection.rate}
                  value={paymentForm.amount || ''}
                  onChange={e => setPaymentForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full mt-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button type="submit" isLoading={paymentMutation.isPending}>Save Payment</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Modal */}
      {showCreateModal && <CreateCollectionModal onClose={() => setShowCreateModal(false)} />}

    </div>
  );
}

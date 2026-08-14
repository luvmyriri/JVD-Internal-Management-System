import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  LuSearch, LuFileCheck, LuEye,
  LuClock, LuX,
  LuActivity, LuBanknote, LuPlus,
  LuMail, LuDownload, LuExternalLink
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { collectionApi } from '../../api/finance';
import client from '../../api/client';
import { customerApi } from '../../api/customers';
import type { Collection, CollectionPayment } from '../../types';
import { Modal, Button } from '../../components/ui';
import { DataTable, EmptyState, TimeframeFilter, ExportButton, type Column, type DateRangeValue } from '../../components/ds';
import { exportToCsv, datedFilename } from '../../utils/exportCsv';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import RefundWorkflowPanel from '../../components/accounting/RefundWorkflowPanel';

const SERVICE_TYPES = [
  'Bus Rental',
  'Educational Tour',
  'Tour Package',
  'Visa Processing',
  'Joiners',
  'Booking',
  'Other',
] as const;

/** Payment History sub-table inside the Collection Details modal (roadmap 3.7). */
const paymentColumns: Column<CollectionPayment>[] = [
  {
    key: 'payment_date',
    header: 'Date',
    render: (p) => <span className="font-medium">{new Date(p.payment_date).toLocaleDateString()}</span>,
  },
  {
    key: 'payment_method',
    header: 'Method',
    render: (p) => <span className="font-medium">{p.payment_method}</span>,
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (p) => <span className="font-black">₱{Number(p.amount).toLocaleString()}</span>,
  },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    pending: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
    partial: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
    overdue: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
  };
  const icons: Record<string, React.ReactNode> = {
    completed: <LuFileCheck className="w-3 h-3" />,
    pending: <LuClock className="w-3 h-3" />,
    partial: <LuActivity className="w-3 h-3" />,
    overdue: <LuX className="w-3 h-3" />,
  };
  const normalizedStatus = status || 'pending';

  return (
    <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[normalizedStatus] || styles.pending}`}>
      {icons[normalizedStatus] || icons.pending}
      {normalizedStatus.replace('_', ' ')}
    </span>
  );
}

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
    rate: '',
  });

  // --- Autocomplete state ---
  const [clientSearch, setClientSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-suggest', clientSearch],
    queryFn: async () => {
      if (!clientSearch.trim()) return [];
      const res = await customerApi.list({ search: clientSearch, per_page: 8 });
      return res.data?.data ?? [];
    },
    enabled: clientSearch.length > 0,
    staleTime: 5000,
  });

  const suggestions: any[] = customersData ?? [];

  const handleClientInput = (value: string) => {
    setClientSearch(value);
    setForm(p => ({ ...p, client_name: value }));
    setShowSuggestions(true);
  };

  const handleSelectCustomer = (customer: any) => {
    const fullName = `${customer.first_name} ${customer.last_name}`.trim();
    setForm(p => ({ ...p, client_name: fullName }));
    setClientSearch(fullName);
    setShowSuggestions(false);
  };

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
    mutation.mutate({
      ...form,
      rate: Number(parseMoneyInput(form.rate) || 0),
    });
  };

  const isOther = form.service_type === 'Other';

  return (
    <Modal isOpen={true} onClose={onClose} title="New Collection" size="md">
      <form onSubmit={handleSubmit} className="space-y-6 p-2">
        {/* Client Name with Autocomplete */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Name</label>
          <div className="relative">
            <input
              type="text"
              required
              autoComplete="off"
              value={form.client_name}
              onChange={e => handleClientInput(e.target.value)}
              onFocus={() => clientSearch.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Type to search customers..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
                <p className="px-4 pt-3 pb-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Matching Customers
                </p>
                <ul className="pb-2 max-h-48 overflow-y-auto">
                  {suggestions.map((customer: any) => {
                    const fullName = `${customer.first_name} ${customer.last_name}`.trim();
                    return (
                      <li
                        key={customer.id}
                        onMouseDown={() => handleSelectCustomer(customer)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-black shrink-0 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                          {customer.first_name?.[0]?.toUpperCase()}{customer.last_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{fullName}</p>
                          {customer.email && (
                            <p className="text-[10px] text-gray-400 truncate">{customer.email}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
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
            type="text"
            inputMode="decimal"
            required
            value={form.rate}
            onChange={e => {
              const clean = parseMoneyInput(e.target.value);
              if ((clean.split('.').length - 1) > 1) return;
              const formatted = formatMoneyInput(e.target.value);
              setForm(p => ({ ...p, rate: formatted }));
            }}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
              }
            }}
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
  const { user, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const canViewCollections = ['super_admin', 'executive_vice_president', 'operations_manager', 'accounting_executive'].includes(user?.role || '')
    || hasPermission('accounting', 'can_view');
  const canCreateCollections = ['super_admin', 'executive_vice_president', 'accounting_executive'].includes(user?.role || '')
    || hasPermission('accounting', 'can_create');
  const canEditCollections = ['super_admin', 'executive_vice_president', 'accounting_executive'].includes(user?.role || '')
    || hasPermission('accounting', 'can_edit');

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });

  // Modal States
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDownloadingSoa, setIsDownloadingSoa] = useState(false);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    amount: '',
    idempotency_key: crypto.randomUUID(),
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
    queryKey: ['collections', { search: debouncedSearch, status: statusFilter, from: dateRange.from, to: dateRange.to }],
    queryFn: async () => {
      if (!canViewCollections) return { data: [], stats: null };
      const response = await collectionApi.getAll({
        search: debouncedSearch,
        status: statusFilter,
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
      });
      return response;
    },
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const collections: Collection[] = responseData?.data || [];
  const stats = responseData?.stats || null;

  // Billing links preserve the exact receivable identity. Fetching by ID also
  // works for completed records, which the default work queue intentionally hides.
  useEffect(() => {
    const collectionId = Number(searchParams.get('collection_id'));
    if (!canViewCollections || !Number.isInteger(collectionId) || collectionId <= 0) return;

    let active = true;
    collectionApi.getById(collectionId)
      .then((collection) => {
        if (!active) return;
        setSelectedCollection(collection);
        setShowDetailModal(true);
      })
      .catch(() => {
        if (active) toast.error('The linked collection could not be opened.');
      });

    return () => { active = false; };
  }, [canViewCollections, searchParams]);

  const paymentMutation = useMutation({
    mutationFn: (data: any) => collectionApi.addPayment(selectedCollection!.id, data),
    onSuccess: (res) => {
      toast.success('Payment added successfully');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      setSelectedCollection(res.data);
      setShowPaymentModal(false);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        amount: '',
        idempotency_key: crypto.randomUUID(),
      });
    },
    onError: () => {
      toast.error('Failed to add payment');
    }
  });

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseMoneyInput(paymentForm.amount);
    if (paymentForm.amount === '' || Number(cleanAmount) <= 0) return toast.error('Amount must be greater than 0');
    const maxVal = selectedCollection ? (selectedCollection.remaining_balance ?? selectedCollection.rate) : 0;
    if (Number(cleanAmount) > Number(maxVal)) {
      return toast.error(`Amount cannot exceed the remaining balance of ₱${Number(maxVal).toLocaleString()}`);
    }
    paymentMutation.mutate({
      ...paymentForm,
      amount: Number(cleanAmount)
    });
  };

  const remarksMutation = useMutation({
    mutationFn: (remarks: string) => collectionApi.updateRemarks(selectedCollection!.id, remarks),
    onSuccess: (res) => {
      toast.success('Remarks updated');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedCollection(res.data);
    }
  });

  const sendSoaMutation = useMutation({
    mutationFn: (id: number) => collectionApi.sendSoa(id),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'SOA email notification sent successfully');
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.message || 'Failed to send SOA email notification';
      toast.error(errMsg);
    }
  });

  const handleSendSoaEmail = (id: number) => {
    sendSoaMutation.mutate(id);
  };

  const handleViewSoa = async (id: number) => {
    // Open the window SYNCHRONOUSLY first (before any await) to avoid popup blockers.
    // Browsers only allow window.open() as a direct result of a user gesture.
    const newWin = window.open('', '_blank');
    if (!newWin) {
      toast.error('Popup blocked. Please allow popups for this site and try again.');
      return;
    }
    newWin.document.write('<html><body style="margin:0;background:#333;display:flex;align-items:center;justify-content:center;height:100vh;"><p style="color:#fff;font-family:sans-serif;font-size:14px;">Loading SOA PDF...</p></body></html>');
    try {
      const blob = await client.get(`/collections/${id}/view-soa`, { responseType: 'blob' }).then(r => r.data);
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      newWin.location.href = blobUrl;
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      console.error(err);
      newWin.close();
      toast.error('Failed to load SOA PDF. Please try again.');
    }
  };

  const handleDownloadSoa = async (id: number) => {
    try {
      setIsDownloadingSoa(true);
      const blob = await client.get(`/collections/${id}/download-soa`, { responseType: 'blob' }).then(r => r.data);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SOA_Collection_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('SOA PDF downloaded!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download SOA PDF. Please try again.');
    } finally {
      setIsDownloadingSoa(false);
    }
  };

  const columns: Column<Collection>[] = [
    {
      key: 'client_name',
      header: 'Client & Source',
      sortable: true,
      sortValue: (coll) => coll.client_name || '',
      render: (coll) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 shadow-sm">
            <LuBanknote className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">{coll.client_name}</p>
            {coll.auto_generated && coll.invoice ? (
              <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 uppercase tracking-widest">
                From: {coll.invoice.invoice_number}
              </span>
            ) : coll.liquidation_id ? (
              <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-widest">
                From: Liquidation #{coll.liquidation_id}
              </span>
            ) : (
              <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 uppercase tracking-widest">
                Manual Entry
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'service_type',
      header: 'Service Type',
      render: (coll) => {
        const st = coll.service_type;
        const serviceName = st === 'Other' && coll.other_service_type
          ? coll.other_service_type
          : (st || coll.invoice?.items?.[0]?.service?.name || 'N/A');

        if (serviceName === 'Driver Shortage') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50">
              Driver Shortage
            </span>
          );
        }
        return (
          <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">
            {serviceName}
          </p>
        );
      },
    },
    {
      key: 'billing_amount',
      header: 'Amount / Balance',
      sortable: true,
      sortValue: (coll) => Number(coll.billing_amount || coll.rate || 0),
      render: (coll) => (
        <div>
          <p className="text-sm font-black text-gray-950 dark:text-white leading-tight">Total: ₱{Number(coll.billing_amount || coll.rate || 0).toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">Bal: ₱{Number(coll.remaining_balance ?? coll.rate).toLocaleString()}</p>
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      sortValue: (coll) => coll.due_date || '',
      render: (coll) => (
        <div>
          <p className={`text-xs font-bold leading-tight ${coll.collection_status === 'overdue' ? 'text-rose-600' : 'text-gray-950 dark:text-gray-200'}`}>
            {coll.due_date ? new Date(coll.due_date).toLocaleDateString() : 'N/A'}
          </p>
          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">Service Date</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (coll) => coll.collection_status || 'pending',
      render: (coll) => <StatusBadge status={coll.collection_status || 'pending'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (coll) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setSelectedCollection(coll); setShowDetailModal(true); }}
          >
            <LuEye className="w-4 h-4 mr-2" /> View Details
          </Button>
        </div>
      ),


    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Collections</h1>
        {canCreateCollections && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
          >
            <LuPlus className="w-4 h-4" /> New Collection
          </button>
        )}
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

        {/* KPI 2: Partial */}

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

        {/* KPI 3: Overdue */}
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

          {/* Timeframe filter */}
          <TimeframeFilter value={dateRange} onChange={setDateRange} className="w-full sm:w-auto sm:ml-auto" />
          <ExportButton
            disabled={collections.length === 0}
            onClick={() => exportToCsv(datedFilename('collections'), collections, [
              { header: 'Client', value: (c) => c.client_name },
              { header: 'Service Type', value: (c) => (c.service_type === 'Other' && c.other_service_type ? c.other_service_type : c.service_type) },
              { header: 'Invoice #', value: (c) => c.invoice?.invoice_number ?? '' },
              { header: 'Billing Amount', value: (c) => c.billing_amount ?? c.rate ?? '' },
              { header: 'Paid', value: (c) => c.paid_amount ?? '' },
              { header: 'Remaining', value: (c) => c.remaining_balance ?? '' },
              { header: 'Status', value: (c) => c.collection_status },
              { header: 'Date', value: (c) => (c.created_at ?? '').slice(0, 10) },
            ])}
          />
        </div>

        {/* Data Table */}
        <div className={`jvd relative hidden md:block ${collections.length > 0 ? 'min-h-[350px]' : ''}`}>
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <DataTable
            columns={columns}
            data={collections}
            rowKey={(coll) => coll.id}
            empty={
              isLoading ? (
                <div className="flex flex-col items-center py-16 text-muted">
                  <LuActivity size={22} className="mb-2 animate-spin text-brand" />
                  <p className="text-sm">Loading collections…</p>
                </div>
              ) : (
                <EmptyState icon={<LuBanknote size={22} />} title="No records found" description="Collections will appear here once invoices are issued." />
              )
            }
          />
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
                {selectedCollection.liquidation_id && (
                  <p className="text-xs font-bold text-amber-600 mt-2">Linked to Driver Liquidation #{selectedCollection.liquidation_id}</p>
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
                  if (canEditCollections && e.target.value !== selectedCollection.remarks) {
                    remarksMutation.mutate(e.target.value);
                  }
                }}
                readOnly={!canEditCollections}
                placeholder={canEditCollections ? 'Add collection notes here... (Saves automatically on blur)' : 'No collection notes recorded.'}
              />
            </div>

            {selectedCollection.invoice_id && <RefundWorkflowPanel invoiceId={selectedCollection.invoice_id} />}

            {/* Payments Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Payment History</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/20"
                    onClick={() => handleViewSoa(selectedCollection.id)}
                  >
                    <LuExternalLink className="w-4 h-4 mr-1" /> View SOA
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900/40"
                    onClick={() => handleDownloadSoa(selectedCollection.id)}
                    isLoading={isDownloadingSoa}
                  >
                    <LuDownload className="w-4 h-4 mr-1" /> Download SOA
                  </Button>
                  {selectedCollection.collection_status !== 'completed' && (canCreateCollections || canEditCollections) && (
                    <>
                      {canEditCollections && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/20"
                          onClick={() => handleSendSoaEmail(selectedCollection.id)}
                          isLoading={sendSoaMutation.isPending}
                        >
                          <LuMail className="w-4 h-4 mr-1" /> Notify Customer
                        </Button>
                      )}
                      {canCreateCollections && (
                        <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                          <LuPlus className="w-4 h-4 mr-1" /> Add Payment
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {selectedCollection.payments && selectedCollection.payments.length > 0 ? (
                <DataTable
                  columns={paymentColumns}
                  data={selectedCollection.payments}
                  rowKey={(p) => p.id}
                  className="jvd"
                />
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
      {showPaymentModal && selectedCollection && canCreateCollections && (
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
                  type="text"
                  inputMode="decimal"
                  required
                  value={paymentForm.amount}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setPaymentForm(p => ({ ...p, amount: formatted }));
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
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
      {showCreateModal && canCreateCollections && <CreateCollectionModal onClose={() => setShowCreateModal(false)} />}

    </div>
  );
}

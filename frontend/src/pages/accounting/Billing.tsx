import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuSearch, LuPrinter, LuEye, LuFileCheck,
  LuClock, LuX, LuChevronLeft, LuChevronRight, LuDollarSign,
  LuActivity, LuPhone, LuMail, LuMapPin, LuBanknote
} from 'react-icons/lu';
import { billingApi } from '../../api/billing';
import type { Invoice } from '../../api/billing';
import { Dropdown } from '../../components/ui';

export default function Billing() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Debounce search so we don't fire a query on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 when filter changes
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  const { data: invoiceData, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['billing-invoices', { page: currentPage, search: debouncedSearch, status: statusFilter }],
    queryFn: async () => {
      const response = await billingApi.getInvoices({
        page: currentPage,
        search: debouncedSearch,
        status: statusFilter
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const invoices: Invoice[] = invoiceData?.data || [];
  const stats = invoiceData?.stats || null;
  const pagination = invoiceData?.meta || null;

  const handleMarkAsPaid = async (id: number) => {
    if (!confirm('Mark this invoice as paid?')) return;
    try {
      await billingApi.updateStatus(id, 'paid');
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      if (selectedInvoice?.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: 'paid' });
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
      paid: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
      pending_payment: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
      disbursed_budget: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50',
      cancelled: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
      partial: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
    };
    const icons: any = {
      paid: <LuFileCheck className="w-3 h-3" />,
      pending_payment: <LuClock className="w-3 h-3" />,
      disbursed_budget: <LuBanknote className="w-3 h-3" />,
      cancelled: <LuX className="w-3 h-3" />,
      partial: <LuClock className="w-3 h-3" />,
    };

    return (
      <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[status] || styles.pending_payment}`}>
        {icons[status] || icons.pending_payment}
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-12">

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0 relative z-20 no-print">

        {/* KPI 1: Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-300/30 dark:shadow-blue-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuDollarSign className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white flex items-center gap-0.5 shadow-sm uppercase tracking-wider">
              Revenue
            </div>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Total Revenue</p>
              <p className="text-2xl font-black leading-none">₱{stats?.total_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
            </div>
          </div>
        </div>

        {/* KPI 2: Pending Amount */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-300/30 dark:shadow-amber-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuClock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white flex items-center gap-0.5 shadow-sm uppercase tracking-wider">
              Outstanding
            </div>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Pending Amount</p>
              <p className="text-2xl font-black leading-none">₱{stats?.pending_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
            </div>
          </div>
        </div>

        {/* KPI 3: Total Invoices */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-300/30 dark:shadow-violet-900/30 flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default h-[90px]">
          <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuActivity className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[7.5px] font-black bg-white/25 text-white flex items-center gap-0.5 shadow-sm uppercase tracking-wider">
              Volume
            </div>
          </div>
          <div className="flex items-end justify-between mt-1">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-0.5">Total Invoices</p>
              <p className="text-2xl font-black leading-none">{stats?.invoice_count || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container (Main Panel) */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-md p-6 sm:p-8 space-y-6">

        <div className="flex flex-wrap items-center gap-4">
          {/* Pill-shaped Search Input */}
          <div className="relative w-full sm:w-72">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search Invoice # or Customer..."
              className="pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Segmented active capsules */}
          <div className="flex overflow-x-auto hide-scrollbar flex-nowrap w-full sm:w-auto bg-gray-50 dark:bg-gray-800/70 p-1.5 rounded-full border border-gray-100/50 dark:border-gray-700/30">
            {(['all', 'paid', 'pending_payment', 'partial', 'disbursed_budget'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                {status.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        {/* Data Table */}
        <div className={`relative hidden md:block overflow-x-auto custom-scrollbar ${invoices.length > 0 ? 'min-h-[350px]' : ''}`}>
          {/* Background sweep bar while refetching */}
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-l-2xl">Invoice Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</th>
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No transactions found</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="group hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <LuPrinter className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">{invoice.invoice_number}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{invoice.payment_method}</p>
                            {invoice.cash_budget_request_id && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                From Cash Budget
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-950 dark:text-gray-200 leading-tight">{invoice.customer_name || 'Walk-in Customer'}</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">Verified Account</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-bold text-gray-950 dark:text-gray-200 leading-tight">
                        {new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                        {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-base font-black text-gray-950 dark:text-white leading-tight">₱{Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-0.5">PHP Current</p>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={invoice.status} />
                      {invoice.collection && invoice.status !== 'paid' && (
                        <div className="mt-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${invoice.collection.collection_status === 'overdue' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                              invoice.collection.collection_status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            Collection: {invoice.collection.collection_status}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end">
                        <Dropdown
                          items={[
                            { label: 'View Invoice', icon: <LuEye className="w-4 h-4" />, onClick: () => { setSelectedInvoice(invoice); setShowModal(true); } },
                            ...(invoice.status === 'pending_payment' ? [{ label: 'Mark as Paid', icon: <LuFileCheck className="w-4 h-4" />, onClick: () => handleMarkAsPaid(invoice.id) }] : []),
                            ...(invoice.collection ? [{ label: 'View Collection', icon: <LuBanknote className="w-4 h-4" />, onClick: () => window.location.href = '/accounting/collections' }] : [])
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden flex flex-col gap-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-[2rem] h-32 w-full"></div>
            ))
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No transactions found</div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => { setSelectedInvoice(invoice); setShowModal(true); }}
                className="bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 p-5 rounded-[1.5rem] shadow-sm flex flex-col gap-4 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                      <LuPrinter className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="font-bold text-gray-950 dark:text-white leading-tight truncate">{invoice.invoice_number}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 truncate">{invoice.payment_method}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                    <LuChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="overflow-hidden">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-sm font-bold text-gray-950 dark:text-gray-200 truncate">{invoice.customer_name || 'Walk-in'}</p>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Date</p>
                    <p className="text-sm font-bold text-gray-950 dark:text-gray-200 truncate">
                      {new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-2 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                  <div className="flex flex-col gap-2">
                    <StatusBadge status={invoice.status} />
                    {invoice.collection && invoice.status !== 'paid' && (
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest w-fit ${invoice.collection.collection_status === 'overdue' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                          invoice.collection.collection_status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                        Collection: {invoice.collection.collection_status}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total</p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">₱{Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.last_page > 1 && (
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Showing {pagination.from} to {pagination.to} of {pagination.total} results
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-50 disabled:hover:text-gray-400 dark:disabled:hover:bg-gray-800 rounded-xl transition-all border border-gray-100/50 dark:border-gray-700/30"
              >
                <LuChevronLeft className="w-4 h-4" />
              </button>
              {pagination.last_page > 0 && [...Array(Math.min(pagination.last_page, 5))].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === i + 1
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/60 text-gray-400 dark:text-gray-500 hover:text-gray-950 dark:hover:text-white'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === pagination.last_page}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-50 disabled:hover:text-gray-400 dark:disabled:hover:bg-gray-800 rounded-xl transition-all border border-gray-100/50 dark:border-gray-700/30"
              >
                <LuChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col border border-gray-100 dark:border-gray-800">

            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${selectedInvoice.status === 'paid' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
                  {selectedInvoice.status === 'paid' ? <LuFileCheck className="w-6 h-6" /> : <LuClock className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950 dark:text-white uppercase tracking-tight leading-none">Invoice details</h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">ID: {selectedInvoice.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all border border-blue-100 dark:border-blue-900/50 flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                >
                  <LuPrinter className="w-4 h-4" /> Print
                </button>
                {selectedInvoice.status === 'pending_payment' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                    className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-2xl hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all text-gray-400 hover:text-gray-950 dark:hover:text-white"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-10" id="printable-invoice">
              <div className="flex justify-between items-start mb-12">
                <div className="flex flex-col items-start">
                  <img src="/JVDlogo-removebg-preview.png" alt="JVD Logo" className="h-16 mb-2 object-contain" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6 pl-1 pl-1">Management System</p>
                  <div className="space-y-1 pl-1 text-gray-900 dark:text-gray-100">
                    <p className="text-[11px] font-bold max-w-[300px] leading-relaxed">UNIT 6 -Aryanna Village Center Brgy 175. Susano Road Camarin, Caloocan City</p>
                    <div className="flex flex-col gap-0.5 mt-2">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="text-blue-600">PHONE:</span> 0976 4711294
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="text-blue-600">TEL:</span> 02 82938068
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">INVOICE</h2>
                  <p className="text-sm font-black text-blue-600">#{selectedInvoice.invoice_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-gray-100 dark:border-gray-800 py-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Billed To</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{selectedInvoice.customer_name || 'Walk-in Customer'}</p>
                  <div className="mt-2 space-y-1">
                    {selectedInvoice.customer_contact && (
                      <p className="text-xs text-gray-500 dark:text-gray-450 font-medium flex items-center gap-2">
                        <LuPhone className="w-3 h-3 text-blue-600" /> {selectedInvoice.customer_contact}
                      </p>
                    )}
                    {selectedInvoice.customer_email && (
                      <p className="text-xs text-gray-500 dark:text-gray-455 font-medium flex items-center gap-2">
                        <LuMail className="w-3 h-3 text-blue-600" /> {selectedInvoice.customer_email}
                      </p>
                    )}
                    {selectedInvoice.customer_address && (
                      <p className="text-xs text-gray-500 dark:text-gray-460 font-medium flex items-center gap-2">
                        <LuMapPin className="w-3 h-3 text-blue-600" /> {selectedInvoice.customer_address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Invoice Meta</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{selectedInvoice.payment_method}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold uppercase">{new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Cash Budget Banner */}
              {selectedInvoice.cash_budget_request_id && (
                <div className="mb-8 p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black text-violet-700 dark:text-violet-300 uppercase tracking-widest">Cash Budget Request</p>
                    <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5 font-medium">
                      Auto-generated from Cash Budget Request #{selectedInvoice.cash_budget_request_id}. Items below reflect the approved expense breakdown.
                    </p>
                    {selectedInvoice.notes && (
                      <p className="text-[10px] text-violet-500 dark:text-violet-500 mt-1 font-mono">{selectedInvoice.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes (non-CB invoices only) */}
              {!selectedInvoice.cash_budget_request_id && selectedInvoice.notes && (
                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{selectedInvoice.notes}</p>
                </div>
              )}

              <table className="w-full mb-12">
                <thead>
                  <tr className="border-b-2 border-gray-900 dark:border-gray-100">
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                    <th className="text-center py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                    <th className="text-right py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Price</th>
                    <th className="text-right py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-5">
                          <p className="font-black text-gray-900 dark:text-white">{item.service?.name || item.service_name || 'Service'}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase">{item.service?.category}</p>
                        </td>
                        <td className="py-5 text-center font-bold text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="py-5 text-right font-bold text-gray-600 dark:text-gray-400">₱{Number(item.unit_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-5 text-right font-black text-gray-900 dark:text-white">₱{Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No line items found</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-gray-900 dark:text-white">₱{Number(selectedInvoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Tax (12%)</span>
                    <span className="text-gray-900 dark:text-white">₱{Number(selectedInvoice.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t-2 border-gray-900 dark:border-gray-100 items-center">
                    <span className="text-sm font-black text-gray-900 dark:text-white uppercase">Total</span>
                    <span className="text-2xl font-black text-blue-600">₱{Number(selectedInvoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print { display: none !important; }
        }
      `}</style>

    </div>
  );
}

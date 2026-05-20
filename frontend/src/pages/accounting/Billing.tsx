import { useState, useEffect } from 'react';
import { 
  LuSearch, LuPrinter, LuEye, LuFileCheck, 
  LuClock, LuX, LuChevronLeft, LuChevronRight, LuDollarSign,
  LuTrendingUp, LuActivity, LuPhone, LuMail, LuMapPin
} from 'react-icons/lu';
import { billingApi } from '../../api/billing';
import type { Invoice } from '../../api/billing';
import { Dropdown } from '../../components/ui';

export default function Billing() {


  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await billingApi.getInvoices({
        page: currentPage,
        search: searchTerm,
        status: statusFilter
      });
      
      const resData = response.data;
      if (resData?.success) {
        setInvoices(resData.data || []);
        setPagination(resData.meta || null);
        setStats(resData.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, statusFilter]);

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1);
      fetchInvoices();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleMarkAsPaid = async (id: number) => {
    if (!confirm('Mark this invoice as paid?')) return;
    try {
      await billingApi.updateStatus(id, 'paid');
      fetchInvoices();
      if (selectedInvoice?.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: 'paid' });
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
      paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      pending_payment: 'bg-amber-50 text-amber-600 border-amber-100',
      cancelled: 'bg-rose-50 text-rose-600 border-rose-100',
    };
    const icons: any = {
      paid: <LuFileCheck className="w-3 h-3" />,
      pending_payment: <LuClock className="w-3 h-3" />,
      cancelled: <LuX className="w-3 h-3" />,
    };

    return (
      <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${styles[status] || styles.pending_payment}`}>
        {icons[status] || icons.pending_payment}
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-12 mt-10">
      
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-300/40 dark:shadow-blue-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuDollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
              <LuTrendingUp className="w-3 h-3" />
              Revenue
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Revenue</p>
            <p className="text-3xl font-black">₱{stats?.total_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-xl shadow-amber-300/40 dark:shadow-amber-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuClock className="w-5 h-5 text-white" />
            </div>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
              Outstanding
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Pending Amount</p>
            <p className="text-3xl font-black">₱{stats?.pending_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-xl shadow-violet-300/40 dark:shadow-violet-900/40 flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default">
          <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
          <div className="flex items-start justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <LuActivity className="w-5 h-5 text-white" />
            </div>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
              Volume
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Invoices</p>
            <p className="text-3xl font-black">{stats?.invoice_count || '0'}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        
        {/* Table Header / Filters */}
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/30 dark:bg-gray-800/30">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Billing Registry</h2>
            <p className="text-[11px] text-gray-400 font-bold tracking-widest uppercase">Manage and track all transactions</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search Invoice # or Customer..."
                className="pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm focus:ring-4 focus:ring-blue-600/5 w-full md:w-64 transition-all font-medium dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              {['all', 'paid', 'pending_payment'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === status 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-gray-900">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No transactions found</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <LuPrinter className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white tracking-tight">{invoice.invoice_number}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{invoice.payment_method}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-gray-700 dark:text-gray-200">{invoice.customer_name || 'Walk-in Customer'}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Verified Account</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-gray-600">
                        {new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium tracking-tighter">
                        {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-black text-gray-900 dark:text-white">₱{Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Dropdown 
                          items={[
                            { 
                              label: 'View Invoice', 
                              icon: <LuEye className="w-4 h-4" />, 
                              onClick: () => { setSelectedInvoice(invoice); setShowModal(true); } 
                            },
                            ...(invoice.status === 'pending_payment' ? [{ 
                              label: 'Mark as Paid', 
                              icon: <LuFileCheck className="w-4 h-4" />, 
                              onClick: () => handleMarkAsPaid(invoice.id) 
                            }] : [])
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

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Showing {pagination.from} to {pagination.to} of {pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                <LuChevronLeft className="w-4 h-4" />
              </button>
              {pagination.last_page > 0 && [...Array(Math.min(pagination.last_page, 10))].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-2xl text-xs font-black transition-all ${
                    currentPage === i + 1 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                disabled={currentPage === pagination.last_page}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                <LuChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0 no-print">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${selectedInvoice.status === 'paid' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
                  {selectedInvoice.status === 'paid' ? <LuFileCheck className="w-7 h-7" /> : <LuClock className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Invoice Details</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {selectedInvoice.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                >
                  <LuPrinter className="w-4 h-4" /> Print
                </button>
                {selectedInvoice.status === 'pending_payment' && (
                  <button 
                    onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                    className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                  >
                    Mark Paid
                  </button>
                )}
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900"
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
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-6 pl-1">Management System</p>
                  <div className="space-y-1 pl-1">
                    <p className="text-[11px] text-gray-900 font-bold max-w-[300px] leading-relaxed">UNIT 6 -Aryanna Village Center Brgy 175. Susano Road Camarin, Caloocan City</p>
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
                  <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2">INVOICE</h2>
                  <p className="text-sm font-black text-blue-600">#{selectedInvoice.invoice_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12 border-t border-b border-gray-50 py-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Billed To</p>
                  <p className="text-lg font-black text-gray-900">{selectedInvoice.customer_name || 'Walk-in Customer'}</p>
                  <div className="mt-2 space-y-1">
                    {selectedInvoice.customer_contact && (
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <LuPhone className="w-3 h-3 text-blue-600" /> {selectedInvoice.customer_contact}
                      </p>
                    )}
                    {selectedInvoice.customer_email && (
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <LuMail className="w-3 h-3 text-blue-600" /> {selectedInvoice.customer_email}
                      </p>
                    )}
                    {selectedInvoice.customer_address && (
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <LuMapPin className="w-3 h-3 text-blue-600" /> {selectedInvoice.customer_address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Invoice Meta</p>
                  <p className="text-sm font-black text-gray-900 uppercase">{selectedInvoice.payment_method}</p>
                  <p className="text-xs text-gray-500 mt-1 font-bold uppercase">{new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <table className="w-full mb-12">
                <thead>
                  <tr className="border-b-2 border-gray-900">
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                    <th className="text-center py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                    <th className="text-right py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedInvoice.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-5">
                        <p className="font-black text-gray-900">{item.service?.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">{item.service?.category}</p>
                      </td>
                      <td className="py-5 text-center font-bold text-gray-600">{item.quantity}</td>
                      <td className="py-5 text-right font-black text-gray-900">₱{Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-gray-900">₱{Number(selectedInvoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Tax (12%)</span>
                    <span className="text-gray-900">₱{Number(selectedInvoice.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t-2 border-gray-900 items-center">
                    <span className="text-sm font-black text-gray-900 uppercase">Total</span>
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

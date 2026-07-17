import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LuArrowLeft, LuMail, LuPhone, LuMapPin, LuUser, LuFileText, LuPlane, LuFileSpreadsheet, LuTruck, LuFolderOpen } from 'react-icons/lu';
import { customerApi } from '../../api/customers';
import AgentTaskManager from '../../components/travel/AgentTaskManager';
import CustomerEmailModal from '../../components/travel/CustomerEmailModal';
import KycManager from '../../components/travel/KycManager';
import PassportManager from '../../components/travel/PassportManager';
import VisaManager from '../../components/travel/VisaManager';
import { Button } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';

interface CustomerInvoice {
  id: number;
  invoice_number?: string;
  tour_code?: string;
  pickup_location?: string;
  travel_date?: string;
  status?: string;
  total_amount: number | string;
  balance?: number | string | null;
}

interface CustomerJobOrder {
  id: number;
  jo_number?: string;
  status?: string;
  start_date?: string;
}

const DashboardCard = ({ title, children, action, icon: Icon, className = '' }: any) => (
  <div className={`bg-white dark:bg-gray-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-md flex flex-col overflow-hidden ${className}`}>
    <div className="px-5 py-3.5 border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-900/20 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="text-indigo-600 dark:text-indigo-400" size={16} />}
        <h3 className="text-[13px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-5 flex-1 flex flex-col">
      {children}
    </div>
  </div>
);

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showEmailModal, setShowEmailModal] = useState(false);

  const customerId = Number(id);

  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => customerApi.get(customerId),
  });

  const customer = response?.data?.data;

  if (isLoading) {
    return <div className="p-10 text-center animate-pulse text-slate-400 font-bold tracking-widest uppercase text-sm">Loading Profile...</div>;
  }

  if (!customer) {
    return <div className="p-10 text-center text-rose-500">Customer not found.</div>;
  }

  const invoices: CustomerInvoice[] = customer.invoices ?? [];
  const jobOrders: CustomerJobOrder[] = (customer.job_orders || customer.jobOrders) ?? [];

  const invoiceColumns: Column<CustomerInvoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice No',
      render: (inv) => (
        <span className="font-mono font-bold text-[12px] text-indigo-600 dark:text-indigo-400 whitespace-nowrap">#{inv.invoice_number || inv.id}</span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (inv) => (
        <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 max-w-[140px] truncate">
          {inv.tour_code || inv.pickup_location || <span className="text-slate-400 italic font-normal">—</span>}
        </div>
      ),
    },
    {
      key: 'travel_date',
      header: 'Travel Date',
      render: (inv) => (
        <span className="text-[13px] text-slate-500 whitespace-nowrap">
          {inv.travel_date ? new Date(inv.travel_date).toLocaleDateString() : <span className="text-slate-400 italic">—</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' :
          inv.status === 'partial' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' :
          'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50'
        }`}>
          {inv.status}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right',
      render: (inv) => (
        <span className="font-bold text-[13px] text-slate-800 dark:text-slate-200 whitespace-nowrap">
          ₱{Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (inv) => (
        <span className="text-[13px] whitespace-nowrap">
          {inv.balance != null
            ? <span className={Number(inv.balance) > 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>₱{Number(inv.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            : <span className="text-slate-400 italic">—</span>
          }
        </span>
      ),
    },
  ];

  const jobOrderColumns: Column<CustomerJobOrder>[] = [
    {
      key: 'jo_number',
      header: 'JO Number',
      render: (jo) => (
        <span className="font-mono font-bold text-[12px] text-indigo-600 dark:text-indigo-400">#{jo.jo_number}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (jo) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
          jo.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' :
          jo.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50' :
          'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50'
        }`}>
          {jo.status?.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: 'Start Date',
      align: 'right',
      render: (jo) => (
        <span className="text-[12px] text-slate-500 font-medium">
          {jo.start_date ? new Date(jo.start_date).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-12">
      {/* Header Actions */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/operations/customers')} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm text-slate-600 dark:text-slate-300">
          <LuArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <LuUser className="text-indigo-500" />
            {customer.first_name} {customer.last_name}
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Customer Profile • ID {customer.id}</p>
        </div>
        <Button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50">
          <LuMail size={16} /> Send Email
        </Button>
      </div>

      {/* Grid Layout inspired by Flex Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Details & Notes (4/12) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          <DashboardCard 
            title="Customer Details" 
            icon={LuUser} 
            action={<button className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold tracking-wide transition-colors border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">Manage</button>}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700"><LuMail size={14} /></div>
                <span className="break-all font-medium">{customer.email || <span className="text-slate-400 italic font-normal">No email provided</span>}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700"><LuPhone size={14} /></div>
                <span className="font-medium">{customer.phone || <span className="text-slate-400 italic font-normal">No phone provided</span>}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700"><LuMapPin size={14} /></div>
                <span className="font-medium">{customer.address || <span className="text-slate-400 italic font-normal">No address provided</span>}</span>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Internal Notes" icon={LuFileText} action={<button className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold tracking-wide transition-colors border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Edit</button>}>
            <div className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed min-h-[80px]">
              {customer.notes ? (
                <p className="whitespace-pre-wrap">{customer.notes}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-4">
                  <span className="italic">No internal notes.</span>
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard title="Linked Passengers" icon={LuPlane} action={<button className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold tracking-wide transition-colors border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Add</button>}>
            {!customer.passengers || customer.passengers.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-slate-400 italic">
                No passengers linked to this profile.
              </div>
            ) : (
              <div className="grid gap-3">
                {customer.passengers.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[13px] text-slate-800 dark:text-slate-200">{p.first_name} {p.last_name}</p>
                      {p.passport_number && <p className="text-[11px] text-slate-500 mt-0.5">Passport: <span className="font-mono">{p.passport_number}</span></p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

        </div>

        {/* Right Column: Transactions & Docs (8/12) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          <DashboardCard 
            title="Transactions & Billing History" 
            icon={LuFileSpreadsheet} 
            action={<button className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold tracking-wide transition-colors border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">Details</button>}
          >
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              rowKey={(inv) => inv.id}
              className="border-0 rounded-none bg-transparent"
              empty={
                <div className="py-10 flex flex-col items-center justify-center text-[13px] text-slate-400 gap-2">
                  <LuFileSpreadsheet size={24} className="text-slate-300 opacity-50 mb-2" />
                  <span className="italic">No billing history found for this customer.</span>
                </div>
              }
            />
          </DashboardCard>

          <DashboardCard title="Travel Documents & Processing" icon={LuFileText} action={<button className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold tracking-wide transition-colors border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Manage</button>}>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-10">
              <PassportManager customerId={customerId} passports={customer.passports || []} />
              <VisaManager customerId={customerId} visas={customer.visas || []} />
              <KycManager customerId={customerId} kycs={customer.kycs || []} />
            </div>
          </DashboardCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard title="Logistics & Job Orders" icon={LuTruck} action={<button className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold tracking-wide transition-colors border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Manage</button>}>
              {(!customer.job_orders && !customer.jobOrders) || (customer.job_orders || customer.jobOrders).length === 0 ? (
                <div className="py-6 text-center text-[13px] text-slate-400 italic flex items-center justify-center h-full">
                  No job orders linked to this customer.
                </div>
              ) : (
                <DataTable
                  columns={jobOrderColumns}
                  data={jobOrders}
                  rowKey={(jo) => jo.id}
                  className="border-0 rounded-none bg-transparent"
                />
              )}
            </DashboardCard>

            <DashboardCard title="Company Documents" icon={LuFolderOpen} action={<button className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold tracking-wide transition-colors border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Manage</button>}>
              {(!customer.company_documents && !customer.companyDocuments) || (customer.company_documents || customer.companyDocuments).length === 0 ? (
                <div className="py-6 text-center text-[13px] text-slate-400 italic flex items-center justify-center h-full">
                  No company documents linked.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {(customer.company_documents || customer.companyDocuments).map((doc: any) => (
                    <div key={doc.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100">
                        <LuFileText size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] text-slate-800 dark:text-slate-200 truncate">{doc.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate uppercase tracking-widest font-bold">{doc.document_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>

          <DashboardCard title="Agent Tasks" className="max-h-[500px]">
             <div className="overflow-y-auto custom-scrollbar -mx-5 px-5 pb-5">
               <AgentTaskManager customerId={customerId} />
             </div>
          </DashboardCard>

        </div>

      </div>

      <CustomerEmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} customerId={customerId} />
    </div>
  );
}

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
    return <div className="p-10 text-center animate-pulse text-gray-400 font-bold tracking-widest uppercase text-sm">Loading Profile...</div>;
  }

  if (!customer) {
    return <div className="p-10 text-center text-red-500">Customer not found.</div>;
  }

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-12">
      {/* Header Actions */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/operations/customers')} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm text-gray-600 dark:text-gray-300">
          <LuArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <LuUser className="text-blue-500" />
            {customer.first_name} {customer.last_name}
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Customer Profile • ID {customer.id}</p>
        </div>
        <Button onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200">
          <LuMail size={16} /> Send Email
        </Button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-[1px] bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        
        {/* Cell: Overview */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-8 flex flex-col space-y-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0"><LuMail size={14} /></div>
                <span className="break-all">{customer.email || <span className="text-gray-400 italic">No email provided</span>}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-500 flex items-center justify-center shrink-0"><LuPhone size={14} /></div>
                <span>{customer.phone || <span className="text-gray-400 italic">No phone provided</span>}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center shrink-0"><LuMapPin size={14} /></div>
                <span>{customer.address || <span className="text-gray-400 italic">No address provided</span>}</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Internal Notes</h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-sm text-gray-600 dark:text-gray-300 h-full min-h-[120px]">
              {customer.notes ? (
                <p className="whitespace-pre-wrap">{customer.notes}</p>
              ) : (
                <span className="text-gray-400 italic">No internal notes for this customer.</span>
              )}
            </div>
          </div>
        </div>

        {/* Cell: Invoices */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 p-8 flex flex-col max-h-[500px]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 shrink-0">
            <LuFileSpreadsheet className="text-indigo-500" /> Transactions & Billing History
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {!customer.invoices || customer.invoices.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">
                No billing history found for this customer.
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                      <th className="px-4 py-3">Invoice No</th>
                      <th className="px-4 py-3">Tour / Reference</th>
                      <th className="px-4 py-3">Travel Date</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {customer.invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">#{inv.invoice_number || inv.id}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[140px] truncate">
                          {inv.tour_code || inv.pickup_location || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {inv.travel_date ? new Date(inv.travel_date).toLocaleDateString() : <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 capitalize">
                          {inv.payment_method?.replace('_', ' ') || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                            inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            inv.status === 'partial' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          ₱{Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {inv.balance != null
                            ? <span className={inv.balance > 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>₱{Number(inv.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            : <span className="text-gray-400 italic">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Cell: Passports & Visas (Tall) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6 shrink-0">
            <LuFileText className="text-purple-500" /> Travel Documents & Processing
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-10">
            <PassportManager customerId={customerId} passports={customer.passports || []} />
            <VisaManager customerId={customerId} visas={customer.visas || []} />
            <KycManager customerId={customerId} kycs={customer.kycs || []} />
          </div>
        </div>

        {/* Cell: Logistics & Passengers */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 flex flex-col gap-8">
          {/* Logistics */}
          <div className="flex-1 flex flex-col max-h-[300px]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 shrink-0">
              <LuTruck className="text-orange-500" /> Logistics & Job Orders
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {(!customer.job_orders && !customer.jobOrders) || (customer.job_orders || customer.jobOrders).length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">
                  No job orders linked to this customer.
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                        <th className="px-4 py-3">JO Number</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Start Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(customer.job_orders || customer.jobOrders).map((jo: any) => (
                        <tr key={jo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">#{jo.jo_number}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                              jo.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              jo.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>
                              {jo.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {jo.start_date ? new Date(jo.start_date).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Passengers */}
          <div className="flex-1 flex flex-col max-h-[300px]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 shrink-0">
              <LuPlane className="text-sky-500" /> Linked Passengers
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {!customer.passengers || customer.passengers.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">
                  No passengers linked to this profile.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.passengers.map((p: any) => (
                    <div key={p.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 text-xs space-y-1">
                      <p className="font-bold text-gray-900 dark:text-white">{p.first_name} {p.last_name}</p>
                      {p.passport_number && <p className="text-gray-500">Passport: <span className="font-mono">{p.passport_number}</span></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cell: Company Documents */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 flex flex-col max-h-[400px]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 shrink-0">
            <LuFolderOpen className="text-blue-500" /> Company Documents
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {(!customer.company_documents && !customer.companyDocuments) || (customer.company_documents || customer.companyDocuments).length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 h-full flex items-center justify-center">
                No company documents linked to this customer.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(customer.company_documents || customer.companyDocuments).map((doc: any) => (
                  <div key={doc.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-900 dark:text-white truncate pr-2">{doc.title}</p>
                      <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[9px] font-black uppercase">{doc.document_type}</span>
                    </div>
                    <p className="text-gray-500 truncate">File: {doc.file_path.split('/').pop()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cell: Agent Tasks */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar">
          <AgentTaskManager customerId={customerId} />
        </div>

      </div>

      <CustomerEmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} customerId={customerId} />
    </div>
  );
}

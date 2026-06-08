import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LuArrowLeft, LuMail, LuPhone, LuMapPin, LuUser, LuFileText, LuList, LuPlane, LuFileSpreadsheet, LuTruck, LuFolderOpen } from 'react-icons/lu';
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
  const [activeTab, setActiveTab] = useState<'details' | 'travel' | 'documents' | 'tasks' | 'logistics'>('details');
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Actions */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/travel/customers')} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm text-gray-600 dark:text-gray-300">
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

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-900/50 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar border border-gray-200/50 dark:border-gray-800/50">
        {[
          { id: 'details', label: 'Overview', icon: LuUser },
          { id: 'travel', label: 'Travel History', icon: LuPlane },
          { id: 'logistics', label: 'Logistics', icon: LuTruck },
          { id: 'documents', label: 'KYC & Visas', icon: LuFileText },
          { id: 'tasks', label: 'Agent Tasks', icon: LuList },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border border-gray-200 dark:border-gray-700/50' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
        
        {activeTab === 'details' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center"><LuMail size={14} /></div>
                    {customer.email || <span className="text-gray-400 italic">No email provided</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-500 flex items-center justify-center"><LuPhone size={14} /></div>
                    {customer.phone || <span className="text-gray-400 italic">No phone provided</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center"><LuMapPin size={14} /></div>
                    {customer.address || <span className="text-gray-400 italic">No address provided</span>}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Internal Notes</h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-sm text-gray-600 dark:text-gray-300 min-h-[120px]">
                  {customer.notes ? (
                    <p className="whitespace-pre-wrap">{customer.notes}</p>
                  ) : (
                    <span className="text-gray-400 italic">No internal notes for this customer.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <LuFileSpreadsheet className="text-indigo-500" /> Availed Packages & Invoices
              </h3>
              {!customer.invoices || customer.invoices.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  No billing history found for this customer.
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                        <th className="px-4 py-3">Invoice No</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Total Amount</th>
                        <th className="px-4 py-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {customer.invoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">#{inv.invoice_number || inv.id}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                              inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                            ₱{Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <LuUser className="text-blue-500" /> Linked Passengers
              </h3>
              {!customer.passengers || customer.passengers.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  No passengers linked to this profile.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.passengers.map((p: any) => (
                    <div key={p.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 text-xs space-y-1">
                      <p className="font-bold text-gray-900 dark:text-white">{p.first_name} {p.last_name}</p>
                      {p.passport_number && <p className="text-gray-500">Passport: <span className="font-mono">{p.passport_number}</span></p>}
                      {p.ticket_number && <p className="text-gray-500">Ticket: <span className="font-mono">{p.ticket_number}</span></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-10">
            <KycManager customerId={customerId} kycs={customer.kycs || []} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-gray-800">
              <PassportManager customerId={customerId} passports={customer.passports || []} />
              <VisaManager customerId={customerId} visas={customer.visas || []} />
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <AgentTaskManager customerId={customerId} />
        )}

        {activeTab === 'logistics' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <LuTruck className="text-orange-500" /> Logistics & Job Orders
              </h3>
              {(!customer.job_orders && !customer.jobOrders) || (customer.job_orders || customer.jobOrders).length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  No job orders linked to this customer.
                </div>
              ) : (
                <div className="overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                        <th className="px-4 py-3">JO Number</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Requirement</th>
                        <th className="px-4 py-3">Trip Tickets</th>
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
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {jo.rental_requirement || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {jo.trip_tickets?.length || jo.tripTickets?.length || 0} Tickets
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

            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <LuFolderOpen className="text-blue-500" /> Company Documents
              </h3>
              {(!customer.company_documents && !customer.companyDocuments) || (customer.company_documents || customer.companyDocuments).length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  No company documents linked to this customer.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(customer.company_documents || customer.companyDocuments).map((doc: any) => (
                    <div key={doc.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-900 dark:text-white truncate pr-2">{doc.title}</p>
                        <span className="shrink-0 px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[9px] font-black uppercase">{doc.document_type}</span>
                      </div>
                      <p className="text-gray-500 truncate">File: {doc.file_path.split('/').pop()}</p>
                      {doc.amount && <p className="font-bold text-gray-900 dark:text-white">Amount: ₱{Number(doc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CustomerEmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} customerId={customerId} />
    </div>
  );
}

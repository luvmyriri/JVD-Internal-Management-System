import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LuArrowLeft, LuMail, LuPhone, LuMapPin, LuUser, LuBriefcase, LuFileText, LuCheckSquare, LuPlane } from 'react-icons/lu';
import { customerApi } from '../../api/customers';
import AgentTaskManager from '../../components/travel/AgentTaskManager';
import CustomerEmailModal from '../../components/travel/CustomerEmailModal';
import { Button } from '../../components/ui';

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'travel' | 'documents' | 'tasks'>('details');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const customerId = Number(id);

  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => customerApi.get(customerId),
  });

  const customer = response?.data;

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
          { id: 'documents', label: 'KYC & Visas', icon: LuFileText },
          { id: 'tasks', label: 'Agent Tasks', icon: LuCheckSquare },
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
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LuPlane className="text-blue-500" /> Travel Packages & Availed Services
            </h3>
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-center text-blue-600 dark:text-blue-400 text-sm">
              Linked invoices and passenger manifests will appear here in future updates.
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <LuBriefcase className="text-emerald-500" /> Walk-in KYC Records
              </h3>
              <p className="text-xs text-gray-500 mb-4 border-l-2 border-emerald-500 pl-3">Upload government IDs, proof of billing, or any other verification documents required for walk-in accreditation.</p>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center text-sm text-gray-500 border-dashed">
                [ KYC Document Upload Component Placeholder ]
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-md font-bold text-gray-900 dark:text-white mb-4">Passports</h3>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center text-sm text-gray-500 border-dashed">
                  [ Passport List Component Placeholder ]
                </div>
              </div>
              <div>
                <h3 className="text-md font-bold text-gray-900 dark:text-white mb-4">Visas</h3>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center text-sm text-gray-500 border-dashed">
                  [ Visa List Component Placeholder ]
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <AgentTaskManager customerId={customerId} />
        )}
      </div>

      <CustomerEmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} customerId={customerId} />
    </div>
  );
}

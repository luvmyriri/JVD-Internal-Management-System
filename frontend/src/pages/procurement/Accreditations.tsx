import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuShieldCheck, LuPlus, LuSearch, LuLoaderCircle, LuUserCheck,
  LuFileText, LuLink, LuX, LuMail, LuBuilding2, LuBus, LuClock
} from 'react-icons/lu';
import { accreditationsApi, type Accreditation } from '../../api/accreditations';
import { Pagination } from '../../components/ui';

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  supplier: <LuBuilding2 size={16} />,
  partner: <LuUserCheck size={16} />,
  client: <LuBuilding2 size={16} />,
  driver: <LuUserCheck size={16} />,
  bus: <LuBus size={16} />,
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expired: 'bg-red-50 text-red-700 border border-red-200',
  pending_renewal: 'bg-amber-50 text-amber-700 border border-amber-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[status] ?? 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ── Add Accreditation Modal ──────────────────────────────────────────────────

interface AddModalProps { onClose: () => void; }
function AddAccreditationModal({ onClose }: AddModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Accreditation>>({
    entity_type: 'supplier', entity_name: '', accreditation_type: '',
    contact_person: '', contact_email: '',
  });

  const mutation = useMutation({
    mutationFn: () => accreditationsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accreditations'] }); onClose(); },
  });

  const field = (label: string, key: keyof Accreditation, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">New Accreditation</h2>
            <p className="text-sm text-gray-500 mt-1">Initialize a new entity accreditation process.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto">
          <form id="accreditation-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Entity Type</label>
                <select
                  value={form.entity_type}
                  onChange={e => setForm(p => ({ ...p, entity_type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                >
                  <option value="supplier">Supplier</option>
                  <option value="partner">Partner</option>
                  <option value="client">Client</option>
                  <option value="driver">Driver</option>
                  <option value="bus">Bus</option>
                </select>
              </div>
              {field('Entity Name', 'entity_name', 'text', 'Company or Individual Name')}
              {field('Accreditation Type', 'accreditation_type', 'text', 'e.g. Supplier Verification')}
              {field('Contact Person', 'contact_person', 'text', 'Primary Contact')}
              {field('Contact Email', 'contact_email', 'email', 'contact@domain.com')}
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">
                Failed to create accreditation. Please check required fields.
              </p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="accreditation-form" type="submit" disabled={!form.entity_name || !form.contact_email || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2 shadow-lg shadow-blue-200/50">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
            Create Accreditation
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card Component ───────────────────────────────────────────────────────────

function AccreditationCard({ acc }: { acc: Accreditation }) {
  const qc = useQueryClient();
  const kycMutation = useMutation({
    mutationFn: () => accreditationsApi.generateKycLink(acc.id),
    onSuccess: (res) => {
      const data = res.data;
      alert(`KYC Link Generated!\n\nEmail sent to: ${data.email_sent_to}\nLink: ${data.link}`);
      qc.invalidateQueries({ queryKey: ['accreditations'] });
    },
  });

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            {ENTITY_ICONS[acc.entity_type] ?? <LuShieldCheck size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">{acc.entity_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{acc.entity_type} • {acc.accreditation_type}</p>
          </div>
        </div>
        <StatusBadge status={acc.status} />
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <LuMail size={12} className="text-gray-400" />
          {acc.contact_person} ({acc.contact_email})
        </div>
        {acc.expiry_date && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <LuClock size={12} className="text-gray-400" />
            Expires: {new Date(acc.expiry_date).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <div className="flex-1 grid grid-cols-3 gap-2">
          {['NDA', 'Terms', 'KYC'].map(doc => {
            const hasDoc = acc[`${doc.toLowerCase()}_document_url` as keyof Accreditation];
            return (
              <div key={doc} className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold border ${hasDoc ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                <LuFileText size={12} />
                {doc}
              </div>
            );
          })}
        </div>
        <button 
          onClick={() => kycMutation.mutate()}
          disabled={kycMutation.isPending}
          className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition tooltip-trigger"
          title="Send KYC Link"
        >
          {kycMutation.isPending ? <LuLoaderCircle size={16} className="animate-spin" /> : <LuLink size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Accreditations() {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useQuery({
    queryKey: ['accreditations', search, page],
    queryFn: () => accreditationsApi.list({ 
      search: search || undefined,
      page,
      per_page: 10
    }),
  });

  const accreditations = response?.data?.data ?? [];
  const meta = response?.data?.meta;

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
            {meta?.total ?? '0'} Records
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            KYC & Compliance Management
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-95 shrink-0">
          <LuPlus size={18} />
          New Accreditation
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100 max-w-md">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          <LuSearch size={18} />
        </div>
        <input
          type="text"
          placeholder="Search accreditations..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-gray-800 placeholder:text-gray-400"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LuLoaderCircle size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading accreditations...</p>
        </div>
      ) : accreditations.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 border-dashed flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
            <LuShieldCheck size={28} />
          </div>
          <h3 className="text-gray-900 font-bold mb-1">No accreditations found</h3>
          <p className="text-sm text-gray-500 max-w-sm">You haven't added any accreditations or no records match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {accreditations.map(acc => <AccreditationCard key={acc.id} acc={acc} />)}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Pagination
          currentPage={page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={setPage}
        />
      )}

      {showAdd && <AddAccreditationModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

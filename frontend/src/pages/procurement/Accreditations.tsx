import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuShieldCheck, LuPlus, LuSearch, LuLoaderCircle, LuUserCheck,
  LuFileText, LuLink, LuX, LuMail, LuBuilding2, LuBus, LuClock
} from 'react-icons/lu';
import { accreditationsApi, type Accreditation } from '../../api/accreditations';

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
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-8 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900">New Accreditation</h2>
            <p className="text-sm text-gray-500 mt-0.5">Initialize a new entity accreditation process.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><LuX size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Entity Type</label>
              <select
                value={form.entity_type}
                onChange={e => setForm(p => ({ ...p, entity_type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" disabled={!form.entity_name || !form.contact_email || mutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2">
              {mutation.isPending && <LuLoaderCircle size={14} className="animate-spin" />}
              Create Accreditation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Card Component ───────────────────────────────────────────────────────────

function AccreditationCard({ acc }: { acc: Accreditation }) {
  const qc = useQueryClient();
  const kycMutation = useMutation({
    mutationFn: () => accreditationsApi.generateKycLink(acc.id),
    onSuccess: (data) => {
      alert(`KYC Link Generated!\n\nEmail sent to: ${data.email_sent_to}\nLink: ${data.link}`);
      qc.invalidateQueries({ queryKey: ['accreditations'] });
    },
  });

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col gap-4">
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

      <div className="space-y-2 pt-2">
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
  const { data: accreditations, isLoading } = useQuery({
    queryKey: ['accreditations'],
    queryFn: accreditationsApi.getAll,
  });

  const filtered = accreditations?.filter(a => 
    a.entity_name.toLowerCase().includes(search.toLowerCase()) ||
    a.contact_email.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Accreditations</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage KYC and compliance for suppliers, partners, and clients.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-95 shrink-0">
          <LuPlus size={18} />
          New Accreditation
        </button>
      </div>

      <div className="flex items-center gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md">
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
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 border-dashed flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
            <LuShieldCheck size={28} />
          </div>
          <h3 className="text-gray-900 font-bold mb-1">No accreditations found</h3>
          <p className="text-sm text-gray-500 max-w-sm">You haven't added any accreditations or no records match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(acc => <AccreditationCard key={acc.id} acc={acc} />)}
        </div>
      )}

      {showAdd && <AddAccreditationModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

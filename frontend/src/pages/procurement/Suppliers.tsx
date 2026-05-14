import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuTruck, LuPlus, LuSearch, LuShieldCheck, LuShieldX,
  LuBan, LuPhone, LuMail, LuMapPin, LuX, LuLoaderCircle,
  LuCircleCheckBig, LuTriangleAlert, LuBuilding2, LuHash,
} from 'react-icons/lu';
import { supplierApi, type Supplier, type SupplierFormData } from '../../api/suppliers';
import { SUPPLIER_ACCREDITATION_LABELS } from '../../constants';

// ── helpers ─────────────────────────────────────────────────────────────────

const accreditationStyle: Record<string, string> = {
  accredited:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending:     'bg-amber-50 text-amber-700 border border-amber-200',
  suspended:   'bg-orange-50 text-orange-700 border border-orange-200',
  blacklisted: 'bg-red-50 text-red-700 border border-red-200',
};

function AccreditationBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${accreditationStyle[status] ?? 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
      {status === 'accredited' && <LuCircleCheckBig size={10} />}
      {status === 'blacklisted' && <LuBan size={10} />}
      {status === 'pending' && <LuTriangleAlert size={10} />}
      {SUPPLIER_ACCREDITATION_LABELS[status] ?? status}
    </span>
  );
}

// ── Add Supplier Modal ───────────────────────────────────────────────────────

interface AddSupplierModalProps { onClose: () => void; }
function AddSupplierModal({ onClose }: AddSupplierModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SupplierFormData>({
    company_name: '', contact_person: '', phone: '', email: '',
    address: '', payment_terms: '', is_consignment: false,
    bank_name: '', bank_account_number: '', tin_number: '',
  });

  const mutation = useMutation({
    mutationFn: () => supplierApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
  });

  const field = (label: string, key: keyof SupplierFormData, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-8 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900">New Supplier</h2>
            <p className="text-sm text-gray-500 mt-0.5">All suppliers undergo cross-verification before PO issuance.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><LuX size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Company Name *', 'company_name', 'text', 'ABC Parts Supply Co.')}
            {field('Contact Person', 'contact_person', 'text', 'Juan Dela Cruz')}
            {field('Phone', 'phone', 'text', '+63 9XX XXX XXXX')}
            {field('Email', 'email', 'email', 'supplier@example.com')}
          </div>
          {field('Address', 'address', 'text', 'Street, City, Province')}

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Financial / Compliance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('TIN Number', 'tin_number', 'text', '000-000-000-000')}
              {field('Bank Name', 'bank_name', 'text', 'BDO, BPI, Metrobank...')}
              {field('Bank Account Number', 'bank_account_number', 'text', '0000-0000-0000')}
              {field('Payment Terms', 'payment_terms', 'text', 'e.g. Net 30, Monthly, COD')}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input type="checkbox" id="is_consignment" checked={form.is_consignment}
                onChange={e => setForm(p => ({ ...p, is_consignment: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="is_consignment" className="text-sm text-gray-700">Consignment arrangement</label>
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
              Failed to create supplier. Please check required fields.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" disabled={!form.company_name || mutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2">
              {mutation.isPending && <LuLoaderCircle size={14} className="animate-spin" />}
              Create Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Blacklist Modal ──────────────────────────────────────────────────────────

interface BlacklistModalProps { supplier: Supplier; onClose: () => void; }
function BlacklistModal({ supplier, onClose }: BlacklistModalProps) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => supplierApi.blacklist(supplier.id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><LuBan size={18} /></div>
          <div>
            <h2 className="font-black text-gray-900">Blacklist Supplier</h2>
            <p className="text-xs text-gray-500">{supplier.company_name}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">This will block all future Purchase Orders from being issued to this supplier.</p>
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Required: State reason for blacklisting..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2 transition">
            {mutation.isPending && <LuLoaderCircle size={14} className="animate-spin" />}
            Confirm Blacklist
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Supplier Card ────────────────────────────────────────────────────────────

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const qc = useQueryClient();
  const [showBlacklist, setShowBlacklist] = useState(false);
  const verifyMutation = useMutation({
    mutationFn: () => supplierApi.verify(supplier.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  return (
    <>
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <LuBuilding2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{supplier.company_name}</h3>
              {supplier.contact_person && <p className="text-xs text-gray-500 mt-0.5">{supplier.contact_person}</p>}
            </div>
          </div>
          <AccreditationBadge status={supplier.accreditation_status} />
        </div>

        <div className="space-y-1.5">
          {supplier.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600"><LuPhone size={12} className="text-gray-400" />{supplier.phone}</div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600"><LuMail size={12} className="text-gray-400" />{supplier.email}</div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-xs text-gray-600"><LuMapPin size={12} className="text-gray-400" />{supplier.address}</div>
          )}
          {supplier.tin_number && (
            <div className="flex items-center gap-2 text-xs text-gray-600"><LuHash size={12} className="text-gray-400" />TIN: {supplier.tin_number}</div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
          {supplier.payment_terms && (
            <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-[10px] font-semibold text-gray-600">{supplier.payment_terms}</span>
          )}
          {supplier.is_consignment && (
            <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-semibold text-purple-600">Consignment</span>
          )}
          {(supplier.purchase_orders_count ?? 0) > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-600">{supplier.purchase_orders_count} POs</span>
          )}
        </div>

        <div className="flex gap-2">
          {!supplier.is_verified && supplier.accreditation_status !== 'blacklisted' && (
            <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60 transition">
              {verifyMutation.isPending ? <LuLoaderCircle size={12} className="animate-spin" /> : <LuShieldCheck size={12} />}
              Verify & Accredit
            </button>
          )}
          {supplier.accreditation_status === 'accredited' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <LuShieldCheck size={12} /> Verified
            </div>
          )}
          {supplier.accreditation_status !== 'blacklisted' && (
            <button onClick={() => setShowBlacklist(true)}
              className="p-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Blacklist supplier">
              <LuBan size={14} />
            </button>
          )}
          {supplier.accreditation_status === 'blacklisted' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-200">
              <LuShieldX size={12} /> Blacklisted
            </div>
          )}
        </div>
      </div>

      {showBlacklist && <BlacklistModal supplier={supplier} onClose={() => setShowBlacklist(false)} />}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Suppliers() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'accredited' | 'pending' | 'blacklisted'>('all');
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, filter],
    queryFn: () => supplierApi.list({ search: search || undefined, accreditation_status: filter !== 'all' ? filter : undefined }),
    staleTime: 30_000,
  });

  const suppliers = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cross-verified supplier database · {meta?.total ?? '—'} total</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <LuSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          {(['all', 'accredited', 'pending', 'blacklisted'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-60">
          <LuLoaderCircle size={28} className="animate-spin text-gray-300" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
          <LuTruck size={40} strokeWidth={1} />
          <p className="text-sm font-medium">No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {suppliers.map(s => <SupplierCard key={s.id} supplier={s} />)}
        </div>
      )}

      {showAdd && <AddSupplierModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

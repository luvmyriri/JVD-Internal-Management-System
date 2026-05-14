import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuTruck, LuPlus, LuSearch, LuShieldCheck, LuShieldX,
  LuBan, LuPhone, LuMail, LuMapPin, LuX, LuLoaderCircle,
  LuCircleCheckBig, LuTriangleAlert, LuBuilding2, LuHash, LuChevronDown
} from 'react-icons/lu';
import { supplierApi, type Supplier, type SupplierFormData } from '../../api/suppliers';
import { SUPPLIER_ACCREDITATION_LABELS } from '../../constants';
import AddressSelector, { EMPTY_ADDRESS, type AddressValue } from '../../components/ui/AddressSelector';

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
  const [addressVal, setAddressVal] = useState<AddressValue>(EMPTY_ADDRESS);

  const mutation = useMutation({
    mutationFn: () => supplierApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
  });

  const formatTIN = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3));
    }
    return parts.join('-');
  };

  const formatBankAcc = (val: string) => val.replace(/[^\d-]/g, '');

  const formatPhone = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('63')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    
    digits = digits.slice(0, 10);
    
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `+63 ${digits}`;
    if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  };

  const formatName = (val: string) => val.replace(/[^a-zA-Z\s.,'-]/g, '');
  
  const formatEmail = (val: string) => val.replace(/\s/g, '').toLowerCase();

  const field = (label: string, key: keyof SupplierFormData, type = 'text', placeholder = '', customOnChange?: (val: string) => void) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => {
          if (customOnChange) customOnChange(e.target.value);
          else setForm(p => ({ ...p, [key]: e.target.value }));
        }}
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
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">New Supplier</h2>
            <p className="text-sm text-gray-500 mt-1">All suppliers undergo cross-verification before PO issuance.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto">
          <form id="supplier-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {field('Company Name *', 'company_name', 'text', 'ABC Parts Supply Co.')}
              {field('Contact Person', 'contact_person', 'text', 'Juan Dela Cruz', val => setForm(p => ({ ...p, contact_person: formatName(val) })))}
              {field('Phone', 'phone', 'text', '+63 9XX XXX XXXX', val => setForm(p => ({ ...p, phone: formatPhone(val) })))}
              {field('Email', 'email', 'email', 'supplier@example.com', val => setForm(p => ({ ...p, email: formatEmail(val) })))}
            </div>

            {/* Address — PSGC cascading */}
            <div className="pt-4 mt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <AddressSelector
                  value={addressVal}
                  onChange={(val, full) => {
                    setAddressVal(val);
                    setForm(p => ({ ...p, address: full }));
                  }}
                />
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Financial / Compliance</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {field('TIN Number', 'tin_number', 'text', '000-000-000-000', val => setForm(p => ({ ...p, tin_number: formatTIN(val) })))}
                {field('Bank Name', 'bank_name', 'text', 'BDO, BPI, Metrobank...', val => setForm(p => ({ ...p, bank_name: formatName(val) })))}
                {field('Bank Account Number', 'bank_account_number', 'text', '0000-0000-0000', val => setForm(p => ({ ...p, bank_account_number: formatBankAcc(val) })))}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Terms</label>
                  <div className="relative">
                    <select
                      value={form.payment_terms}
                      onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none bg-white"
                    >
                      <option value="">Select Terms...</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Upon Order">Upon Order</option>
                    </select>
                    <LuChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                <input type="checkbox" id="is_consignment" checked={form.is_consignment}
                  onChange={e => setForm(p => ({ ...p, is_consignment: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                <label htmlFor="is_consignment" className="text-sm font-medium text-blue-900 cursor-pointer select-none">Consignment arrangement</label>
              </div>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">
                Failed to create supplier. Please check required fields.
              </p>
            )}
          </form>
        </div>
        
        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="supplier-form" type="submit" disabled={!form.company_name || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2 shadow-lg shadow-blue-200/50">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
            Create Supplier
          </button>
        </div>
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
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
            {meta?.total ?? '0'} Suppliers
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Partner Directory
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search suppliers..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100/50 p-1 rounded-[1.25rem] border border-gray-100">
          {(['all', 'accredited', 'pending', 'blacklisted'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
              }`}>
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

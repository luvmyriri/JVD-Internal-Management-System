import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuTruck, LuPlus, LuSearch, LuShieldCheck, LuShieldX,
  LuBan, LuPhone, LuMail, LuMapPin, LuX, LuLoaderCircle,
  LuCircleCheckBig, LuTriangleAlert, LuBuilding2, LuHash, LuChevronDown, LuTrash,
  LuFileDown, LuFileUp, LuChevronRight
} from 'react-icons/lu';
import { loadExcelJS } from '../../utils/lazyExport';
import { supplierApi, type Supplier, type SupplierFormData } from '../../api/suppliers';
import { SUPPLIER_ACCREDITATION_LABELS } from '../../constants';
import AddressSelector, { EMPTY_ADDRESS, type AddressValue } from '../../components/ui/AddressSelector';
import { Modal, Pagination, Button } from '../../components/ui';



// ── helpers ─────────────────────────────────────────────────────────────────

const accreditationStyle: Record<string, string> = {
  accredited:  'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  pending:     'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  suspended:   'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  blacklisted: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

function AccreditationBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${accreditationStyle[status] ?? 'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
      {status === 'accredited' && <LuCircleCheckBig size={10} />}
      {status === 'blacklisted' && <LuBan size={10} />}
      {status === 'pending' && <LuTriangleAlert size={10} />}
      {SUPPLIER_ACCREDITATION_LABELS[status] ?? status}
    </span>
  );
}

// ── Add Supplier Modal ───────────────────────────────────────────────────────

interface SupplierModalProps { mode: 'create' | 'edit' | 'view'; initialData?: Supplier; onClose: () => void; }
function SupplierModal({ mode, initialData, onClose }: SupplierModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SupplierFormData>({
    company_name: initialData?.company_name ?? '', contact_person: initialData?.contact_person ?? '', phone: initialData?.phone ?? '', email: initialData?.email ?? '',
    address: initialData?.address ?? '', payment_terms: initialData?.payment_terms ?? '', is_consignment: initialData?.is_consignment ?? false,
    bank_name: initialData?.bank_name ?? '', bank_account_number: initialData?.bank_account_number ?? '', tin_number: initialData?.tin_number ?? '',
  });
  const [addressVal, setAddressVal] = useState<AddressValue>(EMPTY_ADDRESS);

  const mutation = useMutation({
    mutationFn: () => mode === 'create' ? supplierApi.create(form) : supplierApi.update(initialData!.id, form),
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

  const formatName = (val: string) => val.replace(/[^A-Za-z\s-']/g, '');
  
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
        disabled={mode === 'view'}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {mode === 'create' ? 'New Supplier' : mode === 'edit' ? 'Edit Supplier' : 'Supplier Details'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {mode === 'create' ? 'All suppliers undergo cross-verification before PO issuance.' : 'View or update supplier information.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50 dark:bg-gray-800"><LuX size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form id="supplier-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span>Basic Information</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {field('Company Name *', 'company_name', 'text', 'ABC Parts Supply Co.', val => setForm(p => ({ ...p, company_name: formatName(val) })))}
                  {field('Contact Person', 'contact_person', 'text', 'Juan Dela Cruz', val => setForm(p => ({ ...p, contact_person: formatName(val) })))}
                  {field('Phone', 'phone', 'text', '+63 9XX XXX XXXX', val => setForm(p => ({ ...p, phone: formatPhone(val) })))}
                  {field('Email', 'email', 'email', 'supplier@example.com', val => setForm(p => ({ ...p, email: formatEmail(val) })))}
                </div>
              </div>
            </details>

            {/* Address — PSGC cascading */}
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
                <span>Address</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1">
                {mode === 'view' ? (
                   <div className="text-sm text-gray-800 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                      {form.address || 'No address provided'}
                   </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <AddressSelector
                      value={addressVal}
                      onChange={(val, full) => {
                        setAddressVal(val);
                        setForm(p => ({ ...p, address: full }));
                      }}
                    />
                    {form.address && (
                       <div className="col-span-1 sm:col-span-2 text-xs text-gray-500 mt-2">
                         Selected: {form.address}
                       </div>
                    )}
                  </div>
                )}
              </div>
            </details>

            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
                <span>Financial / Compliance</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {field('TIN Number', 'tin_number', 'text', '000-000-000-000', val => setForm(p => ({ ...p, tin_number: formatTIN(val) })))}
                  {field('Bank Name', 'bank_name', 'text', 'BDO, BPI, Metrobank...', val => setForm(p => ({ ...p, bank_name: formatName(val) })))}
                  {field('Bank Account Number', 'bank_account_number', 'text', '0000-0000-0000', val => setForm(p => ({ ...p, bank_account_number: formatBankAcc(val) })))}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Terms</label>
                    <div className="relative">
                      <select
                        value={form.payment_terms}
                        disabled={mode === 'view'}
                        onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none bg-white dark:bg-gray-900"
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
                    disabled={mode === 'view'}
                    onChange={e => setForm(p => ({ ...p, is_consignment: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:opacity-50" />
                  <label htmlFor="is_consignment" className="text-sm font-medium text-blue-900 cursor-pointer select-none">Consignment arrangement</label>
                </div>
              </div>
            </details>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">
                {(mutation.error as any)?.response?.data?.message || `Failed to ${mode} supplier. Please check required fields.`}
              </p>
            )}
          </form>
        </div>
        
        <div className="p-6 px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          {mode === 'view' ? (
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
              Close
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition">
                Cancel
              </button>
              <button form="supplier-form" type="submit" disabled={!form.company_name || mutation.isPending}
                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
                {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
                {mode === 'create' ? 'Create Supplier' : 'Save Changes'}
              </button>
            </>
          )}
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
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><LuBan size={18} /></div>
          <div>
            <h2 className="font-black text-gray-900 dark:text-white">Blacklist Supplier</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{supplier.company_name}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">This will block all future Purchase Orders from being issued to this supplier.</p>
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Required: State reason for blacklisting..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition">Cancel</button>
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

interface DeleteModalProps { supplier: Supplier; onClose: () => void; deleteMutation: any; }
function DeleteModal({ supplier, onClose, deleteMutation }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><LuTrash size={18} /></div>
          <div>
            <h2 className="font-black text-gray-900 dark:text-white">Delete Supplier</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{supplier.company_name}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Are you sure you want to delete this supplier? This action cannot be undone.</p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition">Cancel</button>
          <button onClick={() => { deleteMutation.mutate(); onClose(); }} disabled={deleteMutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 flex items-center gap-2 transition">
            {deleteMutation.isPending && <LuLoaderCircle size={14} className="animate-spin" />}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Supplier Card ────────────────────────────────────────────────────────────

function SupplierCard({ supplier, onEdit, onView }: { supplier: Supplier, onEdit: (s: Supplier) => void, onView: (s: Supplier) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const verifyMutation = useMutation({
    mutationFn: () => supplierApi.verify(supplier.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => supplierApi.delete(supplier.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete supplier');
    }
  });

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <LuBuilding2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{supplier.company_name}</h3>
              {supplier.contact_person && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{supplier.contact_person}</p>}
            </div>
          </div>
          <AccreditationBadge status={supplier.accreditation_status} />
        </div>

        <div className="space-y-2.5">
          {supplier.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><LuPhone size={12} className="text-gray-400" />{supplier.phone}</div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><LuMail size={12} className="text-gray-400" />{supplier.email}</div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><LuMapPin size={12} className="text-gray-400" />{supplier.address}</div>
          )}
          {supplier.tin_number && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><LuHash size={12} className="text-gray-400" />TIN: {supplier.tin_number}</div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex-wrap">
          {supplier.payment_terms && (
            <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300">{supplier.payment_terms}</span>
          )}
          {supplier.is_consignment && (
            <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-[10px] font-semibold text-purple-600 dark:text-purple-400">Consignment</span>
          )}
          {(supplier.purchase_orders_count ?? 0) > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold text-blue-600 dark:text-blue-400">{supplier.purchase_orders_count} POs</span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {!supplier.is_verified && supplier.accreditation_status !== 'blacklisted' && (
            <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60 transition">
              {verifyMutation.isPending ? <LuLoaderCircle size={12} className="animate-spin" /> : <LuShieldCheck size={12} />}
              Verify
            </button>
          )}
          {supplier.accreditation_status === 'accredited' && (
            <div className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <LuShieldCheck size={12} /> Verified
            </div>
          )}
          {supplier.accreditation_status === 'blacklisted' && (
            <div className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800">
              <LuShieldX size={12} /> Blacklisted
            </div>
          )}
          
          <div className="flex gap-1.5 ml-auto">
            <button
              onClick={() => navigate(`/procurement/accreditations?search=${encodeURIComponent(supplier.company_name)}`)}
              className="px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition text-xs font-semibold flex items-center gap-1.5"
              title="View Accreditations"
            >
              <LuShieldCheck size={12} /> Accreditations
            </button>
            <button onClick={() => onView(supplier)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 transition text-xs font-semibold">
              View
            </button>
            <button onClick={() => onEdit(supplier)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition text-xs font-semibold">
              Edit
            </button>
            {supplier.accreditation_status !== 'blacklisted' && (
              <button onClick={() => setShowBlacklist(true)}
                className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Blacklist supplier">
                <LuBan size={14} />
              </button>
            )}
            <button onClick={() => setShowDelete(true)}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-60" title="Delete supplier">
              {deleteMutation.isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuTrash size={14} />}
            </button>
          </div>
        </div>
      </div>

      {showBlacklist && <BlacklistModal supplier={supplier} onClose={() => setShowBlacklist(false)} />}
      {showDelete && <DeleteModal supplier={supplier} onClose={() => setShowDelete(false)} deleteMutation={deleteMutation} />}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Suppliers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'accredited' | 'pending' | 'blacklisted'>('all');
  const [modalConfig, setModalConfig] = useState<{ mode: 'create' | 'edit' | 'view'; data?: Supplier } | null>(null);
  const [page, setPage] = useState(1);
  const [pendingUploads, setPendingUploads] = useState<any[] | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    const workbook = new (await loadExcelJS()).Workbook();
    const worksheet = workbook.addWorksheet('Suppliers');
    const dataSheet = workbook.addWorksheet('Data', { state: 'hidden' });

    // Setup Data for Dropdowns in hidden sheet
    dataSheet.getColumn(1).values = ['PAYMENT_TERMS', 'COD', 'Net 15', 'Net 30', 'Net 60', 'Monthly', 'Upon Order'];
    dataSheet.getColumn(2).values = ['IS_CONSIGNMENT', 'Yes', 'No'];

    // Set columns with widths + headers first
    worksheet.columns = [
      { header: 'Company Name', key: 'company_name', width: 30 },
      { header: 'Contact Person', key: 'contact_person', width: 25 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Payment Terms', key: 'payment_terms', width: 20 },
      { header: 'Is Consignment', key: 'is_consignment', width: 20 },
      { header: 'Bank Name', key: 'bank_name', width: 20 },
      { header: 'Bank Account Number', key: 'bank_account_number', width: 25 },
      { header: 'TIN Number', key: 'tin_number', width: 20 },
    ];

    // Style the header row (row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' } // Blue-500
    };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.commit();

    // Set Data Validations
    for (let i = 2; i <= 500; i++) {
      worksheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['Data!$A$2:$A$7'],
        showErrorMessage: true,
        errorTitle: 'Invalid Payment Terms',
        error: 'Please select a payment term from the dropdown menu.'
      };
      
      worksheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['Data!$B$2:$B$3'],
        showErrorMessage: true,
        errorTitle: 'Invalid Consignment Value',
        error: 'Please select Yes or No.'
      };
    }

    // Instructions sheet
    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.mergeCells('A1:B1');
    const brandCell = helpSheet.getCell('A1');
    brandCell.value = 'JVD INTERNAL MANAGEMENT SYSTEM';
    brandCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF1E293B' } };
    brandCell.alignment = { horizontal: 'center' };

    helpSheet.addRow(['BULK SUPPLIER REGISTRATION GUIDE']);
    helpSheet.getRow(2).font = { bold: true, size: 12, color: { argb: 'FF3B82F6' } };
    helpSheet.addRow(['']);
    helpSheet.addRow(['1. Fill in the "Suppliers" sheet starting from row 2.']);
    helpSheet.addRow(['2. Do not modify or delete the header row (Row 1).']);
    helpSheet.addRow(['3. Company Name is required.']);
    helpSheet.addRow(['4. Use the dropdown menus for Payment Terms and Is Consignment columns.']);
    helpSheet.addRow(['5. Phone should be in format: +63 9XX XXX XXXX or just the number.']);
    helpSheet.addRow(['6. If "Protected View" appears, click "Enable Editing" to use dropdowns.']);
    
    helpSheet.getColumn(1).width = 40;
    helpSheet.getColumn(2).width = 60;

    // Add example row at row 2 (must use getRow(2) explicitly — addRow goes to row 501
    // because the validation loop already touches rows 2-500 via getCell())
    const exampleRow = worksheet.getRow(2);
    exampleRow.getCell('company_name').value = 'ABC Parts Supply Co.';
    exampleRow.getCell('contact_person').value = 'Juan dela cruz';
    exampleRow.getCell('phone').value = '+63 917 123 4567';
    exampleRow.getCell('email').value = 'JuanDC@gmail.com';
    exampleRow.getCell('address').value = 'Manila, Philippines';
    exampleRow.getCell('payment_terms').value = 'Net 30';
    exampleRow.getCell('is_consignment').value = 'No';
    exampleRow.getCell('bank_name').value = 'BDO';
    exampleRow.getCell('bank_account_number').value = '1234-5678-9012';
    exampleRow.getCell('tin_number').value = '000-000-000-000';
    exampleRow.font = { italic: true, color: { argb: 'FF9CA3AF' } };
    exampleRow.commit();

    // Set Suppliers as the active sheet
    workbook.views = [
      {
        x: 0, y: 0, width: 10000, height: 20000,
        firstSheet: 0, activeTab: 0, visibility: 'visible'
      }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'JVD_Suppliers_Bulk_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Branded template with dropdowns downloaded!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new (await loadExcelJS()).Workbook();
    try {
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      const suppliers: any[] = [];

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const company_name = row.getCell(1).text?.trim();
        const contact_person = row.getCell(2).text?.trim();
        const phone = row.getCell(3).text?.trim();
        const email = row.getCell(4).text?.trim();
        const address = row.getCell(5).text?.trim();
        const payment_terms = row.getCell(6).text?.trim();
        const is_consignment_str = row.getCell(7).text?.trim();
        const bank_name = row.getCell(8).text?.trim();
        const bank_account_number = row.getCell(9).text?.trim();
        const tin_number = row.getCell(10).text?.trim();

        // Skip empty rows
        if (!company_name) return;

        const is_consignment = is_consignment_str?.toLowerCase() === 'yes';

        suppliers.push({
          company_name,
          contact_person,
          phone,
          email,
          address,
          payment_terms,
          is_consignment,
          bank_name,
          bank_account_number,
          tin_number
        });
      });

      if (suppliers.length === 0) {
        toast.error('No data found in the Excel file.');
        e.target.value = '';
        return;
      }

      setPendingUploads(suppliers);
      setIsPreviewModalOpen(true);
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to parse Excel file. Please use the provided template.');
      console.error(err);
      e.target.value = '';
    }
  };

  const handleBulkUploadConfirm = async () => {
    if (!pendingUploads || pendingUploads.length === 0) return;

    const suppliersToUpload = [...pendingUploads];
    setPendingUploads(null);
    setIsPreviewModalOpen(false);

    const uploadToast = toast.loading(`Registering ${suppliersToUpload.length} suppliers...`);
    let successCount = 0;
    
    for (const sup of suppliersToUpload) {
      try {
        await supplierApi.create(sup);
        successCount++;
      } catch (err: any) {
        console.error(`Upload error for ${sup.company_name}:`, err);
      }
    }

    toast.dismiss(uploadToast);
    qc.invalidateQueries({ queryKey: ['suppliers'] });
    
    if (successCount === suppliersToUpload.length) {
      toast.success(`Successfully registered ${successCount} suppliers!`);
    } else {
      toast.success(`Completed with partial success: ${successCount}/${suppliersToUpload.length} registered.`);
    }
  };


  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['suppliers', search, filter, page],
    queryFn: () => supplierApi.list({ 
      search: search || undefined, 
      accreditation_status: filter !== 'all' ? filter : undefined,
      page,
      per_page: 10
    }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const suppliers = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Suppliers
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Partner Directory
          </p>
        </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-1 shadow-sm overflow-hidden">
               <button 
                 onClick={downloadTemplate}
                 className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
                 title="Download Template"
               >
                 <LuFileDown size={18} className="text-gray-400" />
                 <span className="hidden lg:inline">Format</span>
               </button>
               <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 self-center" />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/60 text-blue-600 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
                 title="Upload Excel"
               >
                 <LuFileUp size={18} />
                 <span className="hidden lg:inline">Bulk Upload</span>
               </button>
            </div>
            
            <button onClick={() => setModalConfig({ mode: 'create' })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
              <LuPlus size={16} /> Add Supplier
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
          </div>

      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
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
        <div className="flex gap-1.5 bg-gray-100/50 dark:bg-gray-900/50 p-1.5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 overflow-x-auto hide-scrollbar">
          {(['all', 'accredited', 'pending', 'blacklisted'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === f 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Premium top progress bar during background loading */}
      {isPlaceholderData && (
        <div className="fixed top-0 left-0 w-full h-1 z-[9999] overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
          <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
        </div>
      )}

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
        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
          {suppliers.map(s => <SupplierCard 
             key={s.id} 
             supplier={s} 
             onEdit={(sup) => setModalConfig({ mode: 'edit', data: sup })}
             onView={(sup) => setModalConfig({ mode: 'view', data: sup })}
          />)}
        </div>
      )}

      {modalConfig && (
        <SupplierModal 
          mode={modalConfig.mode} 
          initialData={modalConfig.data} 
          onClose={() => setModalConfig(null)} 
        />
      )}

      {/* Bulk Upload Preview Modal */}
      <Modal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)}
        title="Bulk Supplier Registration Preview"
        size="xl"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LuTriangleAlert size={20} className="text-amber-500" />
              <p className="text-xs text-amber-700 font-bold uppercase tracking-tight">
                Review Data: {pendingUploads?.length} suppliers detected.
              </p>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Company</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {pendingUploads?.map((sup, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-gray-900 dark:text-white">{sup.company_name}</p>
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">{sup.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{sup.contact_person}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{sup.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase border border-blue-100 dark:border-blue-800">
                            {sup.payment_terms}
                          </span>
                          {sup.is_consignment && (
                            <span className="text-[10px] font-bold text-purple-600 uppercase ml-0.5">
                              Consignment
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setIsPreviewModalOpen(false)}>
              Abort Upload
            </Button>
            <Button onClick={handleBulkUploadConfirm} className="px-8 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20">
              Confirm & Register All
            </Button>
          </div>
        </div>
      </Modal>

      
      {meta && meta.last_page > 1 && (
        <Pagination
          currentPage={page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

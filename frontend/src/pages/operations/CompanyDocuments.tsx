import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { LuFile, LuSearch, LuTrash, LuFileDown, LuX, LuFileUp, LuFileText, LuChevronRight, LuFolderOpen } from 'react-icons/lu';
import { procurementDocumentApi, type ProcurementDocumentFormData } from '../../api/procurementDocuments';
import { supplierApi } from '../../api/suppliers';
import { inventoryApi } from '../../api/inventory';
import { userApi } from '../../api/users';
import { customerApi } from '../../api/customers';
import { accreditationsApi } from '../../api/accreditations';
import { jobOrderApi } from '../../api/jobOrders';
import { workOrderApi } from '../../api/workOrders';
import { tripTicketApi } from '../../api/operations';
import { Modal, Button, ConfirmDialog } from '../../components/ui';
import { useEntityPreview } from '../../context/EntityPreviewContext';

interface AddDocumentModalProps { onClose: () => void; }

function AddDocumentModal({ onClose }: AddDocumentModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProcurementDocumentFormData>({
    title: '',
    document_type: 'receipt',
    amount: null,
    supplier_id: null,
    inventory_item_id: null,
    driver_id: null,
    customer_id: null,
    job_order_id: null,
    work_order_id: null,
    trip_ticket_id: null,
    custom_metadata: {}
  });
  const [file, setFile] = useState<File | null>(null);
  const [metaKey, setMetaKey] = useState('');
  const [metaValue, setMetaValue] = useState('');

  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => supplierApi.list() });
  const { data: inventoryRes } = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.list() });
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => userApi.list() });
  const { data: customersRes } = useQuery({ queryKey: ['customers'], queryFn: () => customerApi.list() });
  const { data: accreditationsRes } = useQuery({ queryKey: ['accreditations'], queryFn: () => accreditationsApi.list() });
  const { data: jobOrdersRes } = useQuery({ queryKey: ['jobOrders'], queryFn: () => jobOrderApi.list() });
  const { data: workOrdersRes } = useQuery({ queryKey: ['workOrders'], queryFn: () => workOrderApi.list() });
  const { data: tripTicketsRes } = useQuery({ queryKey: ['tripTickets'], queryFn: () => tripTicketApi.getAll() });

  const mutation = useMutation({
    mutationFn: async () => {
      let base64 = '';
      if (file) {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }
      return procurementDocumentApi.create({ ...form, file_base64: base64 });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-documents'] });
      toast.success('Document uploaded successfully');
      onClose();
    },
    onError: () => toast.error('Failed to upload document')
  });

  const handleAddMeta = () => {
    if (metaKey && metaValue) {
      setForm(prev => ({
        ...prev,
        custom_metadata: { ...prev.custom_metadata, [metaKey]: metaValue }
      }));
      setMetaKey('');
      setMetaValue('');
    }
  };

  const handleRemoveMeta = (key: string) => {
    setForm(prev => {
      const newMeta = { ...prev.custom_metadata };
      delete newMeta[key];
      return { ...prev, custom_metadata: newMeta };
    });
  };

  return (
    <Modal isOpen onClose={onClose} title="Upload Document" size="lg">
      <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-2">
        <div className="space-y-6">
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Basic Information</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                  <input type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}>
                    <option value="receipt">Receipt</option>
                    <option value="invoice">Invoice</option>
                    <option value="delivery_note">Delivery Note</option>
                    <option value="agreement">Agreement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File Upload *</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="space-y-1 text-center">
                    <LuFileUp className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex flex-col sm:flex-row justify-center items-center text-sm text-gray-600 dark:text-gray-400">
                      <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
                      </label>
                      <p className="pl-1 hidden sm:block">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG, DOC up to 10MB</p>
                    {file && <p className="text-sm font-semibold text-blue-600 mt-2 truncate w-full max-w-[200px] mx-auto">{file.name}</p>}
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Links & Details</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Supplier</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.supplier_id || ''} onChange={e => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {suppliersRes?.data.data.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Item</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.inventory_item_id || ''} onChange={e => setForm({ ...form, inventory_item_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {inventoryRes?.data.data.map(i => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Driver</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.driver_id || ''} onChange={e => setForm({ ...form, driver_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {usersRes?.data.data.filter((u: any) => u.role === 'driver').map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Customer</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {customersRes?.data.data.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Job Order</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.job_order_id || ''} onChange={e => setForm({ ...form, job_order_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {jobOrdersRes?.data.data.map(jo => <option key={jo.id} value={jo.id}>JO #{jo.jo_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Work Order</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.work_order_id || ''} onChange={e => setForm({ ...form, work_order_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {workOrdersRes?.data.data.map(wo => <option key={wo.id} value={wo.id}>WO #{wo.wo_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Trip Ticket</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.trip_ticket_id || ''} onChange={e => setForm({ ...form, trip_ticket_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {Array.isArray(tripTicketsRes) && tripTicketsRes.map(tt => <option key={tt.id} value={tt.id}>Ticket #{tt.control_no}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Accreditation</label>
                  <select className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.transaction_type === 'accreditation' ? form.transaction_id || '' : ''} onChange={e => setForm({ ...form, transaction_type: e.target.value ? 'accreditation' : null, transaction_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">-- None --</option>
                    {accreditationsRes?.data.data.map(a => <option key={a.id} value={a.id}>{a.entity_name} ({a.accreditation_type})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (Optional)</label>
                <input type="number" step="0.01" className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : null })} />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Details</label>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input type="text" placeholder="Key (e.g. Odometer)" className="flex-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={metaKey} onChange={e => setMetaKey(e.target.value)} />
                  <input type="text" placeholder="Value (e.g. 15000 km)" className="flex-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={metaValue} onChange={e => setMetaValue(e.target.value)} />
                  <Button onClick={handleAddMeta} type="button" variant="secondary" className="w-full sm:w-auto">Add</Button>
                </div>
                <div className="space-y-2">
                  {Object.entries(form.custom_metadata || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate mr-2">{key}: <span className="font-normal text-gray-500">{String(val)}</span></span>
                      <button type="button" onClick={() => handleRemoveMeta(key)} className="text-red-500 hover:text-red-700 shrink-0"><LuX size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title || !file}>
              {mutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function CompanyDocuments() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'receipt' | 'invoice' | 'delivery_note' | 'agreement' | 'kyc' | 'passport' | 'visa' | 'accreditation' | 'other'>('all');
  const [deleteDocId, setDeleteDocId] = useState<number | string | null>(null);
  const qc = useQueryClient();
  const { showPreview } = useEntityPreview();

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['procurement-documents', searchTerm],
    queryFn: () => procurementDocumentApi.list(searchTerm ? { search: searchTerm } : {}),
    staleTime: 10_000,
    placeholderData: keepPreviousData
  });

  const deleteMutation = useMutation({
    mutationFn: procurementDocumentApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-documents'] });
      toast.success('Document deleted');
    }
  });

  const getApiUrl = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    return apiBase.startsWith('/')
      ? apiBase.replace(/\/api$/, '')
      : apiBase.replace(/\/api$/, '') || 'http://localhost:8000';
  };

  const docs = data?.data.data || [];
  const filteredDocs = docs.filter((doc: any) => {
    return docTypeFilter === 'all' || doc.document_type === docTypeFilter;
  });

  const counts = {
    all: docs.length,
    receipt: docs.filter((d: any) => d.document_type === 'receipt').length,
    invoice: docs.filter((d: any) => d.document_type === 'invoice').length,
    delivery_note: docs.filter((d: any) => d.document_type === 'delivery_note').length,
    agreement: docs.filter((d: any) => d.document_type === 'agreement').length,
    kyc: docs.filter((d: any) => d.document_type === 'kyc').length,
    passport: docs.filter((d: any) => d.document_type === 'passport').length,
    visa: docs.filter((d: any) => d.document_type === 'visa').length,
    accreditation: docs.filter((d: any) => d.document_type === 'accreditation').length,
    other: docs.filter((d: any) => d.document_type === 'other').length,
  };

  const getDocumentTypeStyles = (type: string) => {
    switch (type) {
      case 'receipt': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'invoice': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
      case 'delivery_note': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'agreement': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50';
      case 'kyc': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50';
      case 'passport': return 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/50';
      case 'visa': return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
      case 'accreditation': return 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50';
      default: return 'bg-gray-50 text-gray-650 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getRowIndicatorStyle = (_type?: string) => {
    return '';
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <LuFolderOpen className="text-blue-600" />
          Company Documents
        </h1>
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
        >
          <LuFileUp className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Quick Access Document Types */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 shrink-0 relative z-20 no-print">
        {[
          { value: 'all', label: 'All Folders', icon: LuFolderOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50' },
          { value: 'receipt', label: 'Receipts', icon: LuFileText, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50' },
          { value: 'invoice', label: 'Invoices', icon: LuFileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50' },
          { value: 'delivery_note', label: 'Delivery Notes', icon: LuFileText, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50' },
          { value: 'agreement', label: 'Agreements', icon: LuFileText, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50' },
          { value: 'kyc', label: 'KYC Docs', icon: LuFileText, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50' },
          { value: 'passport', label: 'Passports', icon: LuFileText, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/50' },
          { value: 'visa', label: 'Visas', icon: LuFileText, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50' },
          { value: 'accreditation', label: 'Accreds', icon: LuFileText, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/50' },
          { value: 'other', label: 'Others', icon: LuFile, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = docTypeFilter === item.value;
          const count = counts[item.value as keyof typeof counts] || 0;
          return (
            <button
              key={item.value}
              onClick={() => setDocTypeFilter(item.value as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center group ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.01]'
                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 text-gray-750 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700 hover:scale-[1.005]'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 border transition-all mb-1 ${
                isActive 
                  ? 'bg-white/20 text-white border-white/20' 
                  : `${item.color}`
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 font-medium">
                <p className="text-[9px] font-black uppercase tracking-wider truncate">
                  {item.label}
                </p>
                <p className={`text-[10px] font-bold leading-none mt-0.5 ${
                  isActive ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {count} {count === 1 ? 'file' : 'files'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800/80 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents, details..."
              className="pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-transparent dark:border-gray-700/50 rounded-full text-xs focus:ring-4 focus:ring-blue-600/5 focus:bg-white dark:focus:bg-gray-800 w-full transition-all font-semibold dark:text-white shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Vault:</span>
            <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
              docTypeFilter === 'all' 
                ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50'
                : getDocumentTypeStyles(docTypeFilter)
            }`}>
              {docTypeFilter.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className={`relative overflow-x-auto custom-scrollbar ${filteredDocs.length > 0 ? 'min-h-[350px]' : ''}`}>
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-l-2xl">Title</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Entities</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Additional Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right rounded-r-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800/50 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div></td>
                  </tr>
                ))
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${getRowIndicatorStyle(doc.document_type)}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm animate-all duration-200">
                          <LuFile className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">{doc.title}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1">
                            Uploaded by: {doc.uploader?.first_name ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : 'System Upload'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest inline-block ${getDocumentTypeStyles(doc.document_type)}`}>
                        {doc.document_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5 text-[11px] font-bold">
                        {doc.supplier && (
                          <button onClick={() => showPreview('supplier', doc.supplier!.id)} className="text-left text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg w-fit hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors uppercase tracking-tight">
                            Supplier: {doc.supplier.company_name}
                          </button>
                        )}
                        {doc.inventory_item && (
                          <button onClick={() => showPreview('inventory', doc.inventory_item!.id)} className="text-left text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg w-fit hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors uppercase tracking-tight">
                            Item: {doc.inventory_item.item_name}
                          </button>
                        )}
                        {doc.driver && (
                          <button onClick={() => showPreview('driver', doc.driver!.id)} className="text-left text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg w-fit hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors uppercase tracking-tight">
                            Driver: {doc.driver.first_name} {doc.driver.last_name}
                          </button>
                        )}
                        {doc.linkages?.customer && (
                          <button onClick={() => showPreview('customer', doc.linkages!.customer.id)} className="text-left text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-lg w-fit hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors uppercase tracking-tight">
                            Customer: {doc.linkages.customer.first_name} {doc.linkages.customer.last_name}
                          </button>
                        )}
                        {doc.linkages?.job_order && (
                          <span className="text-left text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-lg w-fit hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors uppercase tracking-tight">
                            Job Order: #{doc.linkages.job_order.jo_number}
                          </span>
                        )}
                        {doc.linkages?.work_order && (
                          <span className="text-left text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-0.5 rounded-lg w-fit hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors uppercase tracking-tight">
                            Work Order: #{doc.linkages.work_order.wo_number}
                          </span>
                        )}
                        {doc.linkages?.trip_ticket && (
                          <span className="text-left text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 rounded-lg w-fit hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors uppercase tracking-tight">
                            Trip Ticket: #{doc.linkages.trip_ticket.control_no}
                          </span>
                        )}
                        {doc.linkages?.accreditation && (
                          <span className="text-left text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-lg w-fit uppercase tracking-tight">
                            Accred: {doc.linkages.accreditation.entity_name} ({doc.linkages.accreditation.accreditation_type})
                          </span>
                        )}
                        {!doc.supplier && !doc.inventory_item && !doc.driver && !doc.linkages?.customer && !doc.linkages?.job_order && !doc.linkages?.work_order && !doc.linkages?.trip_ticket && !doc.linkages?.accreditation && (
                          <span className="text-gray-400 uppercase tracking-widest text-[9px]">Unlinked</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Object.entries(doc.custom_metadata || {}).map(([k, v]) => (
                          <span key={k} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-[9px] font-bold tracking-tight">
                            {k}: {String(v)}
                          </span>
                        ))}
                        {Object.keys(doc.custom_metadata || {}).length === 0 && (
                          <span className="text-gray-400 uppercase tracking-widest text-[9px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-gray-950 dark:text-white">
                      {doc.amount ? `₱${Number(doc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <a
                          href={doc.file_path.startsWith('http') ? doc.file_path : `${getApiUrl()}/storage/${doc.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                          title="View or Download Document"
                        >
                          <LuFileDown className="w-4 h-4" /> View
                        </a>
                        <button
                          onClick={() => setDeleteDocId(doc.id)}
                          className="px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                          title="Delete Document"
                        >
                          <LuTrash className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && <AddDocumentModal onClose={() => setIsAddOpen(false)} />}
      
      {deleteDocId !== null && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteDocId(null)}
          onConfirm={() => deleteMutation.mutate(deleteDocId)}
          title="Delete Document"
          message="Are you sure you want to delete this document? This action cannot be undone."
          confirmText="Delete"
          variant="error"
        />
      )}
    </div>
  );
}

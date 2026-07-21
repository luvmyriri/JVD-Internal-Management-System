import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { LuFile, LuSearch, LuTrash, LuFileDown, LuX, LuFileUp, LuFileText, LuChevronRight, LuFolderOpen, LuFolderPlus, LuLoaderCircle, LuSettings, LuLock } from 'react-icons/lu';
import { procurementDocumentApi, documentCategoryApi, type ProcurementDocumentFormData, type DocumentCategory, type ProcurementDocument } from '../../api/procurementDocuments';
import { supplierApi } from '../../api/suppliers';
import { inventoryApi } from '../../api/inventory';
import { userApi } from '../../api/users';
import { customerApi } from '../../api/customers';
import { accreditationsApi } from '../../api/accreditations';
import { jobOrderApi } from '../../api/jobOrders';
import { workOrderApi } from '../../api/workOrders';
import { tripTicketApi } from '../../api/operations';
import { Modal, Button, ConfirmDialog } from '../../components/ui';
import { DataTable, type Column } from '../../components/ds';
import { useEntityPreview } from '../../context/EntityPreviewContext';
import { useAuth } from '../../context/AuthContext';
import { cn, formatMoneyInput, parseMoneyInput } from '../../utils';


interface AddDocumentModalProps {
  categories: DocumentCategory[];
  onClose: () => void;
}

function AddDocumentModal({ categories, onClose }: AddDocumentModalProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  const filteredCategories = categories.filter(cat => 
    !cat.allowed_roles || cat.allowed_roles.length === 0 || (user && cat.allowed_roles.includes(user.role))
  );

  const [form, setForm] = useState<ProcurementDocumentFormData>(() => ({
    title: '',
    document_type: filteredCategories.length > 0 ? filteredCategories[0].slug : (categories.length > 0 ? categories[0].slug : 'receipt'),
    amount: null,
    supplier_id: null,
    inventory_item_id: null,
    driver_id: null,
    customer_id: null,
    job_order_id: null,
    work_order_id: null,
    trip_ticket_id: null,
    custom_metadata: {}
  }));
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
      return procurementDocumentApi.create({
        ...form,
        amount: form.amount ? Number(parseMoneyInput(String(form.amount))) : null,
        file_base64: base64
      });
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
                  <select 
                    className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                    value={form.document_type} 
                    onChange={e => setForm({ ...form, document_type: e.target.value })}
                  >
                    {categories.length > 0 ? (
                      filteredCategories.map(cat => (
                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="receipt">Receipt</option>
                        <option value="invoice">Invoice</option>
                        <option value="delivery_note">Delivery Note</option>
                        <option value="agreement">Agreement</option>
                        <option value="other">Other</option>
                      </>
                    )}
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
                <input type="text" inputMode="decimal" className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={form.amount !== null && form.amount !== undefined ? formatMoneyInput(String(form.amount)) : ''}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm({ ...form, amount: formatted as any });
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
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
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [deleteDocId, setDeleteDocId] = useState<number | string | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const qc = useQueryClient();
  const { showPreview } = useEntityPreview();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: catData } = useQuery({
    queryKey: ['document-categories'],
    queryFn: () => documentCategoryApi.list(),
    staleTime: 30_000,
  });
  const categories: DocumentCategory[] = catData?.data?.data ?? [];

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
      ? apiBase.replace(/\/api(\/v\d+)?$/, '')
      : apiBase.replace(/\/api(\/v\d+)?$/, '') || 'http://localhost:8000';
  };

  const docs = data?.data.data || [];
  const filteredDocs = docs.filter((doc: any) => {
    const typeMatch = docTypeFilter === 'all' || doc.document_type === docTypeFilter;
    return typeMatch;
  });

  // Build counts from categories + fallback static ones
  const countFor = (slug: string) =>
    slug === 'all' ? docs.length : docs.filter((d: any) => d.document_type === slug).length;

  const canDelete = (doc: any) => {
    if (user?.role === 'super_admin' || user?.role === 'executive_vice_president') return true;
    return doc.uploaded_by === user?.id;
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

  const columns: Column<ProcurementDocument>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm animate-all duration-200">
            <LuFile className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-gray-950 dark:text-white tracking-tight leading-tight">{doc.title}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1 flex items-center gap-1">
              Uploaded by: {doc.uploaded_by === user?.id ? (
                <span className="text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-md inline-block leading-none">You</span>
              ) : (
                doc.uploader?.first_name ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : 'System Upload'
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'document_type',
      header: 'Type',
      render: (doc) => (
        <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest inline-block ${getDocumentTypeStyles(doc.document_type)}`}>
          {doc.document_type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'linked_entities',
      header: 'Linked Entities',
      render: (doc) => (
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
      ),
    },
    {
      key: 'custom_metadata',
      header: 'Additional Details',
      render: (doc) => (
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
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (doc) => (
        <span className="font-black text-gray-950 dark:text-white">
          {doc.amount ? `₱${Number(doc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (doc) => (
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
          {canDelete(doc) && (
            <button
              onClick={() => setDeleteDocId(doc.id)}
              className="px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Delete Document"
            >
              <LuTrash className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      ),
    },
  ];

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

      {/* Dynamic Category Folders */}
      <div className="flex flex-col gap-4 shrink-0 relative z-20 no-print">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Company Document Folders</p>
          {isSuperAdmin && (
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-900/40"
            >
              <LuFolderPlus size={12} /> Manage Folders
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* All Folders */}
          <button
            onClick={() => setDocTypeFilter('all')}
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${
              docTypeFilter === 'all'
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.01]'
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 text-gray-750 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700 hover:scale-[1.005]'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 border transition-all ${
              docTypeFilter === 'all'
                ? 'bg-white/20 text-white border-white/20'
                : 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50'
            }`}>
              <LuFolderOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0 font-medium">
              <p className="text-[10px] font-black uppercase tracking-wider truncate">All Folders</p>
              <p className={`text-xs font-bold leading-none mt-0.5 ${docTypeFilter === 'all' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                {countFor('all')} files
              </p>
            </div>
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => {
            const isActive = docTypeFilter === cat.slug;
            const count = countFor(cat.slug);
            const isRestricted = cat.allowed_roles && cat.allowed_roles.length > 0 && (!user || !cat.allowed_roles.includes(user.role));
            return (
              <button
                key={cat.id}
                onClick={() => setDocTypeFilter(cat.slug)}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.01]'
                    : isRestricted
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-500 opacity-75 hover:opacity-100 hover:scale-[1.005]'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700 hover:scale-[1.005]'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 border transition-all ${
                  isActive
                    ? 'bg-white/20 text-white border-white/20'
                    : 'text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                }`}>
                  <LuFileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 font-medium">
                  <p className="text-[10px] font-black uppercase tracking-wider truncate">{cat.name}</p>
                  <p className={`text-xs font-bold leading-none mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {count} {count === 1 ? 'file' : 'files'}
                  </p>
                  {isRestricted ? (
                    <p className="text-[9px] text-red-500 dark:text-red-400 truncate mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                      <LuLock size={10} /> Access Restricted
                    </p>
                  ) : cat.allowed_roles && cat.allowed_roles.length > 0 && (
                    <p className="text-[9px] text-gray-400 dark:text-gray-600 truncate mt-0.5 uppercase tracking-wider">
                      {cat.allowed_roles.join(', ')}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
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
          <DataTable
            columns={columns}
            data={filteredDocs}
            rowKey={(doc) => doc.id}
            className={cn('transition-all duration-300 [&_table]:min-w-[900px]', isPlaceholderData && 'opacity-60 pointer-events-none saturate-50')}
            empty={
              isLoading ? (
                <div className="animate-pulse px-6 py-8">
                  <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div>
                </div>
              ) : (
                <div className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</div>
              )
            }
          />
        </div>
      </div>

      {isAddOpen && <AddDocumentModal categories={categories} onClose={() => setIsAddOpen(false)} />}
      
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

      {/* Manage Folders Modal (Superadmin only) */}
      {isFolderModalOpen && (
        <ManageFoldersModal
          categories={categories}
          onClose={() => setIsFolderModalOpen(false)}
        />
      )}

      {deleteCatId !== null && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteCatId(null)}
          onConfirm={() => {
            documentCategoryApi.delete(deleteCatId).then(() => {
              qc.invalidateQueries({ queryKey: ['document-categories'] });
              toast.success('Folder deleted');
              setDeleteCatId(null);
            }).catch(() => toast.error('Failed to delete folder'));
          }}
          title="Delete Folder"
          message="Are you sure you want to delete this folder? Documents in this folder won't be deleted — only the category definition will be removed."
          confirmText="Delete Folder"
          variant="error"
        />
      )}
    </div>
  );
}

// ── Manage Folders Modal (Superadmin) ────────────────────────────────────────

const ALL_ROLES = [
  'super_admin', 'executive_vice_president', 'operations_manager', 'reservation_officer',
  'office_staff', 'accounting_executive', 'corporate_secretary', 'logistics_in_charge',
  'dispatcher', 'purchasing_manager', 'head_mechanic', 'service_adviser', 'driver'
];

function ManageFoldersModal({ categories, onClose }: { categories: DocumentCategory[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: () => documentCategoryApi.create({ name: newName.trim(), allowed_roles: newRoles.length > 0 ? newRoles : null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-categories'] });
      toast.success('Folder created!');
      setNewName('');
      setNewRoles([]);
    },
    onError: () => toast.error('Failed to create folder'),
  });

  const updateMutation = useMutation({
    mutationFn: () => documentCategoryApi.update(editId!, { name: editName.trim(), allowed_roles: editRoles.length > 0 ? editRoles : null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-categories'] });
      toast.success('Folder updated!');
      setEditId(null);
    },
    onError: () => toast.error('Failed to update folder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentCategoryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-categories'] });
      toast.success('Folder deleted');
    },
    onError: () => toast.error('Failed to delete folder'),
  });

  const toggleRole = (role: string, roles: string[], setRoles: (r: string[]) => void) => {
    setRoles(roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role]);
  };

  return (
    <Modal isOpen onClose={onClose} title="Manage Document Folders" size="lg">
      <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
        {/* Create New Folder */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 space-y-4">
          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Create New Folder</p>
          <input
            type="text"
            placeholder="Folder name (e.g. Canva Files, Package Designs)"
            className="w-full px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 dark:text-white"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Restrict Access To Roles (leave empty for all)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role, newRoles, setNewRoles)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                    newRoles.includes(role)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!newName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuFolderPlus size={14} />}
            Create Folder
          </Button>
        </div>

        {/* Existing Folders */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Existing Folders ({categories.length})</p>
          {categories.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No folders yet. Create one above.</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-3">
              {editId === cat.id ? (
                <>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:text-white"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role, editRoles, setEditRoles)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                          editRoles.includes(role)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => updateMutation.mutate()} disabled={!editName.trim() || updateMutation.isPending}>
                      {updateMutation.isPending ? <LuLoaderCircle size={12} className="animate-spin" /> : null} Save
                    </Button>
                    <Button variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{cat.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                      {cat.allowed_roles && cat.allowed_roles.length > 0 ? `Roles: ${cat.allowed_roles.join(', ')}` : 'All roles'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditRoles(cat.allowed_roles ?? []); }}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      title="Edit folder"
                    >
                      <LuSettings size={14} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(cat.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-xl border border-red-100 dark:border-red-900/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                      title="Delete folder"
                    >
                      {deleteMutation.isPending ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuTrash size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuFile, LuSearch, LuTrash, LuFileDown, LuX, LuFileUp, LuFileText } from 'react-icons/lu';
import { procurementDocumentApi, type ProcurementDocumentFormData } from '../../api/procurementDocuments';
import { supplierApi } from '../../api/suppliers';
import { inventoryApi } from '../../api/inventory';
import { userApi } from '../../api/users';
import { Modal, Button } from '../../components/ui';
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
    custom_metadata: {}
  });
  const [file, setFile] = useState<File | null>(null);
  const [metaKey, setMetaKey] = useState('');
  const [metaValue, setMetaValue] = useState('');

  const { data: suppliersRes } = useQuery({ queryKey: ['suppliers'], queryFn: () => supplierApi.list() });
  const { data: inventoryRes } = useQuery({ queryKey: ['inventory'], queryFn: () => inventoryApi.list() });
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => userApi.list() });

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
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
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
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                  <span>Upload a file</span>
                  <input type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF, PNG, JPG, DOC up to 10MB</p>
              {file && <p className="text-sm font-semibold text-blue-600 mt-2">{file.name}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (Optional)</label>
          <input type="number" step="0.01" className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value ? Number(e.target.value) : null })} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Metadata</label>
          <div className="flex gap-2 mb-3">
            <input type="text" placeholder="Key (e.g. Odometer)" className="flex-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={metaKey} onChange={e => setMetaKey(e.target.value)} />
            <input type="text" placeholder="Value (e.g. 15000 km)" className="flex-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" value={metaValue} onChange={e => setMetaValue(e.target.value)} />
            <Button onClick={handleAddMeta} type="button" variant="secondary">Add</Button>
          </div>
          <div className="space-y-2">
            {Object.entries(form.custom_metadata || {}).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{key}: <span className="font-normal text-gray-500">{String(val)}</span></span>
                <button type="button" onClick={() => handleRemoveMeta(key)} className="text-red-500 hover:text-red-700"><LuX size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title || !file}>
            {mutation.isPending ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProcurementDocuments() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const qc = useQueryClient();
  const { showPreview } = useEntityPreview();

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-documents', searchTerm],
    queryFn: () => procurementDocumentApi.list(searchTerm ? { search: searchTerm } : {})
  });

  const deleteMutation = useMutation({
    mutationFn: procurementDocumentApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-documents'] });
      toast.success('Document deleted');
    }
  });

  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <LuFileText className="text-blue-600" />
            Procurement Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage interconnected receipts, invoices, and contracts.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 shrink-0">
          <LuFileUp size={18} /> Upload Document
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="relative flex-1 max-w-md">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search documents, metadata..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Linked Entities</th>
                <th className="px-6 py-4">Custom Metadata</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : data?.data.data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No documents found</td></tr>
              ) : (
                data?.data.data.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <LuFile className="text-gray-400" />
                        {doc.title}
                      </div>
                      <div className="text-xs text-gray-500 font-normal mt-1">By: {doc.uploader?.first_name} {doc.uploader?.last_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium uppercase tracking-wider">
                        {doc.document_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        {doc.supplier && (
                          <button onClick={() => showPreview('supplier', doc.supplier!.id)} className="text-left text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded w-fit hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                            Supplier: {doc.supplier.company_name}
                          </button>
                        )}
                        {doc.inventory_item && (
                          <button onClick={() => showPreview('inventory', doc.inventory_item!.id)} className="text-left text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded w-fit hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                            Item: {doc.inventory_item.item_name}
                          </button>
                        )}
                        {doc.driver && (
                          <button onClick={() => showPreview('driver', doc.driver!.id)} className="text-left text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded w-fit hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                            Driver: {doc.driver.first_name} {doc.driver.last_name}
                          </button>
                        )}
                        {!doc.supplier && !doc.inventory_item && !doc.driver && <span className="text-gray-400">Unlinked</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {Object.entries(doc.custom_metadata || {}).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[10px] truncate max-w-[150px]">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {doc.amount ? `₱${Number(doc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <a href={`${getApiUrl()}/storage/${doc.file_path}`} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="View/Download">
                          <LuFileDown size={18} />
                        </a>
                        <button onClick={() => { if (confirm('Delete this document?')) deleteMutation.mutate(doc.id); }} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                          <LuTrash size={18} />
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
    </div>
  );
}

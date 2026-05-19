import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuShieldCheck, LuPlus, LuSearch, LuLoaderCircle, LuUserCheck,
  LuFileText, LuLink, LuX, LuMail, LuBuilding2, LuBus, LuClock,
  LuCloudUpload, LuDownload
} from 'react-icons/lu';
import { accreditationsApi, type Accreditation } from '../../api/accreditations';
import { Pagination, Modal, Button } from '../../components/ui';

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

  const [filesToUpload, setFilesToUpload] = useState<{ [key: string]: File }>({});

  const uploadMutation = useMutation({
    mutationFn: ({ id, type, file }: { id: number, type: string, file: File }) => 
      accreditationsApi.uploadDocument(id, type, file)
  });

  const mutation = useMutation({
    mutationFn: async () => {
      // Create first without document urls
      const { ...dataToSubmit } = form;
      ['kyc_document_url', 'nda_document_url', 'terms_document_url'].forEach(k => delete dataToSubmit[k as keyof Accreditation]);
      
      const res = await accreditationsApi.create(dataToSubmit);
      const accId = res.data.data?.id || (res.data as any).id;
      
      // Upload pending files
      if (accId) {
        for (const [type, file] of Object.entries(filesToUpload)) {
          await uploadMutation.mutateAsync({ id: accId, type, file });
        }
      }
      return res;
    },
    onSuccess: () => { 
      toast.success('Accreditation created successfully');
      qc.invalidateQueries({ queryKey: ['accreditations'] }); 
      onClose(); 
    },
    onError: () => {
      toast.error('Failed to create accreditation');
    }
  });

  const formatName = (val: string) => val.replace(/[^A-Za-z\s-']/g, '');

  const field = (label: string, key: keyof Accreditation, type = 'text', placeholder = '', customOnChange?: (val: string) => void) => (
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
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">New Accreditation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Initialize a new entity accreditation process.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50 dark:bg-gray-800"><LuX size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto">
          <form id="accreditation-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Entity Type</label>
                <select
                  value={form.entity_type}
                  onChange={e => setForm(p => ({ ...p, entity_type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white dark:bg-gray-900"
                >
                  <option value="supplier">Supplier</option>
                  <option value="partner">Partner</option>
                  <option value="client">Client</option>
                  <option value="driver">Driver</option>
                  <option value="bus">Bus</option>
                </select>
              </div>
              {field('Entity Name', 'entity_name', 'text', 'Company or Individual Name', val => setForm(p => ({ ...p, entity_name: formatName(val) })))}
              {field('Accreditation Type', 'accreditation_type', 'text', 'e.g. Supplier Verification')}
              {field('Contact Person', 'contact_person', 'text', 'Primary Contact', val => setForm(p => ({ ...p, contact_person: formatName(val) })))}
              {field('Contact Email', 'contact_email', 'email', 'contact@domain.com')}
              <div className="sm:col-span-2 mt-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Supporting Documents</label>
                <div className="grid grid-cols-3 gap-4">
                  {['kyc', 'nda', 'terms'].map(doc => (
                    <label key={doc} className="relative flex flex-col items-center justify-center w-full h-[60px] border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 hover:bg-gray-100 transition-colors px-2">
                      {form[`${doc}_document_url` as keyof Accreditation] ? (
                         <div className="flex flex-col items-center justify-center w-full" onClick={(e) => e.preventDefault()}>
                           <span className="text-[10px] font-bold text-emerald-600 uppercase">Attached</span>
                           <button type="button" onClick={(e) => { e.preventDefault(); setForm(p => ({ ...p, [`${doc}_document_url`]: '' })); }} className="text-gray-400 hover:text-red-500 mt-1"><LuX size={12} /></button>
                         </div>
                      ) : (
                        <>
                          <LuCloudUpload className="w-4 h-4 mb-1 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase">{doc} Doc</span>
                          <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFilesToUpload(p => ({ ...p, [doc]: file }));
                              setForm(p => ({ ...p, [`${doc}_document_url`]: 'attached' }));
                              toast.success(`${doc.toUpperCase()} document attached`);
                            }
                          }} />
                        </>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">
                Failed to create accreditation. Please check required fields.
              </p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-white transition">
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

// ── Details Modal ────────────────────────────────────────────────────────────

interface DetailsModalProps { acc: Accreditation; onClose: () => void; }
function AccreditationDetailsModal({ acc, onClose }: DetailsModalProps) {
  const qc = useQueryClient();
  const uploadMutation = useMutation({
    mutationFn: ({ id, type, file }: { id: number, type: string, file: File }) => 
      accreditationsApi.uploadDocument(id, type, file),
    onSuccess: () => {
      toast.success('Main Document uploaded successfully!');
      qc.invalidateQueries({ queryKey: ['accreditations'] });
    },
    onError: () => {
      toast.error('Failed to upload document');
    }
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, key }: { id: number, key: string }) => 
      accreditationsApi.update(id, { [key]: '' }),
    onSuccess: () => {
      toast.success('Main Document removed!');
      qc.invalidateQueries({ queryKey: ['accreditations'] });
    }
  });

  const handleMainFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ 
        id: acc.id, 
        type: 'main', 
        file 
      });
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Accreditation Details" size="lg">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            {ENTITY_ICONS[acc.entity_type] ?? <LuShieldCheck size={28} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{acc.entity_name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{acc.entity_type} • {acc.accreditation_type}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={acc.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Person</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{acc.contact_person}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Email</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{acc.contact_email}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Issuing Body</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{acc.issuing_body || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expiry Date</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{acc.expiry_date ? new Date(acc.expiry_date).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Main Supporting Document</p>
          {acc.document_url ? (
            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <div className="flex items-center gap-2">
                <LuFileText size={18} />
                <span className="text-sm font-bold">Document Uploaded</span>
              </div>
              <button onClick={() => removeMutation.mutate({ id: acc.id, key: 'document_url' })} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold underline">
                Remove
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-[100px] border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pb-2">
                {uploadMutation.isPending ? <LuLoaderCircle className="w-6 h-6 mb-2 text-blue-500 animate-spin" /> : <LuCloudUpload className="w-6 h-6 mb-2 text-gray-400" />}
                <p className="text-xs font-bold text-gray-500 uppercase">Click to upload Main Document</p>
              </div>
              <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleMainFileUpload} disabled={uploadMutation.isPending} />
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Card Component ───────────────────────────────────────────────────────────

function AccreditationCard({ acc }: { acc: Accreditation }) {
  const qc = useQueryClient();
  const [showDetails, setShowDetails] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const kycMutation = useMutation({
    mutationFn: () => accreditationsApi.generateKycLink(acc.id),
    onSuccess: (res) => {
      const data = res.data;
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-2' : 'animate-out fade-out slide-out-to-top-2'} max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-white/10 overflow-hidden`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                  <LuMail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-gray-900 dark:text-white">KYC Request Sent</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Secure link delivered to <span className="font-bold text-gray-700 dark:text-gray-200">{data.email_sent_to || acc.contact_email}</span></p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors">
              Close
            </button>
          </div>
        </div>
      ), { duration: 5000 });
      setShowConfirm(false);
      qc.invalidateQueries({ queryKey: ['accreditations'] });
    },
    onError: () => {
      toast.error('Failed to generate KYC link');
    }
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, type, file }: { id: number, type: string, file: File }) => 
      accreditationsApi.uploadDocument(id, type, file),
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      qc.invalidateQueries({ queryKey: ['accreditations'] });
    },
    onError: () => {
      toast.error('Failed to upload document');
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ 
        id: acc.id, 
        type: docType.toLowerCase(), 
        file 
      });
    }
  };

  return (
    <>
    <div 
      className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col gap-6 cursor-pointer"
      onClick={() => setShowDetails(true)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            {ENTITY_ICONS[acc.entity_type] ?? <LuShieldCheck size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{acc.entity_name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{acc.entity_type} • {acc.accreditation_type}</p>
          </div>
        </div>
        <StatusBadge status={acc.status} />
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <LuMail size={12} className="text-gray-400" />
          {acc.contact_person} ({acc.contact_email})
        </div>
        {acc.expiry_date && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <LuClock size={12} className="text-gray-400" />
            Expires: {new Date(acc.expiry_date).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex-1 grid grid-cols-3 gap-2" onClick={e => e.stopPropagation()}>
          {['NDA', 'Terms', 'KYC'].map(doc => {
            const hasDoc = acc[`${doc.toLowerCase()}_document_url` as keyof Accreditation];
            
            if (hasDoc) {
              return (
                <div key={doc} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <LuFileText size={12} />
                  {doc}
                </div>
              );
            }
            
            return (
              <label key={doc} className="cursor-pointer flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold border bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600 transition group relative" title={`Upload ${doc}`}>
                {uploadMutation.isPending ? <LuLoaderCircle size={12} className="animate-spin text-blue-500" /> : <LuCloudUpload size={12} className="group-hover:text-blue-500 transition-colors" />}
                <span className="group-hover:text-blue-600">{doc}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileUpload(e, doc)} disabled={uploadMutation.isPending} />
              </label>
            );
          })}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          disabled={kycMutation.isPending}
          className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition tooltip-trigger"
          title="Send KYC Link"
        >
          {kycMutation.isPending ? <LuLoaderCircle size={16} className="animate-spin" /> : <LuLink size={16} />}
        </button>
      </div>
    </div>
    
    {showConfirm && (
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Verification Required" size="sm">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-2 border border-blue-100 dark:border-blue-800">
            <LuMail size={28} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Send KYC Request</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to send a secure KYC upload link to <strong>{acc.contact_person}</strong> at <strong className="text-gray-700 dark:text-gray-300">{acc.contact_email}</strong>?
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-3">
            <button 
              onClick={() => setShowConfirm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => kycMutation.mutate()}
              disabled={kycMutation.isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {kycMutation.isPending ? <LuLoaderCircle size={16} className="animate-spin" /> : <LuLink size={16} />}
              Yes, Send Link
            </button>
          </div>
        </div>
      </Modal>
    )}

    {showDetails && <AccreditationDetailsModal acc={acc} onClose={() => setShowDetails(false)} />}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Accreditations() {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pendingUploads, setPendingUploads] = useState<any[] | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'assets' | 'partners'>('all');
  const qc = useQueryClient();

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accreditations');
    const dataSheet = workbook.addWorksheet('Data', { state: 'hidden' });

    dataSheet.getColumn(1).values = ['ENTITY TYPE', 'supplier', 'partner', 'client', 'driver', 'bus'];

    const headerRow = worksheet.getRow(1);
    headerRow.values = ['Entity Type', 'Entity Name', 'Accreditation Type', 'Contact Person', 'Contact Email', 'KYC Doc URL', 'NDA Doc URL', 'Terms Doc URL'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    worksheet.columns = [
      { key: 'entity_type', width: 20 },
      { key: 'entity_name', width: 30 },
      { key: 'accreditation_type', width: 25 },
      { key: 'contact_person', width: 25 },
      { key: 'contact_email', width: 30 },
      { key: 'kyc_document_url', width: 20 },
      { key: 'nda_document_url', width: 20 },
      { key: 'terms_document_url', width: 20 },
    ];

    for (let i = 2; i <= 500; i++) {
      worksheet.getCell(`A${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Data!$A$2:$A$6`],
        showErrorMessage: true,
        errorTitle: 'Invalid Type',
        error: 'Please select an entity type from the dropdown menu.'
      };
    }

    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.mergeCells('A1:B1');
    const brandCell = helpSheet.getCell('A1');
    brandCell.value = 'JVD INTERNAL MANAGEMENT SYSTEM';
    brandCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF1E293B' } };
    brandCell.alignment = { horizontal: 'center' };

    helpSheet.addRow(['BULK ACCREDITATION REGISTRATION GUIDE']);
    helpSheet.getRow(2).font = { bold: true, size: 12, color: { argb: 'FF3B82F6' } };
    helpSheet.addRow(['']);
    helpSheet.addRow(['1. Fill in the "Accreditations" sheet starting from row 2.']);
    helpSheet.addRow(['2. Do not modify or delete the header row (Row 1).']);
    helpSheet.addRow(['3. Use the dropdown menus for Entity Type.']);
    
    helpSheet.getColumn(1).width = 40;
    helpSheet.getColumn(2).width = 60;

    worksheet.addRow(['supplier', 'ABC Corporation', 'Supplier Verification', 'John Doe', 'contact@domain.com']);

    workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'JVD_Accreditations_Bulk_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Branded template with dropdowns downloaded!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    try {
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      const accToUpload: any[] = [];
      const errors_list: string[] = [];

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const entity_type = row.getCell(1).text?.trim();
        const entity_name = row.getCell(2).text?.trim();
        const accreditation_type = row.getCell(3).text?.trim();
        const contact_person = row.getCell(4).text?.trim();
        const contact_email = row.getCell(5).text?.trim();
        const kyc_document_url = row.getCell(6).text?.trim();
        const nda_document_url = row.getCell(7).text?.trim();
        const terms_document_url = row.getCell(8).text?.trim();

        if (!entity_name && !contact_email) return;

        if (!entity_type || !entity_name || !contact_email || !accreditation_type) {
          errors_list.push(`Row ${rowNumber}: Incomplete data (Type, Name, Acc. Type, Email are required).`);
          return;
        }

        accToUpload.push({
          entity_type,
          entity_name,
          accreditation_type,
          contact_person,
          contact_email,
          kyc_document_url,
          nda_document_url,
          terms_document_url
        });
      });

      if (errors_list.length > 0) {
        const displayErrors = errors_list.slice(0, 3);
        const remaining = errors_list.length - 3;
        displayErrors.forEach(err => toast.error(err, { duration: 4000 }));
        if (remaining > 0) toast.error(`...and ${remaining} more errors found.`, { duration: 5000 });
        e.target.value = '';
        return;
      }

      if (accToUpload.length === 0) {
        toast.error('No data found in the Excel file.');
        e.target.value = '';
        return;
      }

      setPendingUploads(accToUpload);
      setIsPreviewModalOpen(true);
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to parse Excel file. Please use the provided template.');
      console.error(err);
      e.target.value = '';
    }
  };

  const createAccMutation = useMutation({
    mutationFn: (data: any) => accreditationsApi.create(data as Partial<Accreditation>),
  });

  const handleBulkUploadConfirm = async () => {
    if (!pendingUploads || pendingUploads.length === 0) return;

    const accToUpload = [...pendingUploads];
    setPendingUploads(null);
    setIsPreviewModalOpen(false);

    const uploadToast = toast.loading(`Registering ${accToUpload.length} accreditations...`);
    let successCount = 0;
    
    for (const acc of accToUpload) {
      try {
        const { kyc_file, nda_file, terms_file, ...dataToSubmit } = acc;
        ['kyc_document_url', 'nda_document_url', 'terms_document_url'].forEach(k => {
            if (dataToSubmit[k] === 'attached') delete dataToSubmit[k];
        });
        
        const res = await createAccMutation.mutateAsync(dataToSubmit);
        const accId = res.data?.data?.id || (res.data as any)?.id;

        if (accId) {
           if (kyc_file) await accreditationsApi.uploadDocument(accId, 'kyc', kyc_file);
           if (nda_file) await accreditationsApi.uploadDocument(accId, 'nda', nda_file);
           if (terms_file) await accreditationsApi.uploadDocument(accId, 'terms', terms_file);
        }
        successCount++;
      } catch (err: any) {
        console.error(`Upload error for ${acc.entity_name}:`, err);
      }
    }

    toast.dismiss(uploadToast);
    qc.invalidateQueries({ queryKey: ['accreditations'] });
    if (successCount === accToUpload.length) {
      toast.success(`Successfully registered ${successCount} accreditations!`);
    } else {
      toast.success(`Completed with partial success: ${successCount}/${accToUpload.length} registered.`);
    }
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['accreditations', search, page, activeTab],
    queryFn: () => accreditationsApi.list({ 
      search: search || undefined,
      entity_types: activeTab === 'assets' ? 'bus,driver' : activeTab === 'partners' ? 'supplier,partner,client' : undefined,
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
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'assets', label: 'Fleet & Assets' },
            { id: 'partners', label: 'Partnerships & Suppliers' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md w-full sm:w-96">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search accreditations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-gray-800 placeholder:text-gray-400 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
            <LuCloudUpload className="w-4 h-4" /> Bulk Import
            <input type="file" multiple className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} ref={fileInputRef} />
          </label>
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm">
            <LuDownload className="w-4 h-4" /> Export Data
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LuLoaderCircle size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading accreditations...</p>
        </div>
      ) : accreditations.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 border-dashed flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
            <LuShieldCheck size={28} />
          </div>
          <h3 className="text-gray-900 dark:text-white font-bold mb-1">No accreditations found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">You haven't added any accreditations or no records match your search criteria.</p>
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

      {/* Preview Modal for Bulk Upload */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => { setIsPreviewModalOpen(false); setPendingUploads(null); }}
        title="Confirm Bulk Upload & Documents"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You are about to register <strong>{pendingUploads?.length}</strong> accreditations. You can attach KYC, NDA, and Terms documents for each entity before confirming.
          </p>
          <div className="max-h-[60vh] overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <ul className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
              {pendingUploads?.slice(0, 15).map((acc, i) => (
                <li key={i} className="flex flex-col border-b border-gray-200 dark:border-gray-800 pb-4 last:border-0 last:pb-0 gap-3">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-bold">{acc.entity_name}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">{acc.accreditation_type}</span>
                    </div>
                    <span className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-lg uppercase font-bold">{acc.entity_type}</span>
                  </div>
                  <div className="flex gap-2">
                    {['kyc', 'nda', 'terms'].map(doc => (
                       <div key={doc} className="flex-1">
                        {acc[`${doc}_document_url`] ? (
                          <span className="flex items-center justify-center gap-1 w-full text-center text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 py-1.5 rounded-lg uppercase">
                            <LuFileText size={12} /> {doc} Attached
                          </span>
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center gap-1 w-full text-center text-[10px] bg-white text-blue-600 py-1.5 rounded-lg hover:bg-blue-50 transition font-bold border border-blue-200 uppercase shadow-sm">
                            <LuCloudUpload size={12} /> {doc}
                            <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && pendingUploads) {
                                const newUploads = [...pendingUploads];
                                newUploads[i][`${doc}_file`] = file;
                                newUploads[i][`${doc}_document_url`] = 'attached';
                                setPendingUploads(newUploads);
                                toast.success(`Attached ${file.name} as ${doc.toUpperCase()}`);
                              }
                            }} />
                          </label>
                        )}
                       </div>
                    ))}
                  </div>
                </li>
              ))}
              {pendingUploads && pendingUploads.length > 15 && (
                <li className="text-center text-gray-400 text-xs italic pt-2">...and {pendingUploads.length - 15} more</li>
              )}
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => { setIsPreviewModalOpen(false); setPendingUploads(null); }}>
              Cancel
            </Button>
            <Button onClick={handleBulkUploadConfirm}>
              Confirm Upload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

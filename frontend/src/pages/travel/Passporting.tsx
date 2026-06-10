import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuStamp, LuPlus, LuSearch, LuLoaderCircle,
  LuCircleCheck, LuCircle, LuChevronRight, LuTrash,
  LuUpload, LuFileText, LuEye,
} from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { Pagination, Modal, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PassportCase {
  id: number;
  reference_number?: string;
  case_type: 'passport' | 'visa';
  status: string;
  checklist: Record<string, boolean>;
  submitted_date?: string;
  release_date?: string;
  customer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  passenger?: {
    id: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    birth_date?: string;
    contact_no?: string;
  };
  handler?: { id: number; first_name?: string; last_name?: string; full_name?: string };
}

const calculateAge = (dobString: string) => {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} years old` : '';
};

const STATUS_FLOW = [
  'requirements_gathering',
  'documents_complete',
  'submitted_for_processing',
  'processing',
  'ready_for_release',
  'released',
];

const STATUS_LABELS: Record<string, string> = {
  requirements_gathering: 'Requirements',
  documents_complete: 'Docs Complete',
  submitted_for_processing: 'Submitted',
  processing: 'Processing',
  ready_for_release: 'Ready',
  released: 'Released',
  denied: 'Denied',
};

const STATUS_COLORS: Record<string, string> = {
  requirements_gathering: 'bg-amber-50 text-amber-700 border-amber-200',
  documents_complete: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted_for_processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  ready_for_release: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  released: 'bg-gray-50 text-gray-600 border-gray-200',
  denied: 'bg-red-50 text-red-700 border-red-200',
};

const PASSPORT_CHECKLIST = [
  'Birth Certificate (PSA)',
  'Valid Government ID',
  'Accomplished DFA Form',
  'Passport Photo',
  'Payment Receipt',
];

const VISA_CHECKLIST = [
  'Valid Passport',
  'Visa Application Form',
  'Proof of Accommodation',
  'Flight Itinerary',
  'Bank Statement (3 months)',
  'Travel Insurance',
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  requirements_gathering: ['documents_complete'],
  documents_complete: ['submitted_for_processing', 'requirements_gathering'],
  submitted_for_processing: ['processing'],
  processing: ['denied', 'ready_for_release'],
  ready_for_release: ['released'],
  denied: ['requirements_gathering'],
};

// ── New Case Modal ─────────────────────────────────────────────────────────────
function NewCaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');

  const mutation = useMutation({
    mutationFn: () => passportingApi.create({
      first_name: firstName.trim(),
      middle_name: middleName.trim() || undefined,
      last_name: lastName.trim(),
      suffix: suffix.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      birth_date: birthDate || undefined,
      case_type: 'passport',
    }),
    onSuccess: () => {
      toast.success('Passport case opened successfully!');
      qc.invalidateQueries({ queryKey: ['passport_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to open case.'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Open New Passport Case" size="sm">
      <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-2">
        <div className="space-y-5">
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Customer Details</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={e => setMiddleName(e.target.value)}
                    placeholder="Fitzgerald"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Suffix (optional)</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={e => setSuffix(e.target.value)}
                    placeholder="Jr."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contact Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="09171234567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Birthdate</label>
                    {birthDate && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {calculateAge(birthDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Complete Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="123 Street, Manila"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-100/30 dark:border-blue-900/30">
                <span className="shrink-0 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Passport: Filipino (PH)</span>
              </div>
            </div>
          </details>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!firstName.trim() || !lastName.trim()}>
              Open Passport Case
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Case Detail Modal ──────────────────────────────────────────────────────────
function CaseDetailModal({ caseData, onClose }: { caseData: PassportCase; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  const isHandler = user?.id === caseData.handler?.id;
  const isAdmin = user?.role ? ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user.role) : false;
  const readOnly = !isHandler && !isAdmin;

  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'history'>('details');

  const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>(
    caseData.checklist ?? {}
  );
  const checklistItems = caseData.case_type === 'passport' ? PASSPORT_CHECKLIST : VISA_CHECKLIST;
  const allowedNext = STATUS_TRANSITIONS[caseData.status] ?? [];

  // Document upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadingChecklistItem, setUploadingChecklistItem] = useState<string | null>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const completedCount = checklistItems.filter(i => localChecklist[i]).length;

  const statusMutation = useMutation({
    mutationFn: (status: string) => passportingApi.updateStatus(caseData.id, status),
    onSuccess: () => {
      toast.success('Status updated!');
      qc.invalidateQueries({ queryKey: ['passport_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to update status.'),
  });

  const checklistMutation = useMutation({
    mutationFn: (cl: Record<string, boolean>) => passportingApi.updateChecklist(caseData.id, cl),
    onSuccess: () => {
      toast.success('Checklist saved!');
      qc.invalidateQueries({ queryKey: ['passport_cases'] });
    },
    onError: () => toast.error('Failed to save checklist.'),
  });

  const toggleItem = (item: string) => {
    if (readOnly) return;
    const updated = { ...localChecklist, [item]: !localChecklist[item] };
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
  };

  const { data: auditLogsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['passport_case_audit', caseData.id],
    queryFn: () => passportingApi.getAuditLogs(caseData.id),
    enabled: activeTab === 'history'
  });
  const logs = auditLogsRes?.data?.data ?? [];

  const { data: docsRes, refetch: refetchDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['passport_case_documents', caseData.id],
    queryFn: () => passportingApi.getDocuments(caseData.id).then(r => r.data),
    enabled: true,
  });
  const documents = docsRes?.data ?? [];

  const handleUpload = async () => {
    if (!fileToUpload || !uploadTitle.trim()) {
      toast.error('Please select a file and enter a title.');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadTitle.trim());
      formData.append('file', fileToUpload);

      await passportingApi.uploadDocument(caseData.id, formData);
      toast.success('Document uploaded successfully.');

      // Automatically check and save checklist item
      const matchedItem = checklistItems.find(i => i.toLowerCase() === uploadTitle.trim().toLowerCase());
      if (matchedItem) {
        const updated = { ...localChecklist, [matchedItem]: true };
        setLocalChecklist(updated);
        checklistMutation.mutate(updated);
      }

      setUploadTitle('');
      setSelectedTitle('');
      setFileToUpload(null);
      setFileInputKey(Date.now());
      refetchDocs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChecklistUploadClick = (item: string) => {
    setUploadingChecklistItem(item);
    setTimeout(() => {
      checklistFileInputRef.current?.click();
    }, 50);
  };

  const handleChecklistFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingChecklistItem) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadingChecklistItem);
      formData.append('file', file);

      await passportingApi.uploadDocument(caseData.id, formData);
      toast.success(`Document for "${uploadingChecklistItem}" uploaded successfully.`);

      // Automatically check and save checklist item
      const updated = { ...localChecklist, [uploadingChecklistItem]: true };
      setLocalChecklist(updated);
      checklistMutation.mutate(updated);

      refetchDocs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document.');
    } finally {
      setIsUploading(false);
      setUploadingChecklistItem(null);
      if (checklistFileInputRef.current) {
        checklistFileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const docToDelete = documents.find((d: any) => d.id === docId);

      await passportingApi.deleteDocument(caseData.id, docId);
      toast.success('Document deleted successfully.');

      if (docToDelete) {
        const matchedItem = checklistItems.find(i => i.toLowerCase() === docToDelete.title.trim().toLowerCase());
        if (matchedItem) {
          const updated = { ...localChecklist, [matchedItem]: false };
          setLocalChecklist(updated);
          checklistMutation.mutate(updated);
        }
      }

      refetchDocs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document.');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Case #${caseData.id} — ${caseData.case_type === 'passport' ? 'Passport' : 'Visa'}`} size="lg">
      <div className="overflow-y-auto custom-scrollbar max-h-[75vh]">
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 pt-2 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            History
          </button>
        </div>

        {activeTab === 'details' && (
          <div className="p-2 space-y-5 mt-4">
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span>Case Overview</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1">
                {/* Info row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {caseData.customer?.full_name || (caseData.customer?.first_name ? `${caseData.customer.first_name} ${caseData.customer.last_name}` : '—')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[caseData.status]}`}>
                      {STATUS_LABELS[caseData.status] ?? caseData.status}
                    </span>
                  </div>
                  {caseData.reference_number && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reference No.</p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{caseData.reference_number}</p>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Handler</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {caseData.handler ? (caseData.handler.full_name || `${caseData.handler.first_name} ${caseData.handler.last_name}`) : '—'}
                    </p>
                  </div>
                  {caseData.customer?.email && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{caseData.customer.email}</p>
                    </div>
                  )}
                  {(caseData.passenger?.contact_no || caseData.customer?.phone) && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Number</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{caseData.passenger?.contact_no || caseData.customer?.phone}</p>
                    </div>
                  )}
                  {caseData.passenger?.birth_date && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Birthdate & Age</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(caseData.passenger.birth_date).toLocaleDateString()} ({calculateAge(caseData.passenger.birth_date)})
                      </p>
                    </div>
                  )}
                  {caseData.customer?.address && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Complete Address</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{caseData.customer.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </details>

            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span>Progress & Requirements</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-6">
                {/* Progress */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Processing Progress</p>
                  <div className="flex items-center gap-1">
                    {STATUS_FLOW.map((s, i) => {
                      const idx = STATUS_FLOW.indexOf(caseData.status);
                      const done = i < idx;
                      const active = i === idx;
                      return (
                        <div key={s} className="flex items-center flex-1 gap-1">
                          <div className={`h-2 flex-1 rounded-full transition-all ${done || active ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`} />
                          {i < STATUS_FLOW.length - 1 && <LuChevronRight size={10} className="text-gray-300 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{STATUS_LABELS[STATUS_FLOW[0]]}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.length - 1]]}</span>
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Document Checklist</p>
                    <span className="text-[10px] font-bold text-blue-600">{completedCount}/{checklistItems.length} Complete</span>
                  </div>
                  <div className="space-y-2">
                    {checklistItems.map(item => {
                      const matchingDoc = documents.find((d: any) => d.title.trim().toLowerCase() === item.trim().toLowerCase());
                      return (
                        <div
                          key={item}
                          className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 transition ${readOnly ? 'opacity-75 cursor-default' : ''}`}
                        >
                          <button
                            onClick={() => toggleItem(item)}
                            disabled={readOnly}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            {localChecklist[item]
                              ? <LuCircleCheck size={18} className="text-emerald-500 shrink-0" />
                              : <LuCircle size={18} className="text-gray-300 shrink-0" />
                            }
                            <span className={`text-sm font-medium ${localChecklist[item] ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                              {item}
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            {matchingDoc ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${matchingDoc.file_path}`);
                                    setPreviewTitle(matchingDoc.title);
                                  }}
                                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  title="Preview Document"
                                >
                                  <LuEye size={13} />
                                  <span className="text-[10px] hidden sm:inline">Preview</span>
                                </button>
                                <a
                                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${matchingDoc.file_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  title="Download Document"
                                >
                                  <LuFileText size={13} />
                                  <span className="text-[10px] hidden sm:inline">Download</span>
                                </a>
                                {!readOnly && (
                                  <button
                                    onClick={() => handleDeleteDoc(matchingDoc.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                                    title="Delete Document"
                                  >
                                    <LuTrash size={14} />
                                  </button>
                                )}
                              </>
                            ) : (
                              !readOnly && (
                                <button
                                  onClick={() => handleChecklistUploadClick(item)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  title="Upload Document"
                                >
                                  <LuUpload size={13} />
                                  <span className="text-[10px] hidden sm:inline">Upload</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Hidden checklist file uploader */}
                  <input
                    type="file"
                    ref={checklistFileInputRef}
                    onChange={handleChecklistFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </details>

            {/* Status transitions */}
            {!readOnly && allowedNext.length > 0 && (
              <details className="group" open>
                <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span>Actions</span>
                  <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
                </summary>
                <div className="pt-4 px-1">
                  <div className="flex flex-wrap gap-2">
                    {allowedNext.map(next => (
                      <Button
                        key={next}
                        onClick={() => statusMutation.mutate(next)}
                        isLoading={statusMutation.isPending}
                        size="sm"
                        className="capitalize"
                      >
                        → {STATUS_LABELS[next] ?? next}
                      </Button>
                    ))}
                  </div>
                </div>
              </details>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="p-4 space-y-6">
            {/* Upload form */}
            {!readOnly && (
              <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-750 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Upload New Document</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Document Title *</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedTitle}
                        onChange={e => {
                          setSelectedTitle(e.target.value);
                          if (e.target.value !== 'custom') {
                            setUploadTitle(e.target.value);
                          } else {
                            setUploadTitle('');
                          }
                        }}
                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
                      >
                        <option value="">-- Select Title --</option>
                        {checklistItems.map(i => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                        <option value="custom">Custom Title...</option>
                      </select>
                      {(selectedTitle === 'custom' || selectedTitle === '') && (
                        <input
                          type="text"
                          placeholder="e.g. Custom scan"
                          value={uploadTitle}
                          onChange={e => setUploadTitle(e.target.value)}
                          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">File *</label>
                    <input
                      key={fileInputKey}
                      type="file"
                      onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleUpload}
                    isLoading={isUploading}
                    disabled={!fileToUpload || !uploadTitle.trim()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 shadow-md"
                  >
                    Upload Document
                  </Button>
                </div>
              </div>
            )}

            {/* Documents list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Uploaded Files</h4>
              {docsLoading ? (
                <div className="flex justify-center py-8"><LuLoaderCircle className="animate-spin text-gray-400" size={24} /></div>
              ) : documents.length === 0 ? (
                <p className="text-xs text-gray-450 italic text-center py-6 bg-gray-50 dark:bg-gray-800/30 rounded-xl">No documents uploaded for this case.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-750">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{doc.title}</p>
                        <p className="text-[10px] text-gray-400">
                          Uploaded by {doc.uploader?.first_name || 'System'} on {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${doc.file_path}`);
                            setPreviewTitle(doc.title);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <LuEye size={13} />
                          Preview
                        </button>
                        <a
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${doc.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-lg text-xs font-bold transition"
                        >
                          Download
                        </a>
                        {!readOnly && (
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                            title="Delete Document"
                          >
                            <LuTrash size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            {logsLoading ? (
              <div className="text-sm text-gray-500 py-4 text-center">Loading history...</div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center">No history available.</div>
            ) : (
              <div className="space-y-4">
                {logs.map((log: any) => (
                  <div key={log.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                        {log.action.replace('_', ' ')}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      By: {log.user?.first_name} {log.user?.last_name}
                    </p>
                    {log.old_values && log.new_values && log.action === 'update_status' && (
                      <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <span className="text-gray-500">Status changed from </span>
                        <span className="font-bold">{log.old_values.status}</span>
                        <span className="text-gray-500"> to </span>
                        <span className="font-bold">{log.new_values.status}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Document Preview */}
      {previewUrl && (
        <Modal isOpen onClose={() => setPreviewUrl(null)} title={previewTitle} size="lg">
          <div className="bg-gray-950 p-4 rounded-2xl flex items-center justify-center overflow-auto h-[60vh] border border-gray-850">
            {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full rounded-xl border border-gray-800"
                title="Document Preview"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Document Preview"
                className="max-w-full max-h-full object-contain rounded-xl border border-gray-800 shadow-lg"
              />
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Passporting() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<PassportCase | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['passport_cases', search, page],
    queryFn: () => passportingApi.list({
      search: search || undefined,
      case_type: 'passport',
      page,
      per_page: 20,
    }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const cases: PassportCase[] = response?.data?.data ?? [];
  const meta = response?.data?.meta;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Cases
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Passport Processing</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="flex items-center gap-2">
          <LuPlus size={16} /> Open Passport Case
        </Button>
      </div>

      {/* Search & Search Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by customer or reference..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      {/* List View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <LuLoaderCircle size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading cases...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 border-dashed flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-4">
            <LuStamp size={28} />
          </div>
          <h3 className="text-gray-900 dark:text-white font-bold mb-1">No cases found</h3>
          <p className="text-sm text-gray-500 max-w-sm">Open a new passport or visa case to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden relative">
          {isPlaceholderData && (
            <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
              <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/60 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest text-[10px]">
                  <th className="px-8 py-5">Case ID</th>
                  <th className="px-8 py-5">Customer</th>
                  <th className="px-8 py-5">Type</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Checklist</th>
                  <th className="px-8 py-5">Submitted Date</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-gray-50 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
                {cases.map((c) => {
                  const checklistItems = c.case_type === 'passport' ? PASSPORT_CHECKLIST : VISA_CHECKLIST;
                  const done = checklistItems.filter(i => c.checklist?.[i]).length;
                  const pct = Math.round((done / checklistItems.length) * 100);

                  return (
                    <tr key={c.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group cursor-pointer" onClick={() => setSelected(c)}>
                      <td className="px-8 py-5">
                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">#{c.id}</span>
                        {c.reference_number && <div className="text-[10px] text-gray-400 uppercase mt-0.5">{c.reference_number}</div>}
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-white">
                        {c.customer?.full_name || (c.customer?.first_name ? `${c.customer.first_name} ${c.customer.last_name}` : '—')}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                          c.case_type === 'passport' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-violet-50 text-violet-600 border-violet-200'
                        }`}>
                          {c.case_type}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[c.status] ?? STATUS_COLORS['released']}`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-500 w-8">{done}/{checklistItems.length}</span>
                          <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-medium text-gray-500">
                        {c.submitted_date ? new Date(c.submitted_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"
                          title="View Detail"
                        >
                          <LuChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <Pagination currentPage={page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onPageChange={setPage} />
      )}

      {showNew && <NewCaseModal onClose={() => setShowNew(false)} />}
      {selected && <CaseDetailModal caseData={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

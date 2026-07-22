import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuCircleCheck, LuCircle, LuChevronRight, LuTrash,
  LuUpload, LuFileText, LuEye, LuTriangleAlert,
  LuMail, LuLoaderCircle,
} from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { Modal, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getStorageUrl } from '../../utils';
import {
  type PassportCase,
  PASSPORT_CHECKLIST,
  VISA_CHECKLIST,
  STATUS_FLOW,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_TRANSITIONS,
  calculateAge,
} from './passporting.constants';
import RequestPassportDocsModal from './RequestPassportDocsModal';

// ── Case Detail Modal ──────────────────────────────────────────────────────────
export default function PassportCaseDetailModal({ caseData, onClose }: { caseData: PassportCase; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const isHandler = user?.id === caseData.handler?.id;
  const isAdmin = user?.role ? ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user.role) : false;
  const readOnly = !isHandler && !isAdmin;

  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'history'>('details');
  const [showRequestModal, setShowRequestModal] = useState(false);

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
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadingChecklistItem, setUploadingChecklistItem] = useState<string | null>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

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
      setFileInputKey(k => k + 1);
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
                    <div className="flex items-center gap-3">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => setShowRequestModal(true)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 border border-blue-100/80 dark:border-blue-900/30 shadow-sm"
                          title="Request customer documents online"
                        >
                          <LuMail size={12} />
                          Request Online
                        </button>
                      )}
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{completedCount}/{checklistItems.length} Complete</span>
                    </div>
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
                                    setPreviewUrl(getStorageUrl(matchingDoc.file_path));
                                    setPreviewTitle(matchingDoc.title);
                                    setImgLoading(true);
                                    setImgError(false);
                                  }}
                                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  title="Preview Document"
                                >
                                  <LuEye size={13} />
                                  <span className="text-[10px] hidden sm:inline">Preview</span>
                                </button>
                                <a
                                  href={getStorageUrl(matchingDoc.file_path)}
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
                            setPreviewUrl(getStorageUrl(doc.file_path));
                            setPreviewTitle(doc.title);
                            setImgLoading(true);
                            setImgError(false);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <LuEye size={13} />
                          Preview
                        </button>
                        <a
                          href={getStorageUrl(doc.file_path)}
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
          <div className="bg-gray-950 p-4 rounded-2xl flex items-center justify-center overflow-auto h-[60vh] border border-gray-850 relative">
            {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full rounded-xl border border-gray-800 bg-white"
                title="Document Preview"
              />
            ) : (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                {imgLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-950/40 z-10">
                    <LuLoaderCircle className="animate-spin text-violet-500" size={32} />
                  </div>
                )}
                {imgError ? (
                  <div className="text-center p-6 space-y-3 text-gray-400">
                    <LuTriangleAlert className="text-red-500 mx-auto" size={36} />
                    <p className="text-sm font-bold">Failed to load image preview</p>
                    <p className="text-xs">The image file could not be read or does not exist.</p>
                  </div>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgLoading(false);
                      setImgError(true);
                    }}
                    className={`max-w-full max-h-[50vh] object-contain rounded-xl border border-gray-800 shadow-lg ${
                      imgLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'
                    }`}
                  />
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {showRequestModal && (
        <RequestPassportDocsModal
          pc={caseData}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['passport_cases'] });
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

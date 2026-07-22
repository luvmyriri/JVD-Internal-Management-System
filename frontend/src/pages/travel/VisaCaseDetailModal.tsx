import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuChevronRight, LuCircleCheck, LuCircle, LuTrash,
  LuUpload, LuFileText, LuEye, LuMail, LuPlus,
  LuLoaderCircle, LuTriangleAlert,
} from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { Modal, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getStorageUrl } from '../../utils';
import {
  type VisaCase,
  STATUS_FLOW,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_TRANSITIONS,
  VISA_CHECKLIST,
  COUNTRY_SPECIFIC_CHECKLISTS,
  VISA_TYPE_EXTRAS,
  COUNTRIES,
  calculateAge,
} from './visaProcessing.constants';
import RequestDocsModal from './RequestDocsModal';

// ── Case Detail Modal ──────────────────────────────────────────────────────────
export default function VisaCaseDetailModal({ vc, onClose }: { vc: VisaCase; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const isHandler = user?.id === vc.handler?.id;
  const isAdmin = user?.role ? ['super_admin', 'executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user.role) : false;
  const readOnly = !isHandler && !isAdmin;

  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'history'>('details');
  const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>(vc.checklist ?? {});
  const [newRequirement, setNewRequirement] = useState('');
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

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

  const allowedNext = STATUS_TRANSITIONS[vc.status] ?? [];
  const items = Object.keys(localChecklist);
  const done = items.filter(i => localChecklist[i]).length;

  const { data: auditLogsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['visa_case_audit', vc.id],
    queryFn: () => passportingApi.getAuditLogs(vc.id),
    enabled: activeTab === 'history'
  });
  const logs = auditLogsRes?.data?.data ?? [];

  const { data: docsRes, refetch: refetchDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['passport_case_documents', vc.id],
    queryFn: () => passportingApi.getDocuments(vc.id).then(r => r.data),
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

      await passportingApi.uploadDocument(vc.id, formData);
      toast.success('Document uploaded successfully.');

      // Automatically check and save checklist item
      const matchedItem = items.find(i => i.toLowerCase() === uploadTitle.trim().toLowerCase());
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

      await passportingApi.uploadDocument(vc.id, formData);
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

      await passportingApi.deleteDocument(vc.id, docId);
      toast.success('Document deleted successfully.');

      if (docToDelete) {
        const matchedItem = items.find(i => i.toLowerCase() === docToDelete.title.trim().toLowerCase());
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

  const statusMutation = useMutation({
    mutationFn: (status: string) => passportingApi.updateStatus(vc.id, status),
    onSuccess: () => {
      toast.success('Status updated!');
      qc.invalidateQueries({ queryKey: ['visa_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to update status.'),
  });

  const checklistMutation = useMutation({
    mutationFn: (cl: Record<string, boolean>) => passportingApi.updateChecklist(vc.id, cl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visa_cases'] });
    },
    onError: () => toast.error('Failed to save checklist.'),
  });

  useEffect(() => {
    if (vc.case_type === 'visa' && vc.destination_country && Object.keys(localChecklist).length === 0) {
      setLoadingRequirements(true);
      passportingApi.getVisaRequirements(vc.destination_country)
        .then(res => {
          const apiData = res.data?.data?.data;
          const generatedChecklist: Record<string, boolean> = {};

          const specificChecklist = COUNTRY_SPECIFIC_CHECKLISTS[vc.destination_country || ''];
          const itemsToUse = specificChecklist || VISA_CHECKLIST;

          if (apiData) {
            const validity = apiData.destination?.passport_validity || '';
            const reg = apiData.mandatory_registration;

            itemsToUse.forEach(item => {
              generatedChecklist[item] = false;
            });

            if (reg && reg.name) {
              generatedChecklist[`Complete ${reg.name} Registration`] = false;
            }

            if (validity) {
              generatedChecklist[`Passport valid for at least ${validity}`] = false;
            }
          } else {
            itemsToUse.forEach(item => {
              generatedChecklist[item] = false;
            });
          }

          // Add visa type specific requirements
          if (vc.visa_type) {
            const extras = VISA_TYPE_EXTRAS[vc.visa_type] || [];
            extras.forEach(item => {
              generatedChecklist[item] = false;
            });
          }

          setLocalChecklist(generatedChecklist);
          checklistMutation.mutate(generatedChecklist);
        })
        .catch(err => {
          console.warn('Failed to load API visa requirements (fallback used):', err);
          const generatedChecklist: Record<string, boolean> = {};

          const specificChecklist = COUNTRY_SPECIFIC_CHECKLISTS[vc.destination_country || ''];
          const itemsToUse = specificChecklist || VISA_CHECKLIST;

          itemsToUse.forEach(item => {
            generatedChecklist[item] = false;
          });

          // Add visa type specific requirements
          if (vc.visa_type) {
            const extras = VISA_TYPE_EXTRAS[vc.visa_type] || [];
            extras.forEach(item => {
              generatedChecklist[item] = false;
            });
          }

          setLocalChecklist(generatedChecklist);
          checklistMutation.mutate(generatedChecklist);
        })
        .finally(() => {
          setLoadingRequirements(false);
        });
    }
  }, [vc]);

  const toggleItem = (item: string) => {
    if (readOnly) return;
    const updated = { ...localChecklist, [item]: !localChecklist[item] };
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
  };

  const handleAddRequirement = () => {
    if (readOnly || !newRequirement.trim()) return;
    const item = newRequirement.trim();
    if (localChecklist[item] !== undefined) {
      toast.error('Requirement already exists.');
      return;
    }
    const updated = { ...localChecklist, [item]: false };
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
    setNewRequirement('');
  };

  const handleRemoveRequirement = (item: string) => {
    if (readOnly) return;
    const updated = { ...localChecklist };
    delete updated[item];
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Visa Case #${vc.id}`} size="lg" noPadding>
      {/* Tabs — fixed, outside scroll area */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 pt-2 bg-white dark:bg-gray-900 shrink-0">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          History
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
        {activeTab === 'details' && (
          <div className="p-2 space-y-5 mt-4">
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span>Case Overview</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {vc.customer?.full_name || (vc.customer?.first_name ? `${vc.customer.first_name} ${vc.customer.last_name}` : '—')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[vc.status]}`}>
                      {STATUS_LABELS[vc.status]}
                    </span>
                  </div>
                  {vc.destination_country && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Destination</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white font-sans uppercase">
                        {COUNTRIES.find(c => c.code === vc.destination_country)?.name || vc.destination_country} ({vc.destination_country})
                      </p>
                    </div>
                  )}
                  {vc.visa_type && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Visa Type</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{vc.visa_type}</p>
                    </div>
                  )}
                  {vc.handler && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Handler</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{vc.handler.full_name || `${vc.handler.first_name} ${vc.handler.last_name}`}</p>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reference No.</p>
                    <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                      {vc.reference_number || <span className="text-gray-400 font-normal italic text-xs">Not yet assigned</span>}
                    </p>
                  </div>
                  {vc.customer?.email && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{vc.customer.email}</p>
                    </div>
                  )}
                  {(vc.passenger?.contact_no || vc.customer?.phone) && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Number</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{vc.passenger?.contact_no || vc.customer?.phone}</p>
                    </div>
                  )}
                  {vc.passenger?.birth_date && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Birthdate & Age</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(vc.passenger.birth_date).toLocaleDateString()} ({calculateAge(vc.passenger.birth_date)})
                      </p>
                    </div>
                  )}
                  {vc.customer?.address && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Complete Address</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{vc.customer.address}</p>
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
                {/* Progress bar */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Processing Progress</p>
                  <div className="flex items-center gap-1">
                    {STATUS_FLOW.map((s, i) => {
                      const idx = STATUS_FLOW.indexOf(vc.status);
                      const done2 = i < idx;
                      return (
                        <div key={s} className="flex items-center flex-1 gap-1">
                          <div className={`h-2 flex-1 rounded-full transition-all ${done2 || i === idx ? 'bg-violet-500' : 'bg-gray-100 dark:bg-gray-700'}`} />
                          {i < STATUS_FLOW.length - 1 && <LuChevronRight size={10} className="text-gray-300 shrink-0" />}
                        </div>
                      );
                    })}
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
                          className="px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 dark:bg-violet-950/20 dark:hover:bg-violet-950/40 dark:text-violet-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 border border-violet-150 dark:border-violet-900/30 shadow-sm"
                          title="Request customer documents online"
                        >
                          <LuMail size={12} />
                          Request Online
                        </button>
                      )}
                      <span className="text-[10px] font-bold text-violet-600">{done}/{items.length} Complete</span>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Add custom requirement..."
                        value={newRequirement}
                        onChange={e => setNewRequirement(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                        onKeyDown={e => { if (e.key === 'Enter') handleAddRequirement(); }}
                      />
                      <button
                        onClick={handleAddRequirement}
                        disabled={!newRequirement.trim()}
                        className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 shadow-md shadow-violet-600/10"
                      >
                        <LuPlus size={14} /> Add Item
                      </button>
                    </div>
                  )}

                  {loadingRequirements ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">
                      <LuLoaderCircle size={20} className="animate-spin text-violet-600" />
                      <p className="text-xs text-gray-500 font-medium">Fetching Visa Requirements API...</p>
                    </div>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-gray-450 italic text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl">No checklist items defined.</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map(item => {
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
                                    className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-600 dark:bg-violet-950/20 dark:hover:bg-violet-950/40 dark:text-violet-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                    title="Upload Document"
                                  >
                                    <LuUpload size={13} />
                                    <span className="text-[10px] hidden sm:inline">Upload</span>
                                  </button>
                                )
                              )}
                              {!readOnly && (
                                <button
                                  onClick={() => handleRemoveRequirement(item)}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition"
                                  title="Remove requirement"
                                >
                                  <LuTrash size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

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

            {/* Advance status */}
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
                        className="bg-violet-600 hover:bg-violet-700 capitalize"
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
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Document Title *</label>
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
                        className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full"
                      >
                        <option value="">-- Select Title --</option>
                        {items.map(i => (
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
                          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">File *</label>
                    <input
                      key={fileInputKey}
                      type="file"
                      onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-violet-900/20 dark:file:text-violet-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleUpload}
                    isLoading={isUploading}
                    disabled={!fileToUpload || !uploadTitle.trim()}
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 shadow-md"
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
                          className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 dark:text-violet-400 rounded-lg text-xs font-bold transition"
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
          <div className="p-2 h-[400px]">
            {logsLoading ? (
            <div className="flex justify-center py-12"><LuLoaderCircle className="animate-spin text-gray-400" size={24} /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No history found for this case.</div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-700 before:to-transparent">
              {logs.map((log: any) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <LuCircleCheck size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{log.action}</span>
                      <time className="text-[10px] font-medium text-gray-400">{new Date(log.created_at).toLocaleString()}</time>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">by {log.user?.full_name || log.user?.first_name || 'System'}</p>
                    {log.old_values && log.new_values && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-xs space-y-1 mt-2">
                        {Object.keys(log.new_values).map(k => (
                          <div key={k} className="flex gap-2 font-mono">
                            <span className="text-gray-400 w-16 truncate">{k}:</span>
                            <span className="text-red-400 line-through truncate max-w-[80px]">{JSON.stringify(log.old_values[k])}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-emerald-500 font-bold truncate max-w-[100px]">{JSON.stringify(log.new_values[k])}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
        <RequestDocsModal
          vc={vc}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['visa_cases'] });
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

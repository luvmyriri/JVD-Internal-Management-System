import { useState } from 'react';
import toast from 'react-hot-toast';
import { LuUpload, LuCircleCheck, LuLoaderCircle, LuUser } from 'react-icons/lu';
import { customerPortalApi } from '../../../api/contracts';
import type { PortalTheme } from './PortalLayout';

interface DocumentChecklistViewProps {
  token: string;
  theme: PortalTheme;
  entitySummary: Record<string, any>;
  requestedDocs: string[];
  uploadedDocs: string[];
  percentComplete: number;
  onUploaded: () => void;
}

/**
 * Generic document-upload checklist — extracted from VisaUploadPublic.tsx and made
 * relatedType-agnostic so the same view serves both visa/passport-case requests and
 * supplier KYC requests through the unified CustomerPortalController.
 */
export default function DocumentChecklistView({
  token, theme, entitySummary, requestedDocs, uploadedDocs, percentComplete, onUploaded,
}: DocumentChecklistViewProps) {
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleFileUpload = async (file: File, docTitle: string) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit.');
      return;
    }
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Invalid file format. Only PDF, JPG, and PNG are allowed.');
      return;
    }

    setUploadingItem(docTitle);
    try {
      const res = await customerPortalApi.uploadDocument(token, docTitle, file);
      if (res.data.success) {
        toast.success(`Successfully uploaded "${docTitle}"!`);
        if (res.data.checklist_complete) {
          toast.success('All required documents received — thank you!');
        }
        onUploaded();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingItem(null);
    }
  };

  return (
    <>
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-100/60 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-2">
            <LuUser size={14} className={theme.iconColor} /> Request Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(entitySummary).filter(([, v]) => v).map(([key, value]) => (
            <div key={key} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="text-sm font-bold text-slate-800">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">Required Upload Checklist</h3>
          <span className={`text-[10px] font-black ${theme.iconColor} uppercase tracking-widest`}>
            {uploadedDocs.length} of {requestedDocs.length} Complete ({percentComplete}%)
          </span>
        </div>

        <div className="space-y-4">
          {requestedDocs.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-12 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              No specific requirements requested.
            </p>
          ) : (
            requestedDocs.map((docTitle) => {
              const isUploaded = uploadedDocs.includes(docTitle.trim().toLowerCase());
              const isUploading = uploadingItem === docTitle;
              const isDragOver = dragOverItem === docTitle;

              return (
                <div
                  key={docTitle}
                  className={`bg-white border rounded-[2.5rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-lg ${
                    isUploaded ? 'border-emerald-200 bg-emerald-50/10' : isDragOver ? 'border-blue-500 bg-blue-50/10 ring-4 ring-blue-500/5' : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); if (!isUploaded && !isUploading) setDragOverItem(docTitle); }}
                  onDragLeave={() => setDragOverItem(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverItem(null);
                    if (isUploaded || isUploading) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file, docTitle);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {isUploaded ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-250">
                          <LuCircleCheck size={16} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black border border-slate-200">!</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className={`text-sm font-bold tracking-wide ${isUploaded ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{docTitle}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {isUploaded ? 'Submission verified and complete' : 'Allowed formats: PDF, JPG, PNG (Max 10MB)'}
                      </p>
                    </div>
                  </div>

                  <div className="md:shrink-0 w-full md:w-auto flex flex-wrap items-center gap-3">
                    {isUploaded ? (
                      <div className="inline-flex px-3.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-200 shadow-sm">
                        Complete
                      </div>
                    ) : isUploading ? (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <LuLoaderCircle className={`animate-spin ${theme.iconColor}`} size={14} /> Uploading...
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer border transition shadow-md w-full md:w-auto">
                        <LuUpload size={13} /> Upload File
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, docTitle); }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

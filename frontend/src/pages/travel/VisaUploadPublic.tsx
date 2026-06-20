import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LuUpload,
  LuCircleCheck,
  LuLoaderCircle,
  LuGlobe,
  LuFileText,
  LuTriangleAlert,
  LuShieldCheck,
  LuUser,
  LuActivity,
  LuEye,
  LuDownload,
  LuX,
} from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { getStorageUrl } from '../../utils';

const COUNTRIES = [
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'FR', name: 'France (Schengen)' },
  { code: 'IT', name: 'Italy (Schengen)' },
  { code: 'ES', name: 'Spain (Schengen)' },
  { code: 'DE', name: 'Germany (Schengen)' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'CN', name: 'China' },
];

interface CaseData {
  id: number;
  customer_name: string;
  passenger_name: string;
  destination_country: string;
  visa_type: string;
  status: string;
  requested_docs: string[];
  uploaded_docs: string[];
  case_type?: string;
  documents?: {
    id: number;
    title: string;
    file_path?: string; // omitted from the unauthenticated public payload (C-04)
    created_at: string;
  }[];
}

export default function VisaUploadPublic() {
  const { token } = useParams<{ token: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const fetchRequestDetails = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await passportingApi.getPublicVisaRequest(token);
      if (res.data.success) {
        setCaseData(res.data.data);
      } else {
        toast.error('Failed to load request details.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Invalid or expired upload link.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [token]);

  const handleFileUpload = async (file: File, docTitle: string) => {
    if (!token) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit.');
      return;
    }

    // Validate format
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Invalid file format. Only PDF, JPG, and PNG are allowed.');
      return;
    }

    setUploadingItem(docTitle);
    setUploadProgress(prev => ({ ...prev, [docTitle]: 10 }));

    try {
      const formData = new FormData();
      formData.append('title', docTitle);
      formData.append('file', file);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const curr = prev[docTitle] || 10;
          if (curr >= 90) {
            clearInterval(interval);
            return prev;
          }
          return { ...prev, [docTitle]: curr + 10 };
        });
      }, 150);

      const res = await passportingApi.uploadPublicDocument(token, formData);
      clearInterval(interval);
      setUploadProgress(prev => ({ ...prev, [docTitle]: 100 }));

      if (res.data.success) {
        toast.success(`Successfully uploaded "${docTitle}"!`);
        await fetchRequestDetails();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingItem(null);
      setTimeout(() => {
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[docTitle];
          return updated;
        });
      }, 500);
    }
  };

  const getCountryName = (code: string) => {
    const matched = COUNTRIES.find(c => c.code.toUpperCase() === code.toUpperCase());
    return matched ? matched.name : code;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200/40 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-[100px] animate-pulse delay-700" />
        <LuLoaderCircle className="animate-spin text-violet-600 mb-4" size={40} />
        <p className="text-sm text-slate-500 font-bold tracking-wide">Verifying secure document portal...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-100/50 rounded-full blur-[120px]" />
        <div className="bg-white border border-red-100 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative z-10">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-100">
            <LuTriangleAlert size={30} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Access Link Invalid</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This document upload link is either invalid, expired, or has been revoked. Please contact JVD Travel Assistance to request a new link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const requestedList = caseData.requested_docs || [];
  const uploadedList = caseData.uploaded_docs || [];
  const pctComplete = requestedList.length > 0 ? Math.round((uploadedList.length / requestedList.length) * 100) : 0;

  const isPassport = caseData.case_type === 'passport';
  const theme = isPassport
    ? {
        gradient: 'from-slate-50 via-blue-50/20 to-indigo-50/40',
        bgBlob: 'bg-blue-200/20',
        badgeBg: 'bg-blue-100/60 text-blue-700 border-blue-200 shadow-sm',
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
        btnBg: 'bg-blue-600 hover:bg-blue-700 border-blue-550 shadow-blue-600/10',
        progressBg: 'bg-blue-600',
        dragBorder: 'border-blue-500 bg-blue-50/10 ring-4 ring-blue-500/5',
        downloadBtn: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100',
        title: 'JVD Passport Document Submission',
      }
    : {
        gradient: 'from-slate-50 via-violet-50/20 to-indigo-50/40',
        bgBlob: 'bg-violet-200/20',
        badgeBg: 'bg-violet-100/60 text-violet-700 border-violet-200 shadow-sm',
        iconColor: 'text-violet-600',
        iconBg: 'bg-violet-50 text-violet-600 border-violet-100',
        btnBg: 'bg-violet-600 hover:bg-violet-700 border-violet-550 shadow-violet-600/10',
        progressBg: 'bg-violet-650',
        dragBorder: 'border-violet-500 bg-violet-50/10 ring-4 ring-violet-500/5',
        downloadBtn: 'bg-violet-50 hover:bg-violet-100 text-violet-650 border-violet-100',
        title: 'JVD Visa Document Submission',
      };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} text-slate-800 py-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden`}>
      {/* Decorative background shapes */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] ${theme.bgBlob} rounded-full blur-[120px] pointer-events-none`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] ${theme.bgBlob} rounded-full blur-[120px] pointer-events-none`} />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        
        {/* Branding Header */}
        <div className="text-center space-y-3">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 ${theme.badgeBg} rounded-full text-[10px] font-black uppercase tracking-wider`}>
            <LuShieldCheck size={12} className={theme.iconColor} /> Secure Public Upload Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
            {theme.title}
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-[0.25em] font-bold">
            Event and Travel Management Company
          </p>
        </div>

        {/* Case Overview Card */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-100/60 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-2">
              <LuUser size={14} className={theme.iconColor} /> Case Details Overview
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">
              <LuActivity size={10} className="animate-pulse" /> Connection Secure
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer / Account</span>
              <span className="text-sm font-bold text-slate-800">{caseData.customer_name}</span>
            </div>
            <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Passenger Name</span>
              <span className="text-sm font-bold text-slate-800">{caseData.passenger_name}</span>
            </div>
            {caseData.destination_country && (
              <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center`}>
                  <LuGlobe size={18} />
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Destination</span>
                  <span className="text-sm font-bold text-slate-800">
                    {getCountryName(caseData.destination_country)} ({caseData.destination_country})
                  </span>
                </div>
              </div>
            )}
            <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center`}>
                <LuFileText size={18} />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                  {isPassport ? 'Service Type' : 'Visa Category'}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {isPassport ? 'Passport Processing' : `${caseData.visa_type} Visa`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Submission Checklist */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">
              Required Upload Checklist
            </h3>
            <span className={`text-[10px] font-black ${theme.iconColor} uppercase tracking-widest`}>
              {uploadedList.length} of {requestedList.length} Complete ({pctComplete}%)
            </span>
          </div>

          <div className="space-y-4">
            {requestedList.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-12 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                No specific requirements requested.
              </p>
            ) : (
              requestedList.map((docTitle) => {
                const docTitleClean = docTitle.trim().toLowerCase();
                const isUploaded = uploadedList.includes(docTitleClean);
                const isUploading = uploadingItem === docTitle;
                const progress = uploadProgress[docTitle] || 0;
                const isDragOver = dragOverItem === docTitle;

                // Find matching document object if uploaded
                const matchingDoc = caseData.documents?.find(
                  d => d.title.trim().toLowerCase() === docTitleClean
                );

                return (
                  <div
                    key={docTitle}
                    className={`bg-white border rounded-[2.5rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-lg ${
                      isUploaded
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : isDragOver
                        ? theme.dragBorder
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isUploaded && !isUploading) setDragOverItem(docTitle);
                    }}
                    onDragLeave={() => setDragOverItem(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverItem(null);
                      if (isUploaded || isUploading) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file, docTitle);
                    }}
                  >
                    {/* Requirement text & status */}
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {isUploaded ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-250">
                            <LuCircleCheck size={16} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black border border-slate-200">
                            !
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className={`text-sm font-bold tracking-wide ${isUploaded ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {docTitle}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {isUploaded
                            ? 'Submission verified and complete'
                            : 'Allowed formats: PDF, JPG, PNG (Max 10MB)'}
                        </p>
                      </div>
                    </div>

                    {/* Upload widget / actions slot */}
                    <div className="md:shrink-0 w-full md:w-auto flex flex-wrap items-center gap-3">
                      {isUploaded ? (
                        <>
                          {/* C-04: previously uploaded files are no longer downloadable from the
                              public portal. The preview/download buttons only render if the
                              (authenticated) payload ever supplies a file_path. */}
                          {matchingDoc?.file_path && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewUrl(getStorageUrl(matchingDoc.file_path as string));
                                  setPreviewTitle(matchingDoc.title);
                                  setImgLoading(true);
                                  setImgError(false);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200/60"
                              >
                                <LuEye size={13} />
                                <span>Preview</span>
                              </button>
                              <a
                                href={getStorageUrl(matchingDoc.file_path as string)}
                                target="_blank"
                                rel="noreferrer"
                                className={`px-3 py-1.5 ${theme.downloadBtn} rounded-xl text-xs font-bold transition flex items-center gap-1.5 border`}
                              >
                                <LuDownload size={13} />
                                <span>Download</span>
                              </a>
                            </div>
                          )}
                          <div className="inline-flex px-3.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-200 shadow-sm">
                            Complete
                          </div>
                        </>
                      ) : isUploading ? (
                        <div className="space-y-2 w-full md:w-48">
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <LuLoaderCircle className={`animate-spin ${theme.iconColor}`} size={12} /> Syncing file...
                            </span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${theme.progressBg} transition-all duration-300`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <label className={`flex items-center justify-center gap-2 px-5 py-3 ${theme.btnBg} active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer border transition shadow-md w-full md:w-auto`}>
                          <LuUpload size={13} /> Upload File
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, docTitle);
                            }}
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

        {/* Security Info Notice */}
        <div className="bg-white/80 border border-slate-200/80 rounded-[2rem] p-5 text-center text-xs text-slate-500 leading-relaxed max-w-xl mx-auto flex items-start gap-3 justify-center shadow-sm">
          <LuShieldCheck size={16} className={`${theme.iconColor} shrink-0 mt-0.5`} />
          <p className="font-semibold text-left">
            Documents uploaded are secured using encryption mechanisms. Uploaded files are directly synced with our Travel Operations Desk. If you experience technical issues, contact JVD Support at 0976 471 1294.
          </p>
        </div>

      </div>

      {/* Lightbox Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2rem] border border-slate-100 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">{previewTitle}</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <LuX size={18} />
              </button>
            </div>
            <div className="bg-slate-950 p-6 flex items-center justify-center overflow-auto flex-1 min-h-[400px] h-[55vh] relative">
              {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  className="w-full h-full rounded-2xl border border-slate-850 bg-white"
                  title="Document Preview"
                />
              ) : (
                <div className="relative max-w-full max-h-full flex items-center justify-center">
                  {imgLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 z-10">
                      <LuLoaderCircle className={`animate-spin ${theme.iconColor}`} size={32} />
                    </div>
                  )}
                  {imgError ? (
                    <div className="text-center p-6 space-y-3 text-slate-450">
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
                      className={`max-w-full max-h-[50vh] object-contain rounded-2xl border border-slate-850 shadow-2xl ${
                        imgLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'
                      }`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

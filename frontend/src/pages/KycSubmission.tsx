import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  LuUpload,
  LuCheck,
  LuLoaderCircle,
  LuBuilding2,
  LuUser,
  LuMail,
  LuFileCheck,
  LuTriangleAlert,
  LuLock,
  LuShieldCheck,
  LuFileText,
  LuEye
} from 'react-icons/lu';

const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  return window.location.origin;
};

const formatDocUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  let normalizedUrl = url;
  if (normalizedUrl.includes('/storage/accreditations/')) {
    normalizedUrl = normalizedUrl.replace('/storage/accreditations/', '/uploads/accreditations/');
  }
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }
  const baseUrl = getApiUrl();
  const slash = normalizedUrl.startsWith('/') ? '' : '/';
  return `${baseUrl}${slash}${normalizedUrl}`;
};

export default function KycSubmission() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const ref = searchParams.get('ref');

  // Page loading & authentication states
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Input states
  const [entityName, setEntityName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Uploaded file path states
  const [ndaUrl, setNdaUrl] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [kycUrl, setKycUrl] = useState('');

  // Local file name references for UI
  const [ndaFileName, setNdaFileName] = useState('');
  const [termsFileName, setTermsFileName] = useState('');
  const [kycFileName, setKycFileName] = useState('');

  // Drag over state per document slot
  const [dragOverState, setDragOverState] = useState<Record<string, boolean>>({
    nda: false,
    terms: false,
    kyc: false,
  });

  // Real-time upload percentage tracking per slot
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({
    nda: 0,
    terms: 0,
    kyc: 0,
  });

  // Lightbox preview states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Verify token on component mount
  useEffect(() => {
    const verifySession = async () => {
      if (!token || !ref) {
        setIsTokenValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const apiUrl = getApiUrl();
        const response = await axios.get(`${apiUrl}/api/accreditations/${ref}/verify-token`, {
          params: { token }
        });

        if (response.data.success) {
          setIsTokenValid(true);
          // Pre-populate fields with existing database record details if present
          if (response.data.data) {

            setEntityName(response.data.data.entity_name || '');
            setContactPerson(response.data.data.contact_person || '');
            setContactEmail(response.data.data.contact_email || '');
          }
        }
      } catch (err) {
        console.error('Compliance session verification failed:', err);
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    verifySession();
  }, [token, ref]);

  // Reusable core file uploader function
  const uploadFile = async (file: File, type: 'nda' | 'terms' | 'kyc') => {
    if (!ref || !token) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10MB limit.');
      return;
    }

    // Validate mime types
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExtension)) {
      setErrorMsg('Invalid file format. Only PDF, JPG, and PNG files are allowed.');
      return;
    }

    setUploadProgress(prev => ({ ...prev, [type]: 1 })); // start progress indicator
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('token', token);

    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/api/accreditations/${ref}/submit-kyc/upload/${type}?token=${token}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          // Track uploading progress in real-time
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(prev => ({ ...prev, [type]: Math.max(percentCompleted, 1) }));
          }
        }
      );

      if (response.data.success) {
        const fileUrl = response.data.url;
        if (type === 'nda') {
          setNdaUrl(fileUrl);
          setNdaFileName(file.name);
        } else if (type === 'terms') {
          setTermsUrl(fileUrl);
          setTermsFileName(file.name);
        } else if (type === 'kyc') {
          setKycUrl(fileUrl);
          setKycFileName(file.name);
        }
      }
    } catch (err: any) {
      console.error(`Failed to upload ${type} file:`, err);
      setErrorMsg(err.response?.data?.message || `Failed to upload ${type.toUpperCase()} document securely.`);
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    } finally {
      // Clear progress bar state after tiny delay so user sees 100% completion
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [type]: 0 }));
      }, 800);
    }
  };

  // 2. Handle file inputs onChange event
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'nda' | 'terms' | 'kyc') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, type);
    }
  };

  // 3. Handle drag and drop handlers
  const handleDragOver = (e: React.DragEvent, type: 'nda' | 'terms' | 'kyc') => {
    e.preventDefault();
    setDragOverState(prev => ({ ...prev, [type]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, type: 'nda' | 'terms' | 'kyc') => {
    e.preventDefault();
    setDragOverState(prev => ({ ...prev, [type]: false }));
  };

  const handleDrop = (e: React.DragEvent, type: 'nda' | 'terms' | 'kyc') => {
    e.preventDefault();
    setDragOverState(prev => ({ ...prev, [type]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file, type);
    }
  };

  // 4. Handle final secure compliance package submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref || !token) return;

    if (!ndaUrl || !termsUrl || !kycUrl) {
      setErrorMsg('Please upload all three required compliance documents before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const apiUrl = getApiUrl();
      await axios.post(`${apiUrl}/api/accreditations/${ref}/submit-kyc`, {
        token: token,
        nda_document_url: ndaUrl,
        terms_document_url: termsUrl,
        kyc_document_url: kycUrl,
        entity_name: entityName || undefined,
        contact_person: contactPerson || undefined,
        contact_email: contactEmail || undefined,
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit KYC compliance details', err);
      setErrorMsg(err.response?.data?.message || 'Failed to complete submission. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Triggers file input click
  const triggerFileInput = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.click();
  };

  // Render Loader during session validation
  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <LuLoaderCircle className="animate-spin text-blue-500 w-12 h-12 mx-auto" />
          <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  // Render Premium "Access Denied" screen if token or reference is invalid
  if (!isTokenValid || !token || !ref) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-600" />
          <div className="w-20 h-20 bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-900/30">
            <LuLock size={36} />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-4 text-slate-100">Access Denied</h2>
          <p className="text-slate-400 leading-relaxed text-sm mb-8">
            This compliance portal session is invalid, expired, or unauthorized. To protect organization confidentiality, public access is barred without a current secure invitation link.
          </p>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-500 text-left space-y-1">
            <p className="font-bold text-slate-400">🔒 Security Notice</p>
            <p>Documents and credentials submitted to JVD Event & Travel Co. are processed through automated pipelines and archived under encrypted storage layers.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render Premium animated "Success" Splash Page
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="bg-slate-900 max-w-2xl w-full rounded-[3rem] shadow-2xl border border-slate-800/80 p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />

          <div className="w-24 h-24 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-900/30 shadow-inner">
            <LuCheck size={48} className="stroke-[3]" />
          </div>

          <h2 className="text-4xl font-black tracking-tight mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Compliance Completed</h2>
          <p className="text-slate-400 leading-relaxed max-w-lg mx-auto mb-10 text-sm">
            Thank you! Your verified business details and signed compliance files have been securely updated. The JVD Procurement team will examine your accreditation status immediately.
          </p>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 mb-10 text-left grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Accredited Entity</span>
              <p className="text-sm font-black text-slate-200">{entityName || 'Logged Representative'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Record Ref</span>
              <p className="text-sm font-black text-slate-200">#AC-{ref}</p>
            </div>
            <div className="space-y-1 col-span-2 border-t border-slate-800/80 pt-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Session Security</span>
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
                <LuShieldCheck className="w-4 h-4" /> End-to-End Encrypted Handshake Active
              </p>
            </div>
          </div>

          <button
            onClick={() => window.close()}
            className="bg-white text-slate-950 font-black py-4 px-8 rounded-2xl hover:bg-slate-100 transition-all shadow-lg text-sm"
          >
            Close Session Window
          </button>
        </div>
      </div>
    );
  }

  // Render Full Screen split-pane layout
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-white font-sans overflow-x-hidden relative">

      {/* LEFT COLUMN: Sidebar with JVD branding and guidelines */}
      <div className="w-full md:w-[38%] bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800/80 p-8 md:p-12 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Logo & Header */}
          <div className="flex items-center gap-3">
            <img
              src="/JVD 3D.png"
              alt="JVD Logo"
              className="h-10 w-auto"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">JVD</span>
          </div>

          {/* Titles */}
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
              Secure Compliance Portal
            </span>
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-white">
              Compliance & Accreditation
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              JVD Events and Travel Management, Co. requires all suppliers, drivers, and fleet partners to complete compliance checkouts before formal contract sign-off.
            </p>
          </div>

          {/* Step checklist - Interactive progression access point */}
          <div className="space-y-6 pt-4">
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${entityName && contactPerson && contactEmail
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                <LuUser size={16} />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">1. Partner Contact Details</h3>
                <p className="text-[11px] text-slate-500">Provide official registered representative contact info.</p>
              </div>
            </div>

            {/* NDA Sidebar item (Clickable if uploaded) */}
            <div
              onClick={() => {
                if (ndaUrl) {
                  setPreviewUrl(ndaUrl);
                  setPreviewTitle('Signed NDA Agreement');
                }
              }}
              className={`flex items-start gap-4 ${ndaUrl ? 'cursor-pointer hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-xl transition-all' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${ndaUrl
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                {ndaUrl ? <LuEye size={14} /> : <LuFileText size={16} />}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  2. NDA Signature
                  {ndaUrl && <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">Uploaded</span>}
                </h3>
                <p className="text-[11px] text-slate-500">{ndaUrl ? 'Click to view NDA preview.' : 'Upload signed Non-Disclosure Agreement document.'}</p>
              </div>
            </div>

            {/* Terms Sidebar item (Clickable if uploaded) */}
            <div
              onClick={() => {
                if (termsUrl) {
                  setPreviewUrl(termsUrl);
                  setPreviewTitle('Signed Terms & Conditions');
                }
              }}
              className={`flex items-start gap-4 ${termsUrl ? 'cursor-pointer hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-xl transition-all' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${termsUrl
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                {termsUrl ? <LuEye size={14} /> : <LuFileCheck size={16} />}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  3. Terms Signature
                  {termsUrl && <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">Uploaded</span>}
                </h3>
                <p className="text-[11px] text-slate-500">{termsUrl ? 'Click to view terms preview.' : 'Agree and upload signed terms and conditions.'}</p>
              </div>
            </div>

            {/* KYC Sidebar item (Clickable if uploaded) */}
            <div
              onClick={() => {
                if (kycUrl) {
                  setPreviewUrl(kycUrl);
                  setPreviewTitle('KYC Packet / Business License');
                }
              }}
              className={`flex items-start gap-4 ${kycUrl ? 'cursor-pointer hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-xl transition-all' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${kycUrl
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}>
                {kycUrl ? <LuEye size={14} /> : <LuShieldCheck size={16} />}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  4. Business KYC Packet
                  {kycUrl && <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black">Uploaded</span>}
                </h3>
                <p className="text-[11px] text-slate-500">{kycUrl ? 'Click to view KYC packet.' : 'Upload official business registration documents.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Confidentiality badges */}
        <div className="pt-10 border-t border-slate-800/80 mt-10 space-y-4">
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-850 px-4 py-3 rounded-xl">
            <LuLock size={20} className="text-emerald-500 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">End-to-End Cryptography</p>
              <p className="text-[10px] text-slate-550">Your session token is active and fully secure.</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-550 text-center leading-relaxed">
            &copy; {new Date().getFullYear()} JVD Events & Travels Management Co. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: The spacious Main Form Page */}
      <div className="flex-1 bg-slate-950 p-8 md:p-16 flex flex-col justify-start overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto space-y-10">

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Accreditation Registration</h2>
            <p className="text-xs text-slate-500">Please review the instructions, fill out contact profiles, and upload verified credentials.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-950/20 border border-red-900/30 text-red-400 rounded-2xl p-5 flex items-start gap-3.5 text-sm font-semibold shadow-sm animate-in slide-in-from-top duration-300">
              <LuTriangleAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Section 1: Business Profile */}
            <div className="space-y-6">
              <div className="border-b border-slate-800/85 pb-3">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  1. Business Profile Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Name */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Business Name</label>
                  <div className="relative">
                    <LuBuilding2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-550 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACME Corp"
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-200"
                    />
                  </div>
                </div>

                {/* Contact Representative */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Representative</label>
                  <div className="relative">
                    <LuUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-550 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="Representative full name"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-200"
                    />
                  </div>
                </div>

                {/* Official Email */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Official Email Address</label>
                  <div className="relative">
                    <LuMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-550 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. accounts@acmecorp.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Upload Documents */}
            <div className="space-y-6">
              <div className="border-b border-slate-800/85 pb-3">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  2. Verification Documents
                </h3>
              </div>

              <div className="space-y-6">

                {/* Doc 1: NDA */}
                <div className="relative w-full">
                  <input
                    type="file"
                    id="nda-upload-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'nda')}
                    className="hidden"
                    disabled={uploadProgress.nda > 0}
                  />

                  {ndaUrl ? (
                    /* STATE: UPLOADED */
                    <div className="bg-slate-900 border border-emerald-900/40 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-emerald-800">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-950/40 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-900/30 shadow-inner">
                          <LuFileText size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-200">Signed NDA Agreement</h4>
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><LuShieldCheck size={10} /> Valid Uploaded</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-[340px] font-mono">{ndaFileName || 'nda_signed_document.pdf'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => { setPreviewUrl(ndaUrl); setPreviewTitle('Signed NDA Agreement'); }}
                          className="bg-blue-600/15 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <LuEye size={14} /> View File
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileInput('nda-upload-input')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all"
                        >
                          Change File
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STATE: UNUPLOADED - Drag & Drop Enabled + Axios real-time progress bar */
                    <div
                      onClick={() => triggerFileInput('nda-upload-input')}
                      onDragOver={(e) => handleDragOver(e, 'nda')}
                      onDragLeave={(e) => handleDragLeave(e, 'nda')}
                      onDrop={(e) => handleDrop(e, 'nda')}
                      className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${dragOverState.nda
                          ? 'border-blue-500 bg-blue-950/20 scale-[1.01]'
                          : 'border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 hover:border-blue-500/50'
                        }`}
                    >
                      {uploadProgress.nda > 0 ? (
                        <div className="py-4 space-y-4 w-full max-w-xs mx-auto">
                          <LuLoaderCircle className="animate-spin text-blue-500 w-8 h-8 mx-auto" />
                          <div className="space-y-1.5 text-center">
                            <p className="text-xs font-bold text-slate-300 tracking-wide uppercase">Uploading NDA File...</p>
                            <p className="text-[10px] text-slate-500 font-bold">{uploadProgress.nda}% completed</p>
                          </div>
                          {/* Premium Progress Bar Track */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.nda}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-950/60 text-slate-450 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <LuUpload size={22} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-200">Upload Signed NDA Agreement <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Drag & drop your signed NDA document here, or click to browse files. PDF, JPG, and PNG files up to 10MB are permitted.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Doc 2: Terms */}
                <div className="relative w-full">
                  <input
                    type="file"
                    id="terms-upload-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'terms')}
                    className="hidden"
                    disabled={uploadProgress.terms > 0}
                  />

                  {termsUrl ? (
                    /* STATE: UPLOADED */
                    <div className="bg-slate-900 border border-emerald-900/40 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-emerald-800">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-950/40 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-900/30 shadow-inner">
                          <LuFileCheck size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-200">Signed Terms & Conditions</h4>
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><LuShieldCheck size={10} /> Valid Uploaded</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-[340px] font-mono">{termsFileName || 'terms_signed_document.pdf'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => { setPreviewUrl(termsUrl); setPreviewTitle('Signed Terms & Conditions'); }}
                          className="bg-blue-600/15 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <LuEye size={14} /> View File
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileInput('terms-upload-input')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all"
                        >
                          Change File
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STATE: UNUPLOADED - Drag & Drop Enabled + Axios real-time progress bar */
                    <div
                      onClick={() => triggerFileInput('terms-upload-input')}
                      onDragOver={(e) => handleDragOver(e, 'terms')}
                      onDragLeave={(e) => handleDragLeave(e, 'terms')}
                      onDrop={(e) => handleDrop(e, 'terms')}
                      className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${dragOverState.terms
                          ? 'border-blue-500 bg-blue-950/20 scale-[1.01]'
                          : 'border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 hover:border-blue-500/50'
                        }`}
                    >
                      {uploadProgress.terms > 0 ? (
                        <div className="py-4 space-y-4 w-full max-w-xs mx-auto">
                          <LuLoaderCircle className="animate-spin text-blue-500 w-8 h-8 mx-auto" />
                          <div className="space-y-1.5 text-center">
                            <p className="text-xs font-bold text-slate-300 tracking-wide uppercase">Uploading Terms File...</p>
                            <p className="text-[10px] text-slate-550 font-bold">{uploadProgress.terms}% completed</p>
                          </div>
                          {/* Premium Progress Bar Track */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.terms}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-950/60 text-slate-450 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <LuUpload size={22} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-200">Upload Signed Terms & Conditions <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Drag & drop your signed terms and conditions document here, or click to browse files. PDF, JPG, and PNG files up to 10MB are permitted.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Doc 3: KYC Packet */}
                <div className="relative w-full">
                  <input
                    type="file"
                    id="kyc-upload-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'kyc')}
                    className="hidden"
                    disabled={uploadProgress.kyc > 0}
                  />

                  {kycUrl ? (
                    /* STATE: UPLOADED */
                    <div className="bg-slate-900 border border-emerald-900/40 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition hover:border-emerald-800">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-950/40 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-900/30 shadow-inner">
                          <LuShieldCheck size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-200">KYC Packet / Business License</h4>
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><LuShieldCheck size={10} /> Valid Uploaded</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-[340px] font-mono">{kycFileName || 'kyc_accreditation_documents.pdf'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => { setPreviewUrl(kycUrl); setPreviewTitle('KYC Packet / Business License'); }}
                          className="bg-blue-600/15 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <LuEye size={14} /> View File
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileInput('kyc-upload-input')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all"
                        >
                          Change File
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STATE: UNUPLOADED - Drag & Drop Enabled + Axios real-time progress bar */
                    <div
                      onClick={() => triggerFileInput('kyc-upload-input')}
                      onDragOver={(e) => handleDragOver(e, 'kyc')}
                      onDragLeave={(e) => handleDragLeave(e, 'kyc')}
                      onDrop={(e) => handleDrop(e, 'kyc')}
                      className={`border-2 border-dashed p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden ${dragOverState.kyc
                          ? 'border-blue-500 bg-blue-950/20 scale-[1.01]'
                          : 'border-slate-800 bg-slate-900/35 hover:bg-slate-900/60 hover:border-blue-500/50'
                        }`}
                    >
                      {uploadProgress.kyc > 0 ? (
                        <div className="py-4 space-y-4 w-full max-w-xs mx-auto">
                          <LuLoaderCircle className="animate-spin text-blue-500 w-8 h-8 mx-auto" />
                          <div className="space-y-1.5 text-center">
                            <p className="text-xs font-bold text-slate-300 tracking-wide uppercase">Uploading KYC File...</p>
                            <p className="text-[10px] text-slate-500 font-bold">{uploadProgress.kyc}% completed</p>
                          </div>
                          {/* Premium Progress Bar Track */}
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress.kyc}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-950/60 text-slate-455 border border-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <LuUpload size={22} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-200">Upload KYC Packet / Business License <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Drag & drop your certified license and accreditation packet here, or click to browse files. PDF, JPG, and PNG files up to 10MB are permitted.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-slate-850 flex items-center justify-between gap-6">
              <p className="text-[11px] text-slate-550 flex items-center gap-1.5">
                <LuLock size={12} className="text-blue-500" /> Transmitted securely under automated 256-bit TLS pipelines.
              </p>

              <button
                type="submit"
                disabled={isSubmitting || Object.values(uploadProgress).some(val => val > 0)}
                className="bg-blue-600 text-white font-black py-4 px-8 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 shrink-0 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <LuLoaderCircle size={18} className="animate-spin" />
                    Completing accreditation...
                  </>
                ) : (
                  'Complete & Submit Package'
                )}
              </button>
            </div>

          </form>

        </div>
      </div>

      {/* ULTRA-PREMIUM LIGHTBOX DOCUMENT VIEWING MODAL */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800/80 w-full max-w-5xl h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/40">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 flex items-center gap-1.5">
                  <LuLock className="w-3.5 h-3.5 text-blue-400" /> Secure Document Vault
                </span>
                <h3 className="text-sm font-black text-slate-200">{previewTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all"
              >
                Close Viewer
              </button>
            </div>

            {/* Document Preview Frame */}
            <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto">
              {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={`${formatDocUrl(previewUrl)}#toolbar=0`}
                  className="w-full h-full rounded-xl border border-slate-850"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={formatDocUrl(previewUrl)}
                  alt="Document Preview"
                  className="max-w-full max-h-full object-contain rounded-xl border border-slate-850 shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

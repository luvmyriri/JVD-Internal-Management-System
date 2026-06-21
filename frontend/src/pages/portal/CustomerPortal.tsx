import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuLoaderCircle, LuTriangleAlert } from 'react-icons/lu';
import { customerPortalApi } from '../../api/contracts';
import PortalLayout, { type PortalTheme } from './components/PortalLayout';
import DocumentChecklistView from './components/DocumentChecklistView';
import ContractSignatureView from './components/ContractSignatureView';

const THEMES: Record<string, PortalTheme> = {
  PassportCase: {
    gradient: 'from-slate-50 via-violet-50/20 to-indigo-50/40',
    bgBlob: 'bg-violet-200/20',
    badgeBg: 'bg-violet-100/60 text-violet-700 border-violet-200 shadow-sm',
    iconColor: 'text-violet-600',
    title: 'JVD Document Submission',
  },
  Accreditation: {
    gradient: 'from-slate-50 via-blue-50/20 to-indigo-50/40',
    bgBlob: 'bg-blue-200/20',
    badgeBg: 'bg-blue-100/60 text-blue-700 border-blue-200 shadow-sm',
    iconColor: 'text-blue-600',
    title: 'JVD Compliance Submission',
  },
  contract: {
    gradient: 'from-slate-50 via-emerald-50/20 to-blue-50/40',
    bgBlob: 'bg-emerald-200/20',
    badgeBg: 'bg-emerald-100/60 text-emerald-700 border-emerald-200 shadow-sm',
    iconColor: 'text-emerald-600',
    title: 'JVD Contract Review & Signature',
  },
};

/**
 * Unified customer self-service portal — consolidates the previously-separate visa/passport
 * document portal and supplier KYC portal, and extends the same token mechanism to contract
 * review & e-signature (Phase 4's contract gate).
 */
export default function CustomerPortal() {
  const { token } = useParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [signed, setSigned] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await customerPortalApi.verify(token);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        toast.error('Failed to load this link.');
      }
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <LuLoaderCircle className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-sm text-slate-500 font-bold tracking-wide">Verifying secure portal link...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-red-100 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-100">
            <LuTriangleAlert size={30} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Link Invalid or Expired</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This portal link is either invalid, expired, or has been revoked. Please contact JVD for a new link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data.purpose === 'document_upload') {
    const theme = THEMES[data.related_type] ?? THEMES.PassportCase;
    return (
      <PortalLayout theme={theme}>
        <DocumentChecklistView
          token={token!}
          theme={theme}
          entitySummary={data.entity_summary}
          requestedDocs={data.requested_docs}
          uploadedDocs={data.uploaded_docs}
          percentComplete={data.percent_complete}
          onUploaded={fetchData}
        />
      </PortalLayout>
    );
  }

  if (data.purpose === 'contract_signature') {
    return (
      <PortalLayout theme={THEMES.contract}>
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-slate-100/60">
          <ContractSignatureView
            contractNumber={data.contract_number}
            termsSnapshot={data.terms_snapshot}
            invoiceSummary={data.invoice_summary}
            itinerary={data.itinerary}
            passengers={data.passengers}
            paymentSchedule={data.payment_schedule}
            alreadySigned={data.already_signed || signed}
            submitLabel="Sign Contract"
            onSubmit={async (signature) => {
              await customerPortalApi.signContract(token!, signature);
              setSigned(true);
              toast.success('Contract signed — thank you!');
            }}
          />
        </div>
      </PortalLayout>
    );
  }

  return null;
}

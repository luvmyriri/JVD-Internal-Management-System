import { useState } from 'react';
import { LuCheck, LuLoaderCircle, LuFileText } from 'react-icons/lu';
import toast from 'react-hot-toast';
import SignaturePad from './SignaturePad';

export interface ContractSignatureViewProps {
  contractNumber: string;
  termsSnapshot: string;
  invoiceSummary: { invoice_number: string; total_amount: number; customer_name?: string };
  itinerary?: any[];
  passengers?: any[];
  paymentSchedule?: any[];
  alreadySigned?: boolean;
  submitLabel?: string;
  onSubmit: (data: { signature_image: string; signature_typed_name: string }) => Promise<void>;
}

/**
 * Renders contract terms + itinerary + passenger roster + payment schedule (read-only) with a
 * signature-capture panel. Shared verbatim between the staff-facing "Sign Now At Counter" modal
 * and the public customer self-service portal — only the onSubmit callback differs per caller.
 */
export default function ContractSignatureView({
  contractNumber,
  termsSnapshot,
  invoiceSummary,
  itinerary = [],
  passengers = [],
  paymentSchedule = [],
  alreadySigned = false,
  submitLabel = 'Sign Contract',
  onSubmit,
}: ContractSignatureViewProps) {
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !!signatureImage && typedName.trim().length > 1 && agreed;

  const handleSubmit = async () => {
    if (!canSubmit || !signatureImage) {
      toast.error('Please draw your signature, type your full name, and confirm agreement.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ signature_image: signatureImage, signature_typed_name: typedName.trim() });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to record signature.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadySigned) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
          <LuCheck className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">This contract has already been signed.</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Contract #{contractNumber}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contract No.</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{contractNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">₱{Number(invoiceSummary.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {itinerary.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Itinerary</p>
          <div className="space-y-2">
            {itinerary.map((day: any, i: number) => (
              <div key={i} className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-xs">
                <span className="font-black text-blue-600">Day {day.day_number}</span>
                {day.location && <span className="ml-2 font-bold text-gray-700 dark:text-gray-300">{day.location}</span>}
                {day.activity_description && <p className="text-gray-500 dark:text-gray-400 mt-1">{day.activity_description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {passengers.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Passenger / Applicant Roster</p>
          <div className="space-y-1">
            {passengers.map((p: any, i: number) => (
              <div key={i} className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
                {p.first_name} {p.last_name}
              </div>
            ))}
          </div>
        </div>
      )}

      {paymentSchedule.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Payment Schedule</p>
          <div className="space-y-1">
            {paymentSchedule.map((row: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-xs">
                <span className="font-bold text-gray-700 dark:text-gray-300">Installment {row.installment_number} — {row.due_date}</span>
                <span className="font-black text-gray-900 dark:text-white">₱{Number(row.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
          <LuFileText className="w-3.5 h-3.5" /> Terms &amp; Conditions
        </p>
        <pre className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-[11px] font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
          {termsSnapshot}
        </pre>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Signature</p>
        <SignaturePad onChange={setSignatureImage} />
        <input
          type="text"
          placeholder="Type your full legal name"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
        />
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-blue-600" />
          <span className="text-xs text-gray-600 dark:text-gray-400">I have reviewed and agree to the terms and conditions above.</span>
        </label>
      </div>

      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={handleSubmit}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <LuLoaderCircle className="w-4 h-4 animate-spin" /> : <LuCheck className="w-4 h-4" />}
        {submitLabel}
      </button>
    </div>
  );
}

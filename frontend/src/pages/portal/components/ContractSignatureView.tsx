import { useState } from 'react';
import { LuCheck, LuLoaderCircle, LuFileText } from 'react-icons/lu';
import toast from 'react-hot-toast';
import SignaturePad from './SignaturePad';

export interface ContractSignatureViewProps {
  contractNumber: string;
  termsSnapshot: string;
  invoiceSummary: {
    invoice_number: string;
    subtotal?: number;
    tax_amount?: number;
    total_amount: number;
    amount_received?: number;
    balance?: number;
    customer_name?: string;
    items?: Array<{
      id: number;
      name: string;
      service_type?: string | null;
      description?: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
      adults?: number | null;
      children?: number | null;
    }>;
    joiner_booking?: {
      reference: string;
      departure_code: string;
      starts_at?: string | null;
      ends_at?: string | null;
      pickup_instructions?: string | null;
      vehicle?: { plate_number: string; model?: string | null } | null;
      driver?: { name: string; phone?: string | null; email?: string | null } | null;
      passengers: Array<{ name: string; passenger_type?: string | null; seat_code?: string | null }>;
    } | null;
  };
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
  const items = invoiceSummary.items ?? [];
  const joinerBooking = invoiceSummary.joiner_booking;

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

      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Services in this order</p>
          <div className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <div key={item.id} className="px-3.5 py-3 flex items-start justify-between gap-4 text-xs">
                <div className="min-w-0">
                  <p className="font-black text-gray-800 dark:text-gray-100">{item.name}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    {item.quantity} x PHP {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {(item.adults != null || item.children != null) && ` | ${item.adults ?? 0} adult(s), ${item.children ?? 0} child(ren)`}
                  </p>
                  {item.description && <p className="mt-1 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">{item.description}</p>}
                </div>
                <p className="shrink-0 font-black text-gray-900 dark:text-white">
                  PHP {Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {joinerBooking && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Joiner departure and assigned seats</p>
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-black text-blue-900 dark:text-blue-100">{joinerBooking.departure_code}</p>
                <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80">Booking {joinerBooking.reference}</p>
              </div>
              {joinerBooking.starts_at && (
                <p className="text-[10px] font-bold text-blue-900 dark:text-blue-100">
                  {new Date(joinerBooking.starts_at).toLocaleString()}
                  {joinerBooking.ends_at ? ` - ${new Date(joinerBooking.ends_at).toLocaleString()}` : ''}
                </p>
              )}
            </div>
            {joinerBooking.passengers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {joinerBooking.passengers.map((passenger, index) => (
                  <span key={`${passenger.seat_code ?? 'seat'}-${index}`} className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/50 rounded-lg font-bold text-gray-700 dark:text-gray-200">
                    {passenger.seat_code ?? '?'} - {passenger.name}{passenger.passenger_type === 'child' ? ' (Child)' : ''}
                  </span>
                ))}
              </div>
            )}
            {(joinerBooking.vehicle || joinerBooking.driver) && (
              <p className="mt-3 text-[10px] text-blue-800 dark:text-blue-200">
                {joinerBooking.vehicle ? `${joinerBooking.vehicle.plate_number}${joinerBooking.vehicle.model ? ` (${joinerBooking.vehicle.model})` : ''}` : 'Vehicle pending'}
                {joinerBooking.driver ? ` | Driver: ${joinerBooking.driver.name}${joinerBooking.driver.phone ? ` | ${joinerBooking.driver.phone}` : ''}${joinerBooking.driver.email ? ` | ${joinerBooking.driver.email}` : ''}` : ''}
              </p>
            )}
            {joinerBooking.pickup_instructions && <p className="mt-2 text-[10px] text-blue-800 dark:text-blue-200">Pickup: {joinerBooking.pickup_instructions}</p>}
          </div>
        </div>
      )}

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

import React from 'react';
import { 
  Bus, 
  GraduationCap, 
  Info, 
  Users 
} from 'lucide-react';
import ProposedTripBudgetCard from '../../../components/travel/ProposedTripBudgetCard';
import { Button } from '../../../components/ds';

interface Props {
  tourName: string;
  schoolName: string;
  gradeLevel?: string;
  expectedStudents: number;
  expectedAdults?: number;
  ratePerHead: number;
  adultRatePerHead?: number;
  assignedBusesCount: number;
  paymentPolicy: 'full_only' | 'down_payment' | 'installment' | 'flexible';
  downPaymentAmount?: number;
  installmentCount?: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function EducationalTourReview({
  tourName,
  schoolName,
  gradeLevel,
  expectedStudents,
  expectedAdults,
  ratePerHead,
  adultRatePerHead,
  assignedBusesCount,
  paymentPolicy,
  downPaymentAmount,
  installmentCount,
  onSubmit,
  isSubmitting,
}: Props) {
  // Calculations
  const students = Math.max(1, Number(expectedStudents || 0));
  const adults = Math.max(0, Number(expectedAdults || 0));
  const rate = Math.max(0, Number(ratePerHead || 0));
  const adultRate = Math.max(0, Number(adultRatePerHead ?? rate));

  const studentSubtotal = students * rate;
  const adultSubtotal = adults * adultRate;
  const subtotal = studentSubtotal + adultSubtotal;
  const estimatedRevenue = subtotal;

  const totalTravelers = students + adults;
  const requiredBuses = Math.max(1, Math.ceil(totalTravelers / 49));
  const activeFleetBuses = Math.max(requiredBuses, assignedBusesCount);
  const totalFleetCapacity = activeFleetBuses * 49;
  const excessCapacity = Math.max(0, totalFleetCapacity - totalTravelers);

  return (
    <div className="space-y-5">
      {/* Blueprint Live Summary Card */}
      <div className="p-6 rounded-3xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-widest">
            Package Financial Summary
          </span>
          <span className="text-[10px] font-bold text-slate-300">
            Per-Head Model
          </span>
        </div>

        <div>
          <h3 className="text-lg font-black leading-snug text-white line-clamp-1">
            {tourName || 'Untitled Exposure Tour'}
          </h3>
          <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
            <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
            {schoolName || 'School Name Pending'} {gradeLevel ? `· ${gradeLevel}` : ''}
          </p>
        </div>

        {/* Pricing & Headcount Breakdown */}
        <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-semibold text-slate-200">
          <div className="flex justify-between">
            <span>Student Rate</span>
            <strong className="text-white">₱{rate.toLocaleString()} / student</strong>
          </div>
          <div className="flex justify-between">
            <span>Adult / Companion Rate</span>
            <strong className="text-white">₱{adultRate.toLocaleString()} / adult</strong>
          </div>
          <div className="flex justify-between">
            <span>Target Student Pax</span>
            <strong className="text-white">{students} Students (₱{studentSubtotal.toLocaleString()})</strong>
          </div>

          {adults > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>Adult / Companion Pax</span>
              <span className="text-white">
                {adults} Adults (₱{adultSubtotal.toLocaleString()})
              </span>
            </div>
          )}

          {/* 49-Seater Fleet Capacity Metrics */}
          <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-amber-300 font-bold">
              <span className="flex items-center gap-1"><Bus className="h-3.5 w-3.5" /> 49-Seater Buses Needed</span>
              <span>{requiredBuses} Bus ({requiredBuses * 49} Seats)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Travelers</span>
              <span>{totalTravelers} Pax</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Remaining Fleet Seats</span>
              <span>{excessCapacity} Available</span>
            </div>
          </div>

          {/* Payment Terms Preview */}
          <div className="pt-2 border-t border-white/10 text-[11px] space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span>Payment Policy:</span>
              <span className="font-bold text-white uppercase">{paymentPolicy.replace('_', ' ')}</span>
            </div>
            {downPaymentAmount ? (
              <div className="flex justify-between">
                <span>Min Down Payment:</span>
                <span className="font-bold text-amber-300">₱{Number(downPaymentAmount).toLocaleString()}</span>
              </div>
            ) : null}
            {installmentCount ? (
              <div className="flex justify-between">
                <span>Installment Count:</span>
                <span className="font-bold text-white">{installmentCount} terms</span>
              </div>
            ) : null}
          </div>

          {/* Estimated Gross Package Revenue */}
          <div className="flex justify-between text-base font-black text-amber-400 pt-3 border-t border-white/10">
            <span>Est. Gross Revenue</span>
            <span>₱{estimatedRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !tourName.trim() || !schoolName.trim()}
          className="w-full !bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-black text-xs uppercase tracking-wider py-3 shadow-lg mt-2"
        >
          {isSubmitting ? 'Creating Tour...' : 'Save & Launch Educational Tour'}
        </Button>
      </div>

      {/* Internal Operational Trip Budget Card */}
      <ProposedTripBudgetCard
        proposedBudget={estimatedRevenue}
        basePrice={studentSubtotal}
        additions={[
          ...(adults > 0
            ? [{
                label: `${adults} Adult / Companion(s) @ ₱${adultRate.toLocaleString()}`,
                amount: adultSubtotal,
                type: 'addition' as const,
              }]
            : []),
        ]}
        subtractions={[]}
        title="Internal Operational Budget Estimate"
      />

      {/* Accounting & Billing Invariant Notice */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 space-y-2 text-xs text-blue-900 dark:text-blue-200">
        <div className="flex items-center gap-2 font-bold">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Desk-Operated Participant Billing</span>
        </div>
        <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
          This package establishes separate fixed rates for students (<strong>₱{rate.toLocaleString()} / student</strong>) and adult companions (<strong>₱{adultRate.toLocaleString()} / adult</strong>). Invoices and booking references are issued individually upon registration at the desk.
        </p>
      </div>
    </div>
  );
}

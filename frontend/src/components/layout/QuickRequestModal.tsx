import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuickRequest, type QuickRequestTab } from '../../context/QuickRequestContext';
import { cashBudgetApi, commissionApi } from '../../api/operations';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  LuX,
  LuWallet,
  LuSignature,
  LuCalendar,
  LuMapPin,
  LuBus,
  LuCoins,
  LuFileText,
  LuSend,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
} from 'react-icons/lu';

export default function QuickRequestModal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOpen, activeTab, closeQuickRequest, openQuickRequest } = useQuickRequest();

  const [tab, setTab] = useState<QuickRequestTab>(activeTab);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cash Budget Form State
  const [cbDate, setCbDate] = useState(new Date().toISOString().split('T')[0]);
  const [cbDestination, setCbDestination] = useState('');
  const [cbPlateNumber, setCbPlateNumber] = useState('');
  const [cbTotalAmount, setCbTotalAmount] = useState('');
  const [cbNotes, setCbNotes] = useState('');
  const [showCbBreakdown, setShowCbBreakdown] = useState(false);
  const [cbDiesel, setCbDiesel] = useState('');
  const [cbMeals, setCbMeals] = useState('');
  const [cbTolls, setCbTolls] = useState('');
  const [cbSop, setCbSop] = useState('');

  // Diesel Autocalculator Helper State (KM / 2.5 * Diesel Price)
  const [calcKm, setCalcKm] = useState('');
  const [calcDieselPrice, setCalcDieselPrice] = useState('60');

  // Commission Form State
  const [commName, setCommName] = useState('');
  const [commDate, setCommDate] = useState(new Date().toISOString().split('T')[0]);
  const [commDescription, setCommDescription] = useState('');
  const [commDestination, setCommDestination] = useState('');
  const [commAmount, setCommAmount] = useState('');
  const [commNotes, setCommNotes] = useState('');

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      setCommName(`${user.first_name || ''} ${user.last_name || ''}`.trim());
    }
  }, [user]);

  if (!isOpen) return null;

  const handleCashBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cbTotalAmount) || 0;
    const diesel = parseFloat(cbDiesel) || 0;
    const meal = parseFloat(cbMeals) || 0;
    const toll = parseFloat(cbTolls) || 0;
    const sop = parseFloat(cbSop) || 0;

    const finalAmount = amount > 0 ? amount : (diesel + meal + toll + sop);

    if (finalAmount <= 0) {
      toast.error('Please enter a valid total amount or expense breakdown.');
      return;
    }

    setIsSubmitting(true);
    try {
      await cashBudgetApi.create({
        date: cbDate,
        destination: cbDestination || 'General Request',
        plate_number: cbPlateNumber || undefined,
        total_amount: finalAmount,
        diesel: diesel || undefined,
        meal_allowance: meal || undefined,
        autosweep: toll || undefined,
        sop: sop || undefined,
      } as any);

      toast.success(
        (t) => (
          <div className="flex items-center gap-2">
            <LuCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="font-bold text-xs">Cash Budget Request Submitted!</p>
              <p className="text-[11px] text-gray-500">₱{finalAmount.toLocaleString()} request sent to Accounting.</p>
            </div>
          </div>
        ),
        { duration: 4000 }
      );

      queryClient.invalidateQueries({ queryKey: ['cash-budgets'] });
      // Reset form
      setCbDestination('');
      setCbPlateNumber('');
      setCbTotalAmount('');
      setCbNotes('');
      setCbDiesel('');
      setCbMeals('');
      setCbTolls('');
      setCbSop('');
      closeQuickRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit cash budget request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(commAmount) || 0;

    if (amount <= 0) {
      toast.error('Please enter a valid commission amount.');
      return;
    }

    if (!commDescription.trim()) {
      toast.error('Please enter a description or booking reference.');
      return;
    }

    setIsSubmitting(true);
    try {
      await commissionApi.create({
        commissioner_name: commName || `${user?.first_name} ${user?.last_name}`,
        date: commDate,
        items: [
          {
            description: commDescription,
            destination: commDestination || undefined,
            amount: amount,
            quantity: 1,
          },
        ],
      } as any);

      toast.success(
        (t) => (
          <div className="flex items-center gap-2">
            <LuCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="font-bold text-xs">Commission Request Submitted!</p>
              <p className="text-[11px] text-gray-500">₱{amount.toLocaleString()} request recorded for Accounting review.</p>
            </div>
          </div>
        ),
        { duration: 4000 }
      );

      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      // Reset form
      setCommDescription('');
      setCommDestination('');
      setCommAmount('');
      setCommNotes('');
      closeQuickRequest();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit commission request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeQuickRequest}
      />

      {/* Right Slide-Over Modal Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out">
          
          {/* Modal Header */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                {tab === 'cash_budget' ? <LuWallet className="h-5 w-5" /> : <LuSignature className="h-5 w-5" />}
              </span>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  Quick Request Portal
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  Submit requests directly to Accounting & Operations
                </p>
              </div>
            </div>
            <button
              onClick={closeQuickRequest}
              className="rounded-xl p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition cursor-pointer"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="p-3 bg-gray-100/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700/60 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTab('cash_budget')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                tab === 'cash_budget'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <LuWallet className="w-4 h-4" />
              Cash Budget
            </button>

            <button
              type="button"
              onClick={() => setTab('commission')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                tab === 'commission'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <LuSignature className="w-4 h-4" />
              Commission
            </button>
          </div>

          {/* Form Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {tab === 'cash_budget' ? (
              <form id="quick-cb-form" onSubmit={handleCashBudgetSubmit} className="space-y-4">
                <div className="rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 p-3 border border-orange-100 dark:border-orange-900/40">
                  <p className="text-[11px] font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                    <LuCoins className="w-4 h-4 text-orange-500 shrink-0" />
                    Request cash advances for trip fuel, meals, tollways, or operational funds.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Date Required *
                  </label>
                  <div className="relative">
                    <LuCalendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={cbDate}
                      onChange={(e) => setCbDate(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Total Amount Requested (₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-gray-400">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cbTotalAmount}
                      onChange={(e) => setCbTotalAmount(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Destination / Purpose
                  </label>
                  <div className="relative">
                    <LuMapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Manila - Baguio Express / Office Supplies / PMS"
                      value={cbDestination}
                      onChange={(e) => setCbDestination(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Assigned Vehicle Plate Number (Optional)
                  </label>
                  <div className="relative">
                    <LuBus className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. NAK-8899"
                      value={cbPlateNumber}
                      onChange={(e) => setCbPlateNumber(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Optional Expense Breakdown Toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCbBreakdown(!showCbBreakdown)}
                    className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showCbBreakdown ? <LuChevronUp className="w-4 h-4" /> : <LuChevronDown className="w-4 h-4" />}
                    {showCbBreakdown ? 'Hide Detailed Expense Breakdown' : '+ Add Itemized Expense Breakdown'}
                  </button>

                  {showCbBreakdown && (
                    <div className="mt-3 space-y-3">
                      {/* Interactive Fuel Autocalculator Box */}
                      <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                            ⛽ Diesel Fuel Autocalculator (KM ÷ 2.5)
                          </span>
                          {parseFloat(calcKm) > 0 && (
                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                              {(parseFloat(calcKm) / 2.5).toFixed(1)} Liters
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase block mb-0.5">Est. Kilometers (KM)</label>
                            <input
                              type="number"
                              placeholder="e.g. 240"
                              value={calcKm}
                              onChange={(e) => {
                                const km = e.target.value;
                                setCalcKm(km);
                                const kmNum = parseFloat(km) || 0;
                                const priceNum = parseFloat(calcDieselPrice) || 60;
                                const liters = Math.round((kmNum / 2.5) * 10) / 10;
                                const cost = Math.round(liters * priceNum);
                                setCbDiesel(kmNum > 0 ? String(cost) : '');
                              }}
                              className="w-full bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase block mb-0.5">Diesel Price (₱/L)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={calcDieselPrice}
                              onChange={(e) => {
                                const price = e.target.value;
                                setCalcDieselPrice(price);
                                const kmNum = parseFloat(calcKm) || 0;
                                const priceNum = parseFloat(price) || 0;
                                const liters = Math.round((kmNum / 2.5) * 10) / 10;
                                const cost = Math.round(liters * priceNum);
                                setCbDiesel(kmNum > 0 ? String(cost) : '');
                              }}
                              className="w-full bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase">Diesel Fuel (₱)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={cbDiesel}
                            onChange={(e) => setCbDiesel(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase">Meal Allowance (₱)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={cbMeals}
                            onChange={(e) => setCbMeals(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase">Tolls / RFID (₱)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={cbTolls}
                            onChange={(e) => setCbTolls(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-400 uppercase">SOP / Misc (₱)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={cbSop}
                            onChange={(e) => setCbSop(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <form id="quick-comm-form" onSubmit={handleCommissionSubmit} className="space-y-4">
                <div className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 p-3 border border-indigo-100 dark:border-indigo-900/40">
                  <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                    <LuSignature className="w-4 h-4 text-indigo-500 shrink-0" />
                    Submit sales or driver commission claims for Accounting approval & voucher release.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Claimant / Commissioner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={commName}
                    onChange={(e) => setCommName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Date *
                  </label>
                  <div className="relative">
                    <LuCalendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={commDate}
                      onChange={(e) => setCommDate(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Commission Amount (₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-gray-400">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={commAmount}
                      onChange={(e) => setCommAmount(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Booking Reference / Service Description *
                  </label>
                  <div className="relative">
                    <LuFileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sales Commission for Charter Order #104"
                      value={commDescription}
                      onChange={(e) => setCommDescription(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">
                    Destination / Route (Optional)
                  </label>
                  <div className="relative">
                    <LuMapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Tagaytay City Tour"
                      value={commDestination}
                      onChange={(e) => setCommDestination(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeQuickRequest}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              form={tab === 'cash_budget' ? 'quick-cb-form' : 'quick-comm-form'}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg transition cursor-pointer disabled:opacity-50 ${
                tab === 'cash_budget'
                  ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
              }`}
            >
              <LuSend className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : tab === 'cash_budget' ? 'Submit Budget Request' : 'Submit Commission Claim'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

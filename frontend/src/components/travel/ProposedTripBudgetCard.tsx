import { useState } from 'react';
import { LuCalculator, LuPlus, LuMinus, LuTrendingUp, LuTrendingDown, LuSparkles, LuInfo } from 'react-icons/lu';

export interface BudgetLineItem {
  label: string;
  amount: number;
  type: 'addition' | 'subtraction';
  category?: string;
}

interface ProposedTripBudgetCardProps {
  proposedBudget?: number;
  onProposedBudgetChange?: (newBudget: number) => void;
  basePrice?: number;
  additions?: BudgetLineItem[];
  subtractions?: BudgetLineItem[];
  taxAmount?: number;
  taxRate?: number;
  currencySymbol?: string;
  title?: string;
}

export default function ProposedTripBudgetCard({
  proposedBudget = 50000,
  onProposedBudgetChange,
  basePrice = 0,
  additions = [],
  subtractions = [],
  taxAmount = 0,
  taxRate = 0.12,
  currencySymbol = '₱',
  title = 'Proposed Trip Budget & Auto-Calculation Anchor',
}: ProposedTripBudgetCardProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState<string>(String(proposedBudget));

  const totalAdditions = additions.reduce((sum, item) => sum + Math.max(0, item.amount), 0) + (basePrice || 0) + (taxAmount || 0);
  const totalSubtractions = subtractions.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  const netTotal = Math.max(0, totalAdditions - totalSubtractions);
  const currentBudget = Number(budgetValue) || proposedBudget;
  const budgetVariance = currentBudget - netTotal;
  const isOverBudget = budgetVariance < 0;

  const handleBudgetSubmit = () => {
    setIsEditingBudget(false);
    const num = Math.max(0, Number(budgetValue) || 0);
    if (onProposedBudgetChange) {
      onProposedBudgetChange(num);
    }
  };

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
      
      {/* Card Header & Budget Anchor */}
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <LuCalculator className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h3>
            <p className="text-[11px] font-semibold text-gray-500">Live Auto-Calculations anchored against target trip budget</p>
          </div>
        </div>

        {/* Proposed Budget Anchor Input */}
        <div className="flex items-center gap-2 rounded-2xl bg-blue-50/60 p-2 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
          <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider pl-1">
            Target Budget:
          </span>
          {isEditingBudget ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-blue-600">{currencySymbol}</span>
              <input
                type="number"
                min="0"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                onBlur={handleBudgetSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleBudgetSubmit()}
                autoFocus
                className="w-24 rounded-xl border border-blue-300 bg-white px-2 py-1 text-xs font-black text-blue-900 dark:bg-gray-800 dark:text-white focus:outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingBudget(true)}
              className="rounded-xl bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-xs hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-300"
            >
              {currencySymbol}{currentBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </button>
          )}
        </div>
      </div>

      {/* Explicit Math Line Items (+ Additions / - Subtractions) */}
      <div className="mt-4 space-y-2.5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Calculation Breakdown</p>
        
        {/* Base Price Line */}
        {basePrice > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/40">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-[10px] font-black text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                +
              </span>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Base Trip Package Rate</span>
            </div>
            <span className="text-xs font-black text-gray-900 dark:text-white">
              {currencySymbol}{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Additions (+) List */}
        {additions.map((item, idx) => (
          <div key={`add-${idx}`} className="flex items-center justify-between rounded-xl bg-emerald-50/50 p-2.5 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-[10px] font-black text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                +
              </span>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{item.label}</span>
            </div>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
              +{currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}

        {/* Tax (+) Line */}
        {taxAmount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-indigo-50/50 p-2.5 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-[10px] font-black text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                +
              </span>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">VAT / Tax ({Math.round(taxRate * 100)}%)</span>
            </div>
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
              +{currencySymbol}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Subtractions (-) List */}
        {subtractions.map((item, idx) => (
          <div key={`sub-${idx}`} className="flex items-center justify-between rounded-xl bg-amber-50/60 p-2.5 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-[10px] font-black text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                -
              </span>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">{item.label}</span>
            </div>
            <span className="text-xs font-black text-amber-700 dark:text-amber-300">
              -{currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      {/* Net Summary & Budget Variance Footer */}
      <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800 space-y-2">
        
        {/* Net Total Line */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
            Net Package Total:
          </span>
          <span className="text-base font-black text-blue-600 dark:text-blue-400">
            {currencySymbol}{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Budget Variance Badge */}
        <div className={`flex items-center justify-between rounded-2xl p-3 text-xs font-bold ${
          isOverBudget
            ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {isOverBudget ? <LuTrendingUp className="h-4 w-4 text-rose-600" /> : <LuTrendingDown className="h-4 w-4 text-emerald-600" />}
            <span>
              {isOverBudget ? 'Budget Exceeded By' : 'Under Proposed Budget By'}
            </span>
          </div>
          <span className="font-black text-sm">
            {currencySymbol}{Math.abs(budgetVariance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

      </div>

    </div>
  );
}

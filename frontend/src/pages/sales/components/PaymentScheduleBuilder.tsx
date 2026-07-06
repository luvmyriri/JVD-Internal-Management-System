import { useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';

export interface PaymentSchedulePlan {
  mode: 'auto' | 'manual';
  count?: number;
  first_due_date?: string;
  interval_days?: number;
  rows?: { due_date: string; amount_due: number }[];
}

interface PaymentScheduleBuilderProps {
  totalAmount: number;
  onChange: (plan: PaymentSchedulePlan | null) => void;
}

/** Lets staff choose an auto-generated even-split installment plan, or enter manual due-date/amount rows. */
export default function PaymentScheduleBuilder({ totalAmount, onChange }: PaymentScheduleBuilderProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [count, setCount] = useState(3);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [intervalDays, setIntervalDays] = useState(30);
  const [rows, setRows] = useState<{ due_date: string; amount_due: number }[]>([]);

  const emit = (next: Partial<{ mode: 'auto' | 'manual'; count: number; firstDueDate: string; intervalDays: number; rows: typeof rows }>) => {
    const m = next.mode ?? mode;
    const c = next.count ?? count;
    const fdd = next.firstDueDate ?? firstDueDate;
    const id = next.intervalDays ?? intervalDays;
    const r = next.rows ?? rows;

    if (m === 'auto') {
      onChange(fdd ? { mode: 'auto', count: c, first_due_date: fdd, interval_days: id } : null);
    } else {
      onChange(r.length > 0 ? { mode: 'manual', rows: r } : null);
    }
  };

  const rowsTotal = rows.reduce((sum, r) => sum + (Number(r.amount_due) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['auto', 'manual'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); emit({ mode: m }); }}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
            }`}
          >
            {m === 'auto' ? 'Auto-Split' : 'Manual Rows'}
          </button>
        ))}
      </div>

      {mode === 'auto' ? (
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min={1}
            placeholder="# Installments"
            value={count}
            onChange={(e) => { const v = Number(e.target.value) || 1; setCount(v); emit({ count: v }); }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
          />
          <input
            type="date"
            value={firstDueDate}
            onChange={(e) => { setFirstDueDate(e.target.value); emit({ firstDueDate: e.target.value }); }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
          />
          <input
            type="number"
            min={1}
            placeholder="Days Apart"
            value={intervalDays}
            onChange={(e) => { const v = Number(e.target.value) || 1; setIntervalDays(v); emit({ intervalDays: v }); }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="date"
                value={row.due_date}
                onChange={(e) => { const next = rows.map((r, idx) => idx === i ? { ...r, due_date: e.target.value } : r); setRows(next); emit({ rows: next }); }}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
              />
              <input
                type="number"
                placeholder="Amount"
                value={row.amount_due || ''}
                onChange={(e) => { const next = rows.map((r, idx) => idx === i ? { ...r, amount_due: Number(e.target.value) || 0 } : r); setRows(next); emit({ rows: next }); }}
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
              />
              <button type="button" onClick={() => { const next = rows.filter((_, idx) => idx !== i); setRows(next); emit({ rows: next }); }} className="text-gray-300 hover:text-rose-500">
                <LuTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => { const next = [...rows, { due_date: '', amount_due: 0 }]; setRows(next); emit({ rows: next }); }}
            className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest"
          >
            <LuPlus className="w-3 h-3" /> Add Installment
          </button>
          <p className={`text-[10px] font-black uppercase tracking-widest ${rowsTotal === totalAmount ? 'text-emerald-500' : 'text-amber-500'}`}>
            Total: ₱{rowsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} of ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );
}

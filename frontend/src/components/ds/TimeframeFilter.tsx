import { useState } from 'react';
import { cn } from '../../utils';

/**
 * Reusable timeframe filter — quick presets (This Week / Month / Year) plus a
 * custom range. Emits inclusive `yyyy-mm-dd` strings. Designed to drop into an
 * existing filter row without disturbing a page's other (designed) controls;
 * pair it with server date params (date_from/date_to) or client-side filtering.
 */
export type DateRangeValue = { from: string; to: string };
type Preset = 'all' | 'week' | 'month' | 'year' | 'custom';

const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TimeframeFilter({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  className?: string;
}) {
  const [preset, setPreset] = useState<Preset>('all');

  const apply = (p: Preset) => {
    setPreset(p);
    if (p === 'all') return onChange({ from: '', to: '' });
    const now = new Date();
    if (p === 'week') { const s = startOfWeek(now); return onChange({ from: iso(s), to: iso(addDays(s, 6)) }); }
    if (p === 'month') return onChange({ from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) });
    if (p === 'year') return onChange({ from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(new Date(now.getFullYear(), 11, 31)) });
  };

  const presets: Array<[Preset, string]> = [['all', 'All'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];
  const dateInputCls =
    'rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-[11px] font-semibold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-600/5';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex bg-gray-50 dark:bg-gray-800/70 p-1 rounded-full border border-gray-100/50 dark:border-gray-700/30">
        {presets.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => apply(key)}
            className={cn(
              'px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all',
              preset === key ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        type="date"
        aria-label="From date"
        value={value.from}
        onChange={(e) => { setPreset('custom'); onChange({ from: e.target.value, to: value.to }); }}
        className={dateInputCls}
      />
      <span className="text-[11px] font-bold text-gray-400">to</span>
      <input
        type="date"
        aria-label="To date"
        value={value.to}
        onChange={(e) => { setPreset('custom'); onChange({ from: value.from, to: e.target.value }); }}
        className={dateInputCls}
      />
    </div>
  );
}

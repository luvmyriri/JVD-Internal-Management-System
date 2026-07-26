import { useMemo } from 'react';
import { LuPlus, LuMinus, LuPencil, LuCircleCheck, LuCircleHelp } from 'react-icons/lu';
import { useTheme } from '../../context/ThemeContext';


interface Props {
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
}

interface DiffItem {
  key: string;
  label: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue: any;
  newValue: any;
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'Yes (true)' : 'No (false)';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  const str = String(val);
  // Currency-like numeric strings
  if (/^\d+(\.\d{1,2})?$/.test(str) && !isNaN(Number(str)) && Number(str) > 100) {
    const num = Number(str);
    if (num > 1000) return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  return str;
}

function formatKeyLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function AuditLogDiffViewer({ oldValues, newValues }: Props) {
  const { theme } = useTheme();

  const diffs = useMemo(() => {
    const oldObj = oldValues ?? {};
    const newObj = newValues ?? {};

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    const items: DiffItem[] = [];

    for (const key of allKeys) {
      // Ignore internal/meta fields if any
      if (['_token', 'password', 'remember_token'].includes(key)) continue;

      const hasOld = Object.prototype.hasOwnProperty.call(oldObj, key);
      const hasNew = Object.prototype.hasOwnProperty.call(newObj, key);

      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (hasOld && hasNew) {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          items.push({
            key,
            label: formatKeyLabel(key),
            type: 'modified',
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      } else if (hasNew) {
        items.push({
          key,
          label: formatKeyLabel(key),
          type: 'added',
          oldValue: null,
          newValue: newVal,
        });
      } else if (hasOld) {
        items.push({
          key,
          label: formatKeyLabel(key),
          type: 'removed',
          oldValue: oldVal,
          newValue: null,
        });
      }
    }

    return items;
  }, [oldValues, newValues]);

  if (diffs.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        <LuCircleCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">No attribute state changes detected</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">The request was executed without altering record fields.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1 font-medium">
        <span>Showing {diffs.length} field delta{diffs.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Added
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Modified
          </span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Removed
          </span>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden divide-y ${
        theme === 'dark' ? 'border-gray-800 divide-gray-800 bg-gray-900' : 'border-gray-100 divide-gray-100 bg-white'
      }`}>
        {diffs.map((diff) => (
          <div key={diff.key} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-[160px]">
              {diff.type === 'modified' && (
                <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/50">
                  <LuPencil size={12} />
                </div>
              )}
              {diff.type === 'added' && (
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-900/50">
                  <LuPlus size={12} />
                </div>
              )}
              {diff.type === 'removed' && (
                <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/50">
                  <LuMinus size={12} />
                </div>
              )}
              <div>
                <p className="font-bold text-gray-800 dark:text-white leading-tight">{diff.label}</p>
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter">{diff.key}</p>
              </div>
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2 justify-start sm:justify-end text-xs font-mono">
              {diff.type === 'modified' && (
                <>
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 line-through truncate max-w-[200px]" title={formatValue(diff.oldValue)}>
                    {formatValue(diff.oldValue)}
                  </span>
                  <span className="text-gray-400 font-sans">→</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/50 truncate max-w-[240px]" title={formatValue(diff.newValue)}>
                    {formatValue(diff.newValue)}
                  </span>
                </>
              )}

              {diff.type === 'added' && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/50 truncate max-w-[300px]" title={formatValue(diff.newValue)}>
                  + {formatValue(diff.newValue)}
                </span>
              )}

              {diff.type === 'removed' && (
                <span className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-medium border border-red-200 dark:border-red-900/50 line-through truncate max-w-[300px]" title={formatValue(diff.oldValue)}>
                  - {formatValue(diff.oldValue)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

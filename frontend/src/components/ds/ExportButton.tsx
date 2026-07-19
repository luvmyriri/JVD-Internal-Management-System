import { Download, Loader2 } from 'lucide-react';
import { cn } from '../../utils';

/** Pill-styled "Export CSV" button, matching the accounting/procurement filter rows. */
export default function ExportButton({
  onClick,
  disabled,
  loading,
  label = 'Export CSV',
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all',
        className,
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {label}
    </button>
  );
}

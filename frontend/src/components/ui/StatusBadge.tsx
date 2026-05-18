import { cn } from '../../utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

const variantClasses = {
  success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 shadow-sm shadow-emerald-100 dark:shadow-none',
  warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 shadow-sm shadow-amber-100 dark:shadow-none',
  danger: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20 shadow-sm shadow-red-100 dark:shadow-none',
  info: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 shadow-sm shadow-blue-100 dark:shadow-none',
  neutral: 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 shadow-sm shadow-gray-100 dark:shadow-none',
};

export default function StatusBadge({ status, variant = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105',
        variantClasses[variant],
        className
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full mr-2", {
        'bg-emerald-500': variant === 'success',
        'bg-amber-500': variant === 'warning',
        'bg-red-500': variant === 'danger',
        'bg-blue-500': variant === 'info',
        'bg-gray-500': variant === 'neutral',
      })} />
      {status}
    </span>
  );
}

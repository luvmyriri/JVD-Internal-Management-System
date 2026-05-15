import { cn } from '../../utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100',
  danger: 'bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100',
  info: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100',
  neutral: 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm shadow-gray-100',
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

import { cn } from '../../utils';
import { LuLoaderCircle } from 'react-icons/lu';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50',
  secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200/50',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200/50',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-900',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-[10px] font-black uppercase tracking-widest',
  md: 'px-6 py-2.5 text-sm font-bold',
  lg: 'px-8 py-3.5 text-base font-black tracking-tight',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10',
        variantClasses[variant],
        size === 'sm' ? 'rounded-xl' : size === 'lg' ? 'rounded-[1.5rem]' : 'rounded-2xl',
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <LuLoaderCircle className="animate-spin" size={size === 'sm' ? 14 : 18} />
      )}
      {children}
    </button>
  );
}

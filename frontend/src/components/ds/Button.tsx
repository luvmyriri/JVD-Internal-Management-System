import { cn } from '../../utils';
import { LoaderCircle } from 'lucide-react';

/**
 * Design-system button (roadmap 3.2). Token-based, sentence-case, medium weight.
 * Per DESIGN_DIRECTION: one `primary` (near-black) per view; everything else is
 * secondary/ghost; `brand` (blue) is the occasional accent CTA; `danger` for
 * destructive actions. Must render under a `.jvd` root.
 */
export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary-hover',
  brand: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'bg-surface text-ink border border-border hover:bg-surface-muted',
  ghost: 'bg-transparent text-muted hover:bg-surface-muted hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export default function Button({
  variant = 'secondary',
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
        'inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium',
        'transition-colors duration-150 active:scale-[0.98] focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoaderCircle className="animate-spin" size={16} aria-hidden />}
      {children}
    </button>
  );
}

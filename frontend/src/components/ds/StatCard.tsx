import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils';

/**
 * Dashboard stat card. Big number + muted label, optional trend delta.
 * Uses vibrant gradient backgrounds and glassmorphic icons.
 */
interface StatCardProps {
  label: string;
  value: ReactNode;
  /** small muted unit/context under the value, e.g. "Total" */
  unit?: string;
  icon?: ReactNode;
  /** signed percentage/number; positive → green up, negative → red down */
  delta?: number;
  deltaSuffix?: string;
  onViewAll?: () => void;
  className?: string;
  /** Color theme for the gradient background. Defaults to neutral for backwards compatibility. */
  variant?: 'blue' | 'amber' | 'violet' | 'emerald' | 'rose' | 'neutral';
}

const variantStyles = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-300/30 dark:shadow-blue-900/30',
  amber: 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-amber-300/30 dark:shadow-amber-900/30',
  violet: 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-violet-300/30 dark:shadow-violet-900/30',
  emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-300/30 dark:shadow-emerald-900/30',
  rose: 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-300/30 dark:shadow-rose-900/30',
  // Fallback for places that don't specify a variant
  neutral: 'bg-surface border border-border text-ink shadow-sm',
};

export default function StatCard({ label, value, unit, icon, delta, deltaSuffix = '%', onViewAll, className, variant = 'neutral' }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  const isColorful = variant !== 'neutral';

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:scale-[1.01] transition-all cursor-default min-h-[110px]',
      variantStyles[variant],
      className
    )}>
      {/* Decorative circle in the corner for colorful variants */}
      {isColorful && <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />}
      
      <div className="flex items-start justify-between relative z-10">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          isColorful ? "bg-white/20 backdrop-blur-sm group-hover:bg-white/30 text-white" : "bg-surface-muted text-muted"
        )}>
          {icon}
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[8px] font-black shadow-sm uppercase tracking-wider",
          isColorful ? "bg-white/25 text-white flex items-center gap-0.5" : "bg-surface-muted text-muted border border-border"
        )}>
          {label}
        </div>
      </div>

      <div className="flex items-end justify-between mt-3 relative z-10">
        <div>
          {unit && <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", isColorful ? "opacity-70 text-white" : "text-muted")}>{unit}</p>}
          <p className="text-3xl font-black leading-none">{value}</p>
        </div>
      </div>

      {(delta !== undefined || onViewAll) && (
        <div className="mt-4 flex items-center justify-between relative z-10">
          {delta !== undefined ? (
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium', isColorful ? 'text-white/90' : (up ? 'text-success' : 'text-danger'))}>
              {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(delta)}{deltaSuffix}
            </span>
          ) : <span />}
          {onViewAll && (
            <button onClick={onViewAll} className={cn("text-xs font-medium transition-opacity hover:opacity-80", isColorful ? "text-white underline decoration-white/30 underline-offset-2" : "text-brand")}>
              View all ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}

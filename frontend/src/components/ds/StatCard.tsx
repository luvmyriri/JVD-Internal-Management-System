import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils';

/**
 * Dashboard stat card (roadmap 3.2 #9 / DESIGN_DIRECTION §1.4). Big number + muted label,
 * optional trend delta (green up / red down) and a "View all ›" link. Border, not shadow —
 * it rests on the canvas. Compose several in a grid for dashboard headers. Under `.jvd`.
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
}

export default function StatCard({ label, value, unit, icon, delta, deltaSuffix = '%', onViewAll, className }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className={cn('rounded-[var(--radius-card)] border border-border bg-surface p-5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold leading-none text-ink">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {delta !== undefined ? (
          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', up ? 'text-success' : 'text-danger')}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(delta)}{deltaSuffix}
          </span>
        ) : <span />}
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs font-medium text-brand transition-opacity hover:opacity-80">
            View all ›
          </button>
        )}
      </div>
    </div>
  );
}

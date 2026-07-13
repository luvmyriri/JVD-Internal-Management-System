import type { ReactNode } from 'react';
import { cn } from '../../utils';

/**
 * List row card (roadmap 3.2 #4 / DESIGN_DIRECTION §2 #4 — the Design-2025 "applicants" pattern).
 * A white rounded row: optional leading avatar/icon, a title with an inline status pill, a muted
 * subtitle line (icon + text + date), and right-side actions (ghost buttons + kebab). For
 * record lists that read better as cards than a dense table — HR Applications, task lists,
 * approval queues. Compose several in a vertical stack. Renders under a `.jvd` root.
 */
interface ListRowProps {
  title: ReactNode;
  /** inline pill next to the title — pass a <StatusPill /> */
  status?: ReactNode;
  /** muted secondary line; put an icon + text here */
  subtitle?: ReactNode;
  /** far-right muted meta (e.g. a date) shown before the actions */
  meta?: ReactNode;
  /** leading avatar or icon block */
  leading?: ReactNode;
  /** right-side action buttons / kebab */
  actions?: ReactNode;
  onClick?: () => void;
  /** dim + de-emphasize (e.g. archived/inactive) */
  muted?: boolean;
  className?: string;
}

export default function ListRow({ title, status, subtitle, meta, leading, actions, onClick, muted, className }: ListRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3.5 transition-colors',
        onClick && 'cursor-pointer hover:bg-surface-muted',
        muted && 'opacity-60',
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{title}</span>
          {status}
        </div>
        {subtitle && <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">{subtitle}</div>}
      </div>

      {meta && <div className="shrink-0 text-xs text-muted">{meta}</div>}
      {actions && (
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}

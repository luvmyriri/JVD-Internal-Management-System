import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Play } from 'lucide-react';
import { cn } from '../../utils';

/**
 * Getting-started checklist (roadmap 3.2 #11 / DESIGN_DIRECTION §2 #11). Floating card:
 * collapsible title, checklist rows with filled-blue done circles, an optional "Watch
 * tutorial" ghost row, and a footer "N of M complete" + brand progress bar. Powers per-module
 * user onboarding (Phase 4.5). Purely presentational — the parent owns completion state.
 * Under `.jvd`.
 */
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  onClick?: () => void;
}
interface OnboardingChecklistProps {
  title?: string;
  items: ChecklistItem[];
  onWatchTutorial?: () => void;
  defaultCollapsed?: boolean;
  className?: string;
}

export default function OnboardingChecklist({
  title = 'Getting started',
  items,
  onWatchTutorial,
  defaultCollapsed = false,
  className,
}: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className={cn('w-[320px] max-w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[0_4px_100px_rgba(0,0,0,0.15)]', className)}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-ink">{title}</span>
        <ChevronDown size={16} className={cn('text-muted transition-transform', collapsed && '-rotate-90')} />
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <ul className="px-2 pb-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={item.onClick}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 text-left transition-colors hover:bg-surface-muted"
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        item.done ? 'border-brand bg-brand text-white' : 'border-border text-transparent',
                      )}
                    >
                      <Check size={12} />
                    </span>
                    <span className={cn('text-sm', item.done ? 'text-muted line-through' : 'text-ink')}>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            {onWatchTutorial && (
              <button
                onClick={onWatchTutorial}
                className="mx-2 mb-1 flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-2 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <Play size={14} /> Watch tutorial
              </button>
            )}

            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>{done} of {items.length} complete</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

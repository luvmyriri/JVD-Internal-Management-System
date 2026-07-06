import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LuSearch, LuCornerDownLeft } from 'react-icons/lu';
import { cn } from '../../utils';

/**
 * ⌘K command palette (roadmap 3.2 #2 / DESIGN_DIRECTION §2 #2) — "the single biggest
 * feels-professional win". Search-everything dialog over nav destinations, actions, and
 * entities. Filters as you type, arrow-key navigable, Enter runs, Esc closes. Register the
 * global ⌘K/Ctrl+K listener once with `useCommandPalette`, and render this at the app root.
 * Portaled + wrapped in `.jvd`.
 */
export interface Command {
  id: string;
  label: string;
  /** optional grouping heading, e.g. "Navigation", "Actions" */
  group?: string;
  icon?: ReactNode;
  /** extra text matched by the fuzzy filter but not shown */
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
}

/** Wire the global ⌘K / Ctrl+K shortcut. Returns [isOpen, open, close]. */
export function useCommandPalette(): [boolean, () => void, () => void] {
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return [isOpen, () => setOpen(true), () => setOpen(false)];
}

export default function CommandPalette({ isOpen, onClose, commands, placeholder = 'Search actions, pages, records…' }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group ?? ''} ${c.keywords ?? ''}`.toLowerCase().includes(q));
  }, [query, commands]);

  // Reset transient state each time the palette opens; focus the input.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) { onClose(); cmd.onSelect(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, filtered, active, onClose]);

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // Render group headings only when the group changes from the previous visible row.
  let lastGroup: string | undefined;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="jvd fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[0_4px_100px_rgba(0,0,0,0.15)]"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <LuSearch size={18} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent py-4 text-sm text-ink placeholder:text-muted focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted sm:block">ESC</kbd>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">No results for “{query}”.</p>
              ) : (
                filtered.map((cmd, idx) => {
                  const showGroup = cmd.group && cmd.group !== lastGroup;
                  lastGroup = cmd.group;
                  return (
                    <div key={cmd.id}>
                      {showGroup && (
                        <p className="px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">{cmd.group}</p>
                      )}
                      <button
                        data-idx={idx}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => { onClose(); cmd.onSelect(); }}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm',
                          idx === active ? 'bg-surface-muted text-ink' : 'text-ink',
                        )}
                      >
                        {cmd.icon && <span className="shrink-0 text-muted">{cmd.icon}</span>}
                        <span className="flex-1 truncate">{cmd.label}</span>
                        {idx === active && <LuCornerDownLeft size={14} className="shrink-0 text-muted" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuGlobe, LuLink, LuLock } from 'react-icons/lu';
import Button from './Button';
import { cn } from '../../utils';

/**
 * Share popover (roadmap 3.2 #8 / DESIGN_DIRECTION §2 #8). Invite input + role dropdown +
 * Invite button, a "General access" row, a people list with per-person role, and a footer
 * "Copy link" action. Anchored to its trigger; closes on outside-click / Esc. Backs portal-link
 * sharing and document sharing. Floating element → soft shadow. Under `.jvd`.
 */
export interface ShareMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatarUrl?: string;
}
export type GeneralAccess = 'restricted' | 'anyone';

interface SharePopoverProps {
  open: boolean;
  onClose: () => void;
  members?: ShareMember[];
  roles?: string[];
  generalAccess?: GeneralAccess;
  onGeneralAccessChange?: (a: GeneralAccess) => void;
  onInvite?: (email: string, role: string) => void;
  onChangeMemberRole?: (id: string, role: string) => void;
  onCopyLink?: () => void;
  /** anchor: render this inside a `relative` wrapper next to the trigger */
  className?: string;
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function SharePopover({
  open,
  onClose,
  members = [],
  roles = ['Viewer', 'Editor', 'Admin'],
  generalAccess = 'restricted',
  onGeneralAccessChange,
  onInvite,
  onChangeMemberRole,
  onCopyLink,
  className,
}: SharePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(roles[0]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose]);

  const selectCls =
    'rounded-[var(--radius-control)] border border-border bg-surface px-2 py-1.5 text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-label="Share"
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'jvd z-50 w-[360px] max-w-[92vw] rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[0_4px_100px_rgba(0,0,0,0.15)]',
            className,
          )}
        >
          <p className="mb-3 text-sm font-medium text-ink">Share access</p>

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) { onInvite?.(email.trim(), inviteRole); setEmail(''); }
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={selectCls}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <Button type="submit" variant="primary" size="sm">Invite</Button>
          </form>

          <button
            type="button"
            onClick={() => onGeneralAccessChange?.(generalAccess === 'anyone' ? 'restricted' : 'anyone')}
            className="mt-4 flex w-full items-center gap-3 rounded-[var(--radius-control)] px-1 py-2 text-left transition-colors hover:bg-surface-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-muted">
              {generalAccess === 'anyone' ? <LuGlobe size={16} /> : <LuLock size={16} />}
            </span>
            <span className="flex-1">
              <span className="block text-sm text-ink">{generalAccess === 'anyone' ? 'Anyone with the link' : 'Restricted'}</span>
              <span className="block text-xs text-muted">
                {generalAccess === 'anyone' ? 'Anyone with the link can view' : 'Only invited people can access'}
              </span>
            </span>
          </button>

          {members.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-1 py-1.5">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-xs font-medium text-brand">
                      {initials(m.name)}
                    </span>
                  )}
                  <span className="flex-1 truncate">
                    <span className="block truncate text-sm text-ink">{m.name}</span>
                    {m.email && <span className="block truncate text-xs text-muted">{m.email}</span>}
                  </span>
                  <select
                    value={m.role}
                    onChange={(e) => onChangeMemberRole?.(m.id, e.target.value)}
                    className={selectCls}
                  >
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted">Members can share with others</span>
            <Button variant="secondary" size="sm" onClick={onCopyLink}>
              <LuLink size={14} /> Copy link
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

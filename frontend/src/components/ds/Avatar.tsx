import { useState, type ReactNode } from 'react';
import { getAvatarUrl, getInitials } from '../../utils';
import { cn } from '../../utils';

/**
 * Profile picture with a graceful initials fallback (roadmap 3.7). Renders the person's
 * photo when available, otherwise a brand-tinted circle with their initials — never a broken
 * image icon (the old `<img src={getAvatarUrl(x) || ''}>` pattern showed one when the path was
 * empty). Optional online dot. Used anywhere a person is shown: DataTable name cells, the
 * messages UI, notifications, menus. Renders under a `.jvd` root for token colors.
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  /** raw avatar path/url (run through getAvatarUrl); null/undefined → initials */
  src?: string | null;
  /** full name or "First Last" — used for initials + alt text */
  name?: string;
  size?: AvatarSize;
  /** show a small online indicator dot */
  online?: boolean;
  className?: string;
}

const sizeCls: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-16 w-16 text-lg',
};
const dotCls: Record<AvatarSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-3.5 w-3.5',
};

function initialsFrom(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
  return getInitials(parts[0], parts[parts.length - 1]);
}

export default function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const url = getAvatarUrl(src ?? undefined);
  const showImg = url && !errored;

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {showImg ? (
        <img
          src={url}
          alt={name ?? ''}
          onError={() => setErrored(true)}
          className={cn('rounded-full border border-border object-cover', sizeCls[size])}
        />
      ) : (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-brand-tint font-medium text-brand',
            sizeCls[size],
          )}
          aria-label={name ?? 'avatar'}
        >
          {initialsFrom(name)}
        </span>
      )}
      {online && (
        <span
          className={cn(
            'absolute -bottom-0 -right-0 rounded-full border-2 border-surface bg-success',
            dotCls[size],
          )}
        />
      )}
    </span>
  );
}

/**
 * Avatar + name, inline. The standard way to render an employee/user in a table cell, list,
 * or menu so a face always sits beside the name. Optional secondary line (id, email, role).
 */
interface EmployeeNameProps {
  name: string;
  src?: string | null;
  subtitle?: ReactNode;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
}

export function EmployeeName({ name, src, subtitle, size = 'md', online, className }: EmployeeNameProps) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <Avatar src={src} name={name} size={size} online={online} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{name}</span>
        {subtitle != null && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
    </span>
  );
}

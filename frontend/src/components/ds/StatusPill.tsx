import { cn } from '../../utils';
import { statusTone, type Tone } from '../../constants/statusTones';

/**
 * The one status pill for the whole app (roadmap 3.2). Pass a raw `status` string and
 * it resolves to a semantic tone via constants/statusTones, or pass `tone` explicitly.
 * Renders a tinted pill; label is the status text in sentence case. Under a `.jvd` root.
 */
interface StatusPillProps {
  status?: string | null;
  tone?: Tone;
  label?: string;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  info: 'bg-brand-tint text-brand',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  neutral: 'bg-surface-muted text-muted',
};

function humanize(s: string): string {
  const t = s.replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export default function StatusPill({ status, tone, label, className }: StatusPillProps) {
  const resolved = tone ?? statusTone(status);
  const text = label ?? (status ? humanize(status) : '—');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium',
        toneClasses[resolved],
        className,
      )}
    >
      {text}
    </span>
  );
}

import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils';

/**
 * The single toast system (roadmap 3.2 #13 / DESIGN_DIRECTION §2.1). Built on
 * react-hot-toast, restyled to JVD tokens — this replaces the sweetalert2 success/error
 * popups (10 Swal.fire sites) and the untokenized default toasts. Use toasts ONLY to
 * report an outcome that needs no decision ("Invoice saved"); anything asking the user
 * a question is a ConfirmDialog/Modal, not a toast.
 *
 * Mount <JvdToaster /> once at the app root; fire with the `notify` helpers. Every toast
 * renders its own tokenized Surface via toast.custom, so tone is captured directly and the
 * Toaster carries `.jvd` (it portals to <body>) to pick up tokens and escape the legacy
 * black-text rule (see index.css).
 */

type ToastTone = 'success' | 'error' | 'warning' | 'info';

const toneStyle: Record<ToastTone, { icon: ReactNode; accent: string }> = {
  success: { icon: <CircleCheck size={18} />, accent: 'text-success' },
  error: { icon: <CircleX size={18} />, accent: 'text-danger' },
  warning: { icon: <TriangleAlert size={18} />, accent: 'text-warning' },
  info: { icon: <Info size={18} />, accent: 'text-brand' },
};

function Surface({ tone, message, onDismiss }: { tone: ToastTone; message: ReactNode; onDismiss: () => void }) {
  const s = toneStyle[tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="flex w-[340px] max-w-[90vw] items-start gap-3 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 shadow-[0_4px_100px_rgba(0,0,0,0.15)]"
    >
      <span className={cn('mt-0.5 shrink-0', s.accent)}>{s.icon}</span>
      <div className="flex-1 text-sm text-ink">{message}</div>
      <button onClick={onDismiss} className="mt-0.5 shrink-0 text-muted transition-colors hover:text-ink" aria-label="Dismiss">
        <X size={15} />
      </button>
    </motion.div>
  );
}

/** Mount once at the app root (portaled, carries `.jvd` for token resolution). */
export function JvdToaster() {
  return <Toaster position="top-right" containerClassName="jvd" gutter={10} />;
}

function fire(tone: ToastTone, message: ReactNode) {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && <Surface tone={tone} message={message} onDismiss={() => toast.dismiss(t.id)} />}
      </AnimatePresence>
    ),
    { duration: tone === 'error' ? 6000 : 4000 },
  );
}

/** Fire a tokenized toast. Prefer these over raw `toast(...)` so tone styling stays consistent. */
export const notify = {
  success: (message: ReactNode) => fire('success', message),
  error: (message: ReactNode) => fire('error', message),
  warning: (message: ReactNode) => fire('warning', message),
  info: (message: ReactNode) => fire('info', message),
  dismiss: (id?: string) => toast.dismiss(id),
};

import { motion } from 'framer-motion';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

const toneStyle: Record<ToastTone, { icon: ReactNode; accent: string }> = {
  success: { icon: <CircleCheck size={18} />, accent: 'text-success' },
  error: { icon: <CircleX size={18} />, accent: 'text-danger' },
  warning: { icon: <TriangleAlert size={18} />, accent: 'text-warning' },
  info: { icon: <Info size={18} />, accent: 'text-brand' },
};

export default function ToastSurface({ tone, message, onDismiss }: { tone: ToastTone; message: ReactNode; onDismiss: () => void }) {
  const style = toneStyle[tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="flex w-[340px] max-w-[90vw] items-start gap-3 rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 shadow-[0_4px_100px_rgba(0,0,0,0.15)]"
    >
      <span className={cn('mt-0.5 shrink-0', style.accent)}>{style.icon}</span>
      <div className="flex-1 text-sm text-ink">{message}</div>
      <button onClick={onDismiss} className="mt-0.5 shrink-0 text-muted transition-colors hover:text-ink" aria-label="Dismiss">
        <X size={15} />
      </button>
    </motion.div>
  );
}

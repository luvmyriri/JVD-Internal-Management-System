import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import Button from './Button';

/**
 * Small centered confirm dialog (roadmap 3.2 / DESIGN_DIRECTION §2.1). For exactly ONE
 * irreversible yes/no decision ("Delete this supplier?") — title + one sentence + Cancel
 * (ghost) and an action button (danger red when destructive). This retires the sweetalert2
 * confirm popups (Swal.fire with showCancelButton). NOT for forms, multi-choice, or info
 * dumps — those are a Modal or a page. Portaled + wrapped in `.jvd`.
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** red action button for destructive actions */
  destructive?: boolean;
  /** disable interaction + show spinner while the action runs */
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isLoading && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="jvd fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !isLoading && onClose()}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-[400px] rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[0_4px_100px_rgba(0,0,0,0.15)]"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-start gap-3">
              {destructive && (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-tint text-danger">
                  <TriangleAlert size={18} />
                </span>
              )}
              <div className="flex-1">
                <h2 className="text-base font-medium text-ink">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>{cancelLabel}</Button>
              <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

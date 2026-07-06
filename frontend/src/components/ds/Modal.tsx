import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils';

/**
 * Centered modal (roadmap 3.2 / DESIGN_DIRECTION §2.1). For creating/completing ONE
 * small thing or a wizard step — NOT record detail (use Drawer) or complex forms (use a
 * page). Sticky header + footer, scrollable body, max-h 85vh so content never overflows.
 * Esc + overlay-click to close, body scroll-locked. Portaled + wrapped in `.jvd`.
 */
export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** block Esc/overlay close (e.g. mid-destructive-action) */
  dismissible?: boolean;
}

const widths: Record<ModalSize, string> = { sm: 'max-w-[400px]', md: 'max-w-[480px]', lg: 'max-w-[560px]' };

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', dismissible = true }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissible && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, dismissible, onClose]);

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
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[0_4px_100px_rgba(0,0,0,0.15)]',
              widths[size],
            )}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-medium text-ink">{title}</h2>
                <button onClick={onClose} className="text-muted transition-colors hover:text-ink" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

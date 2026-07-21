import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils';

/**
 * Right-side drawer (roadmap 3.2 / DESIGN_DIRECTION §2.1). For viewing/acting on an
 * EXISTING record without leaving the list — record detail, approval + workflow timeline,
 * activity history, filters. Slides from the right (left edge is the nav). The
 * "Proposal Activity" Figma pattern. Esc + overlay-click to close, scroll-locked,
 * portaled + wrapped in `.jvd`.
 */
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export default function Drawer({ isOpen, onClose, title, children, footer, width = 440 }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="jvd fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            style={{ width }}
            className={cn(
              'absolute right-0 top-0 flex h-full max-w-[90vw] flex-col border-l border-border bg-surface shadow-[0_4px_100px_rgba(0,0,0,0.15)]',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
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

import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import ToastSurface, { type ToastTone } from './ToastSurface';

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

function fire(tone: ToastTone, message: ReactNode) {
  return toast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && <ToastSurface tone={tone} message={message} onDismiss={() => toast.dismiss(t.id)} />}
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

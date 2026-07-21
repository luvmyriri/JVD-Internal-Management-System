import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';
import Button from './Button';

/**
 * Imperative bridges over the declarative ds overlays (roadmap 3.3 / DESIGN_DIRECTION §2.1).
 * `Swal.fire(...)` was imperative (`await` returns a result), so a straight swap to a
 * declarative <ConfirmDialog> would mean threading open-state through every handler. These
 * promise-based helpers mount a tokenized ConfirmDialog / Modal into a transient portal host
 * and resolve on the user's choice, so a confirm becomes `if (!(await confirm({...}))) return;`
 * — a mechanical replacement for the sweetalert2 call sites, and the standard way pages ask a
 * one-off question without wiring local state.
 */

/** Mount `element` under a throwaway host, returning a cleanup that unmounts after the exit anim. */
function mountTransient(render: (cleanup: () => void) => ReactNode) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const cleanup = () => {
    // Let the overlay play its exit animation before tearing down the root.
    window.setTimeout(() => {
      root.unmount();
      host.remove();
    }, 260);
  };
  root.render(render(cleanup));
}

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/** Ask one irreversible yes/no. Resolves true if confirmed, false otherwise. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    mountTransient((cleanup) => {
      function Wrapper() {
        const [open, setOpen] = useState(true);
        const finish = (result: boolean) => {
          setOpen(false);
          resolve(result);
          cleanup();
        };
        return (
          <ConfirmDialog
            isOpen={open}
            onClose={() => finish(false)}
            onConfirm={() => finish(true)}
            title={options.title}
            description={options.description}
            confirmLabel={options.confirmLabel}
            cancelLabel={options.cancelLabel}
            destructive={options.destructive}
          />
        );
      }
      return <Wrapper />;
    });
  });
}

export interface PromptOptions {
  title: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** the submit button is destructive-red (e.g. "Reject") */
  destructive?: boolean;
  /** require a non-empty value to enable submit */
  required?: boolean;
}

/** Ask for one line of text. Resolves the string if submitted, or null if cancelled. */
export function promptText(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    mountTransient((cleanup) => {
      function Wrapper() {
        const [open, setOpen] = useState(true);
        const [value, setValue] = useState(options.defaultValue ?? '');
        const finish = (result: string | null) => {
          setOpen(false);
          resolve(result);
          cleanup();
        };
        const submit = () => {
          if (options.required && !value.trim()) return;
          finish(value);
        };
        return (
          <Modal
            isOpen={open}
            onClose={() => finish(null)}
            size="sm"
            title={options.title}
            footer={
              <>
                <Button variant="ghost" onClick={() => finish(null)}>{options.cancelLabel ?? 'Cancel'}</Button>
                <Button variant={options.destructive ? 'danger' : 'primary'} onClick={submit}>
                  {options.confirmLabel ?? 'Submit'}
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              {options.description && <p className="text-sm text-muted">{options.description}</p>}
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder={options.placeholder}
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              />
            </div>
          </Modal>
        );
      }
      return <Wrapper />;
    });
  });
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuTriangleAlert, LuCircleCheck, LuCircleX } from 'react-icons/lu';

type DialogVariant = 'warning' | 'success' | 'error';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  /** If true, only shows a single dismiss button (for success/error alerts) */
  alert?: boolean;
}

const variantConfig: Record<DialogVariant, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  confirmBg: string;
  confirmHover: string;
  shadow: string;
}> = {
  warning: {
    icon: LuTriangleAlert,
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-500',
    confirmBg: 'bg-rose-600',
    confirmHover: 'hover:bg-rose-700',
    shadow: 'shadow-rose-600/20',
  },
  success: {
    icon: LuCircleCheck,
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    confirmBg: 'bg-emerald-600',
    confirmHover: 'hover:bg-emerald-700',
    shadow: 'shadow-emerald-600/20',
  },
  error: {
    icon: LuCircleX,
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
    iconColor: 'text-rose-500',
    confirmBg: 'bg-rose-600',
    confirmHover: 'hover:bg-rose-700',
    shadow: 'shadow-rose-600/20',
  },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  alert = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-8 text-center">
              {/* Icon */}
              <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                <Icon className={`w-8 h-8 ${config.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mb-2">
                {title}
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex gap-3">
              {alert ? (
                <button
                  onClick={onClose}
                  className={`flex-1 py-3.5 ${config.confirmBg} ${config.confirmHover} text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg ${config.shadow} transition-all active:scale-95`}
                >
                  OK
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                      onConfirm?.();
                      onClose();
                    }}
                    className={`flex-1 py-3.5 ${config.confirmBg} ${config.confirmHover} text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg ${config.shadow} transition-all active:scale-95`}
                  >
                    {confirmText}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

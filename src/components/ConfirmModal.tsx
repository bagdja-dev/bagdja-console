'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: ReactNode;
    bg: string;
    border: string;
    accent: string;
    confirmBtn: string;
  }
> = {
  danger: {
    icon: <Trash2 className="h-8 w-8 text-red-400" />,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    accent: 'bg-red-500',
    confirmBtn:
      'bg-red-500 hover:bg-red-600 shadow-red-500/25 focus-visible:ring-red-500/50',
  },
  warning: {
    icon: <AlertTriangle className="h-8 w-8 text-amber-400" />,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    accent: 'bg-amber-500',
    confirmBtn:
      'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25 focus-visible:ring-amber-500/50',
  },
  primary: {
    icon: <AlertTriangle className="h-8 w-8 text-[var(--action-primary)]" />,
    bg: 'bg-[var(--action-primary)]/10',
    border: 'border-[var(--action-primary)]/20',
    accent: 'bg-[var(--action-primary)]',
    confirmBtn:
      'bg-[var(--action-primary)] hover:bg-[var(--action-primary-hover)] shadow-[var(--action-primary)]/25',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  const config = variantConfig[variant];

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleConfirm = () => {
    void onConfirm();
  };

  return (
    <div
      className={[
        'fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      <div
        className={[
          'relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 transform',
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4',
        ].join(' ')}
      >
        <div className={`h-1.5 w-full ${config.accent}`} />

        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-full transition-all disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8 pt-10">
          <div className="flex flex-col items-center text-center">
            <div
              className={`p-4 rounded-2xl ${config.bg} ${config.border} border mb-6`}
            >
              {config.icon}
            </div>

            <h3
              id="confirm-modal-title"
              className="text-xl font-bold text-[var(--text-primary)] mb-2"
            >
              {title}
            </h3>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {message}
            </p>

            {detail ? (
              <p className="mt-3 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)] px-4 py-3 text-xs font-mono text-[var(--text-primary)]">
                {detail}
              </p>
            ) : null}

            <p className="mt-4 text-xs text-[var(--text-muted)]">
              This action cannot be undone.
            </p>

            <div className="mt-8 grid w-full grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="py-3 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)] text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={[
                  'py-3 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2',
                  config.confirmBtn,
                ].join(' ')}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

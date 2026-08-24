'use client';

import { useEffect, useState } from 'react';
import { X, ShieldOff, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/ui/button';
import type { EscrowDetail } from '@/lib/escrow-disputes-api';

export type DisputeAction = 'unfreeze' | 'release' | 'refund';

/**
 * Order Handling Phase 2 (plan/website-builder/order-hanlde-plan.md, §2 D1)
 * — 3 aksi yang bisa diambil app owner atas escrow yang sedang DISPUTED:
 *
 * - `unfreeze`: netral, escrow balik ke HELD, dana TIDAK ke mana-mana. Untuk
 *   "cabut status sengketa" tanpa memutuskan siapa yang benar.
 * - `release`: force release ke seller — dipakai kalau komplain buyer
 *   terbukti TIDAK VALID (mis. ada bukti pengiriman) tapi buyer menolak
 *   konfirmasi terima barang sendiri.
 * - `refund`: force refund ke buyer — dipakai kalau komplain buyer terbukti
 *   VALID tapi seller tidak/menolak refund lewat aksi mereka sendiri.
 *
 * Ketiganya butuh `note` WAJIB — jejak audit kenapa app owner turun tangan
 * memutuskan sepihak (lihat `UnfreezeEscrowDto`/`ReleaseMilestoneDto`/
 * `RefundEscrowDto` di bagdja-payment-service).
 */
const ACTION_CONFIG: Record<
  DisputeAction,
  {
    title: string;
    icon: typeof ShieldOff;
    iconClass: string;
    description: (escrow: EscrowDetail) => string;
    reasonLabel: string;
    placeholder: string;
    confirmLabel: string;
    processingLabel: string;
    buttonClass: string;
  }
> = {
  unfreeze: {
    title: 'Unfreeze Dispute',
    icon: ShieldOff,
    iconClass: 'text-amber-500',
    description: () =>
      "The escrow will go back to HELD — funds are NOT refunded to the buyer nor released to the seller. Use this to lift the dispute lock without deciding who's right.",
    reasonLabel: 'Reason for unfreezing',
    placeholder:
      'E.g. confirmed with the buyer via WhatsApp that the item was received; or the complaint is invalid because...',
    confirmLabel: 'Unfreeze Dispute',
    processingLabel: 'Processing…',
    buttonClass: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500/50',
  },
  release: {
    title: 'Force Release to Seller',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    description: (escrow) =>
      `This bypasses the buyer's own confirmation and immediately releases the held funds (${escrow.currency} ${Number(escrow.amount_held).toLocaleString('en-US')}) to the seller. Use only when the buyer's complaint is proven invalid.`,
    reasonLabel: 'Reason for force release',
    placeholder: 'E.g. delivery proof confirms the item was received; buyer refuses to confirm out of spite...',
    confirmLabel: 'Force Release',
    processingLabel: 'Releasing…',
    buttonClass: 'bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-500/50',
  },
  refund: {
    title: 'Force Refund to Buyer',
    icon: RotateCcw,
    iconClass: 'text-red-500',
    description: (escrow) =>
      `This bypasses the seller's own refund action and immediately returns the held funds (${escrow.currency} ${Number(escrow.amount_held).toLocaleString('en-US')}) to the buyer. Use only when the buyer's complaint is proven valid.`,
    reasonLabel: 'Reason for force refund',
    placeholder: 'E.g. item never arrived, tracking shows no delivery; seller unresponsive to the complaint...',
    confirmLabel: 'Force Refund',
    processingLabel: 'Refunding…',
    buttonClass: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500/50',
  },
};

export default function DisputeActionModal({
  isOpen,
  action,
  escrow,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  action: DisputeAction;
  escrow: EscrowDetail | null;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNote('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !escrow) return null;

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const handleSubmit = async () => {
    if (!note.trim()) {
      setError('A reason is required — it becomes the audit trail for this action.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(note.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} this escrow`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="m-4 w-full max-w-lg rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Icon className={`h-5 w-5 ${config.iconClass}`} />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{config.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-[var(--bg-hover)]"
            disabled={submitting}
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] px-4 py-3 text-sm">
            <p className="text-[var(--text-secondary)]">
              App: <span className="font-medium text-[var(--text-primary)]">{escrow.app_id}</span>
              {' · '}Escrow: <span className="font-mono text-xs">{escrow.id}</span>
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">{config.description(escrow)}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              {config.reasonLabel} <span className="text-[var(--brand-error)]">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={config.placeholder}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-main)] disabled:cursor-not-allowed disabled:opacity-50 ${config.buttonClass}`}
            >
              {submitting ? config.processingLabel : config.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

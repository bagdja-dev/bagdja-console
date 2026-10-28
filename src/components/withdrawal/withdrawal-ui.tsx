'use client';

import { useState } from 'react';
import { Banknote, FileText, Loader2, X } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import {
  getWithdrawalProofUrl,
  type WithdrawalOwnerType,
  type WithdrawalRequest,
} from '@/lib/payment-api';

/** Status final tidak bisa berubah lagi (plan §4.3). */
export const FINAL_WITHDRAWAL_STATUSES = ['PAID', 'FAILED', 'REJECTED', 'CANCELLED'];

export function isManualWithdrawal(row: Pick<WithdrawalRequest, 'provider'>): boolean {
  return (row.provider || 'manual').toLowerCase() === 'manual';
}

export function withdrawalCurrency(row: WithdrawalRequest, fallback?: string): string {
  return row.wallet?.currency_code || fallback || 'IDR';
}

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-emerald-500/10 text-emerald-500',
  PENDING: 'bg-amber-500/10 text-amber-500',
  PROCESSING: 'bg-blue-500/10 text-blue-500',
  REJECTED: 'bg-red-500/10 text-red-500',
  FAILED: 'bg-red-500/10 text-red-500',
  CANCELLED: 'bg-slate-500/10 text-slate-400',
};

/**
 * Label status yang ramah user (plan §5.2). Status internal tetap; PENDING
 * manual = menunggu verifikasi, PENDING/PROCESSING otomatis = sedang diproses.
 */
export function withdrawalStatusLabel(row: WithdrawalRequest): string {
  const status = (row.status || '').toUpperCase();
  switch (status) {
    case 'PENDING':
      return isManualWithdrawal(row) ? 'Menunggu verifikasi' : 'Sedang diproses';
    case 'PROCESSING':
      return 'Sedang diproses';
    case 'PAID':
    case 'COMPLETED':
      return 'Berhasil';
    case 'REJECTED':
      return 'Ditolak';
    case 'FAILED':
      return 'Gagal';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return status || 'Sedang diproses';
  }
}

export function WithdrawalStatusBadge({
  row,
  showInternal,
}: {
  row: WithdrawalRequest;
  /** Admin: tampilkan juga kode status internal. */
  showInternal?: boolean;
}) {
  const status = (row.status || '').toUpperCase();
  const style = STATUS_STYLES[status === 'COMPLETED' ? 'PAID' : status] || STATUS_STYLES.PROCESSING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {withdrawalStatusLabel(row)}
      {showInternal && <span className="font-mono text-[10px] opacity-70">({status})</span>}
    </span>
  );
}

const PROVIDER_STYLES: Record<string, { label: string; className: string }> = {
  manual: { label: 'Manual', className: 'border-sky-500/20 bg-sky-500/10 text-sky-500' },
  midtrans: { label: 'Midtrans', className: 'border-purple-500/20 bg-purple-500/10 text-purple-500' },
  duitku: { label: 'Duitku', className: 'border-orange-500/20 bg-orange-500/10 text-orange-500' },
};

/** Admin melihat nama engine; pemohon cukup Manual/Otomatis. */
export function WithdrawalChannelBadge({
  row,
  showEngine,
}: {
  row: WithdrawalRequest;
  showEngine?: boolean;
}) {
  const provider = (row.provider || 'manual').toLowerCase();
  const style = PROVIDER_STYLES[provider] || PROVIDER_STYLES.manual;
  const label = showEngine ? style.label : provider === 'manual' ? 'Manual' : 'Otomatis';
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style.className}`}>
        {label}
      </span>
      {row.method && <span className="text-[11px] font-mono text-[var(--text-secondary)]">{row.method}</span>}
    </div>
  );
}

export function WithdrawalAccountCell({ row }: { row: WithdrawalRequest }) {
  const bankName = row.bank_info?.bankName || row.method || 'Bank';
  const accountNum = row.bank_info?.accountIdentifier || '-';
  const holderName = row.bank_info?.accountHolderName || '';
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
        <Banknote className="h-4 w-4 text-orange-500" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {bankName} — <span className="font-mono text-xs">{accountNum}</span>
        </div>
        {holderName && <div className="text-xs text-[var(--text-secondary)] truncate">{holderName}</div>}
      </div>
    </div>
  );
}

/** Nominal ditarik, biaya, dan yang diterima rekening (biaya dipotong dari nominal). */
export function WithdrawalAmountCell({ row, currency }: { row: WithdrawalRequest; currency?: string }) {
  const cur = withdrawalCurrency(row, currency);
  const fee = Number(row.fee_amount || 0);
  const net = Number(row.net_amount ?? row.amount);
  return (
    <div className="text-right tabular-nums">
      <div className="font-semibold text-orange-500">-{formatMoney(Number(row.amount), cur)}</div>
      {fee > 0 && (
        <div className="text-[11px] text-[var(--text-secondary)]">
          biaya {formatMoney(fee, cur)} · diterima {formatMoney(net, cur)}
        </div>
      )}
    </div>
  );
}

type HistoryEntry = {
  status: string;
  note?: string;
  proof_url?: string;
  actor?: string;
  raw?: unknown;
  created_at: string;
};

/**
 * Detail withdrawal + timeline `status_history`. `isAdmin` menampilkan actor
 * dan respons mentah provider (hanya ada di respons admin).
 */
/**
 * Link bukti transfer (29 Okt 2026): bukti privat dibuka lewat presigned URL
 * yang diminta saat diklik (berlaku 10 menit), bukan URL tersimpan.
 */
function WithdrawalProofLink({
  withdrawalId,
  ownerType,
}: {
  withdrawalId: string;
  ownerType: WithdrawalOwnerType | 'all';
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openProof = async () => {
    try {
      setOpening(true);
      setError(null);
      const { url } = await getWithdrawalProofUrl(withdrawalId, ownerType);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError((err as { message?: string })?.message || 'Gagal membuka bukti transfer');
    } finally {
      setOpening(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={openProof}
        disabled={opening}
        className="inline-flex items-center gap-1 text-[var(--action-primary)] hover:underline disabled:opacity-60"
      >
        {opening ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
        Bukti transfer
      </button>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export function WithdrawalDetailModal({
  row,
  isAdmin,
  ownerType = 'organization',
  currency,
  onClose,
}: {
  row: WithdrawalRequest | null;
  isAdmin?: boolean;
  /** Konteks pemohon untuk akses bukti; admin selalu memakai `all`. */
  ownerType?: WithdrawalOwnerType;
  currency?: string;
  onClose: () => void;
}) {
  if (!row) return null;
  const hasProof = Boolean(row.has_proof || row.proof_url);
  const cur = withdrawalCurrency(row, currency);
  const history = (Array.isArray(row.status_history) ? row.status_history : []) as HistoryEntry[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Detail Penarikan</h3>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(row.id)}
              className="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Salin ID"
            >
              {row.id}
            </button>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <WithdrawalStatusBadge row={row} showInternal={isAdmin} />
            <WithdrawalChannelBadge row={row} showEngine={isAdmin} />
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-3">
            <div>
              <p className="text-[11px] text-[var(--text-secondary)]">Ditarik</p>
              <p className="font-semibold text-[var(--text-primary)]">{formatMoney(Number(row.amount), cur)}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-secondary)]">Biaya</p>
              <p className="font-semibold text-[var(--text-primary)]">{formatMoney(Number(row.fee_amount || 0), cur)}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-secondary)]">Diterima</p>
              <p className="font-semibold text-emerald-500">{formatMoney(Number(row.net_amount ?? row.amount), cur)}</p>
            </div>
          </div>

          <WithdrawalAccountCell row={row} />

          {row.rejection_reason && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-500">
              <strong>Alasan penolakan:</strong> {row.rejection_reason}. Dana sudah dikembalikan ke saldo.
            </div>
          )}

          {(row.provider_reference_id || hasProof) && (
            <div className="space-y-1 text-xs">
              {row.provider_reference_id && (
                <p className="text-[var(--text-secondary)]">
                  Referensi: <span className="font-mono text-[var(--text-primary)]">{row.provider_reference_id}</span>
                </p>
              )}
              {hasProof && (
                <WithdrawalProofLink withdrawalId={row.id} ownerType={isAdmin ? 'all' : ownerType} />
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Riwayat</p>
            <ol className="space-y-3 border-l border-[var(--border-default)] pl-4">
              {history.map((entry, index) => (
                <li key={`${entry.status}-${index}`} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--action-primary)]" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {entry.status}
                    <span className="ml-2 font-normal text-[var(--text-secondary)]">
                      {new Date(entry.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </p>
                  {entry.note && <p className="text-xs text-[var(--text-secondary)]">{entry.note}</p>}
                  {isAdmin && entry.actor && <p className="text-[11px] text-[var(--text-muted)]">oleh {entry.actor}</p>}
                  {isAdmin && entry.raw !== undefined && entry.raw !== null && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-[var(--text-muted)]">Respons provider</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-[var(--bg-main)] p-2 text-[10px] text-[var(--text-secondary)]">
                        {JSON.stringify(entry.raw, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {isAdmin && row.admin_notes && (
            <p className="text-xs text-[var(--text-secondary)]">
              <strong>Catatan:</strong> {row.admin_notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

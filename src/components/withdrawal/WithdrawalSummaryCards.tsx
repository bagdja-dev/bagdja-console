'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import {
  getWithdrawalSummary,
  type WithdrawalOwnerType,
  type WithdrawalSummary,
} from '@/lib/payment-api';

type WithdrawalSummaryCardsProps = {
  ownerType: WithdrawalOwnerType;
  currency: string;
  /** Ubah nilainya untuk memuat ulang (mis. setelah tarik dana / batal). */
  refreshKey?: unknown;
};

/**
 * Ringkasan withdrawal dompet (plan §5.2): dana yang sedang diproses — sudah
 * keluar dari saldo tersedia tapi belum sampai — dan total berhasil bulan ini.
 */
export default function WithdrawalSummaryCards({
  ownerType,
  currency,
  refreshKey,
}: WithdrawalSummaryCardsProps) {
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWithdrawalSummary(ownerType, currency)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerType, currency, refreshKey]);

  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-secondary)]">
            Sedang diproses ({summary.processingCount})
          </p>
          <p className="text-base font-semibold tabular-nums text-[var(--text-primary)]">
            {formatMoney(summary.processingAmount, currency)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-secondary)]">Ditarik bulan ini</p>
          <p className="text-base font-semibold tabular-nums text-[var(--text-primary)]">
            {formatMoney(summary.paidThisMonth, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

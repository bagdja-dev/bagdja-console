'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/money';
import {
  getWithdrawalSummary,
  type Wallet,
  type WithdrawalOwnerType,
} from '@/lib/payment-api';

/**
 * Total berhasil ditarik (PAID, sepanjang waktu) per mata uang dompet aktif
 * (29 Okt 2026). Dimuat ulang setiap daftar dompet berubah (setelah refresh,
 * withdraw, cancel). `undefined` = masih dimuat / gagal dimuat.
 */
export function useWithdrawnTotals(
  wallets: Wallet[],
  ownerType: WithdrawalOwnerType,
  organizationId?: string,
): Record<string, number | undefined> {
  const [totals, setTotals] = useState<Record<string, number | undefined>>({});
  const currencies = wallets
    .filter((wallet) => wallet.is_active)
    .map((wallet) => wallet.currency_code);
  const currencyKey = [...new Set(currencies)].sort().join(',');

  useEffect(() => {
    if (!currencyKey) return;
    let cancelled = false;
    const codes = currencyKey.split(',');
    Promise.allSettled(
      codes.map((currency) => getWithdrawalSummary(ownerType, currency, organizationId)),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, number | undefined> = {};
      results.forEach((result, index) => {
        next[codes[index]] = result.status === 'fulfilled' ? result.value.paidTotal : undefined;
      });
      setTotals(next);
    });
    return () => {
      cancelled = true;
    };
    // `wallets` ikut sebagai pemicu muat ulang setelah aksi withdraw/refresh.
  }, [currencyKey, ownerType, organizationId, wallets]);

  // Tanpa dompet aktif tidak ada yang dimuat.
  return currencyKey ? totals : {};
}

type Tile = { label: string; value: string; hint?: string };

/**
 * Empat angka di kartu dompet: tersedia, ditahan escrow, withdrawal sedang
 * diproses (`withdrawal_held_balance`, sudah dipotong dari tersedia), dan
 * total berhasil ditarik.
 */
export default function WalletBalanceTiles({
  currency,
  availableBalance,
  heldBalance,
  withdrawalProcessing,
  withdrawnTotal,
}: {
  currency: string;
  availableBalance: number;
  heldBalance: number;
  withdrawalProcessing: number;
  /** `undefined` = belum tersedia (dompet nonaktif / masih dimuat). */
  withdrawnTotal?: number;
}) {
  const tiles: Tile[] = [
    { label: 'Available balance', value: formatMoney(availableBalance, currency) },
    { label: 'Held balance', value: formatMoney(heldBalance, currency), hint: 'Escrow' },
    {
      label: 'Withdrawal in progress',
      value: formatMoney(withdrawalProcessing, currency),
      hint: 'Pending payout',
    },
    {
      label: 'Total withdrawn',
      value: withdrawnTotal === undefined ? '—' : formatMoney(withdrawnTotal, currency),
      hint: 'Paid out',
    },
  ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-3"
        >
          <div className="text-xs text-[var(--text-secondary)]">{tile.label}</div>
          <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
            {tile.value}
          </div>
          {tile.hint && (
            <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{tile.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}

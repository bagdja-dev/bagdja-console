'use client';

import { useCallback, useMemo, useState } from 'react';
import { ArrowUpRight, Ban, Eye } from 'lucide-react';
import DataGrid, { type FilterField, type GridColumn } from '@/components/DataGrid';
import ConfirmModal from '@/components/ConfirmModal';
import { getAccessToken, getActiveOrganizationSlug } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { useOrganizationPermissions } from '@/lib/use-organization-permissions';
import {
  cancelWithdrawalRequest,
  listWithdrawalRequests,
  type WithdrawalRequest,
} from '@/lib/payment-api';
import {
  WithdrawalAccountCell,
  WithdrawalAmountCell,
  WithdrawalChannelBadge,
  WithdrawalDetailModal,
  WithdrawalStatusBadge,
  isManualWithdrawal,
  withdrawalCurrency,
} from '@/components/withdrawal/withdrawal-ui';

const withdrawalFilters: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Menunggu verifikasi / diproses', value: 'PENDING' },
      { label: 'Sedang diproses', value: 'PROCESSING' },
      { label: 'Berhasil', value: 'PAID' },
      { label: 'Ditolak', value: 'REJECTED' },
      { label: 'Gagal', value: 'FAILED' },
      { label: 'Dibatalkan', value: 'CANCELLED' },
    ],
  },
];

/** `sub` token user — hanya untuk menampilkan tombol; backend tetap memutuskan. */
function currentUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

type WithdrawalRequestsGridProps = {
  currency?: string;
  isPersonal?: boolean;
  /** Dipanggil setelah pembatalan agar saldo & ringkasan dimuat ulang. */
  onChanged?: () => void;
};

/**
 * Riwayat withdrawal milik pemohon (dompet org/personal), plan §5.2.
 * Approve/Reject ada di halaman admin (`AdminWithdrawalsGrid`).
 */
export default function WithdrawalRequestsGrid({
  currency,
  isPersonal,
  onChanged,
}: WithdrawalRequestsGridProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailRow, setDetailRow] = useState<WithdrawalRequest | null>(null);
  const [cancelRow, setCancelRow] = useState<WithdrawalRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { isOrgOwner } = useOrganizationPermissions();
  const userId = useMemo(() => currentUserId(), []);
  const ownerType = isPersonal ? 'personal' : 'organization';

  const canCancel = (row: WithdrawalRequest) => {
    if (row.status?.toUpperCase() !== 'PENDING' || !isManualWithdrawal(row)) return false;
    if (isPersonal) return true;
    // D4: pengaju atau owner org.
    const isRequester = Boolean(userId && row.requested_by === userId);
    return isRequester || isOrgOwner(getActiveOrganizationSlug());
  };

  const handleConfirmCancel = async () => {
    if (!cancelRow) return;
    try {
      setIsCancelling(true);
      setCancelError(null);
      await cancelWithdrawalRequest(cancelRow.id, ownerType);
      setCancelRow(null);
      setRefreshKey((prev) => prev + 1);
      onChanged?.();
    } catch (err) {
      setCancelError((err as { message?: string })?.message || 'Gagal membatalkan penarikan');
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchData = useCallback(
    (params: { page: number; size: number; filter?: Record<string, string> }) =>
      listWithdrawalRequests({
        page: params.page,
        size: params.size,
        currency: currency || undefined,
        status: params.filter?.status,
        ownerType,
      }),
    [currency, ownerType],
  );

  const columns: GridColumn[] = [
    {
      key: 'created_at',
      label: 'Tanggal',
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
          {new Date(val).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      key: 'account',
      label: 'Rekening tujuan',
      render: (_, row: WithdrawalRequest) => <WithdrawalAccountCell row={row} />,
    },
    {
      key: 'provider',
      label: 'Metode',
      render: (_, row: WithdrawalRequest) => <WithdrawalChannelBadge row={row} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row: WithdrawalRequest) => (
        <div className="flex flex-col gap-1 items-start">
          <WithdrawalStatusBadge row={row} />
          {row.rejection_reason && (
            <span className="text-[11px] text-red-500 max-w-[200px] truncate" title={row.rejection_reason}>
              {row.rejection_reason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Nominal',
      render: (_, row: WithdrawalRequest) => <WithdrawalAmountCell row={row} currency={currency} />,
    },
    {
      key: 'actions',
      label: '',
      render: (_, row: WithdrawalRequest) => (
        <div className="flex items-center justify-end gap-1">
          {canCancel(row) && (
            <button
              type="button"
              onClick={() => {
                setCancelError(null);
                setCancelRow(row);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              <Ban className="h-3.5 w-3.5" /> Batalkan
            </button>
          )}
          <button
            type="button"
            onClick={() => setDetailRow(row)}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
            title="Detail"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataGrid
        title="Riwayat penarikan"
        description="Penarikan dana dari dompet ini"
        columns={columns}
        fetchData={fetchData}
        filterFields={withdrawalFilters}
        refreshTrigger={`${currency || 'all'}-${refreshKey}`}
        emptyState={{
          title: 'Belum ada penarikan',
          description: `Belum ada penarikan dari dompet ${currency || 'ini'}.`,
          icon: <ArrowUpRight className="h-12 w-12 text-[var(--text-muted)]" />,
        }}
        fullHeight
      />

      <WithdrawalDetailModal row={detailRow} ownerType={ownerType} currency={currency} onClose={() => setDetailRow(null)} />

      <ConfirmModal
        isOpen={Boolean(cancelRow)}
        onClose={() => {
          if (!isCancelling) setCancelRow(null);
        }}
        onConfirm={handleConfirmCancel}
        title="Batalkan penarikan?"
        message={
          cancelError ||
          'Dana yang ditahan akan dikembalikan ke saldo tersedia. Penarikan yang sudah dibatalkan tidak bisa diaktifkan lagi.'
        }
        detail={
          cancelRow
            ? formatMoney(Number(cancelRow.amount), withdrawalCurrency(cancelRow, currency))
            : undefined
        }
        confirmLabel={isCancelling ? 'Membatalkan…' : 'Batalkan penarikan'}
        cancelLabel="Kembali"
        variant="danger"
        loading={isCancelling}
      />
    </>
  );
}

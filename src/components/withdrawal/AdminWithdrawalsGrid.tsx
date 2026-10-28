'use client';

import { useCallback, useState } from 'react';
import { ArrowUpRight, Check, X, Loader2, AlertCircle, ShieldAlert, Eye } from 'lucide-react';
import DataGrid, { type FilterField, type GridColumn } from '@/components/DataGrid';
import { formatMoney } from '@/lib/money';
import { PAYOUT_PERMISSIONS } from '@/lib/payout-permissions';
import { useOrganizationPermissions } from '@/lib/use-organization-permissions';
import {
  listWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
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
} from './withdrawal-ui';

const adminFilters: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Pending', value: 'PENDING' },
      { label: 'Processing', value: 'PROCESSING' },
      { label: 'Paid', value: 'PAID' },
      { label: 'Rejected', value: 'REJECTED' },
      { label: 'Failed', value: 'FAILED' },
      { label: 'Cancelled', value: 'CANCELLED' },
    ],
  },
  {
    key: 'provider',
    label: 'Engine',
    type: 'select',
    options: [
      { label: 'Manual', value: 'manual' },
      { label: 'Midtrans', value: 'midtrans' },
      { label: 'Duitku', value: 'duitku' },
    ],
  },
  { key: 'filterOrgId', label: 'Organization', type: 'text', placeholder: 'org slug' },
  { key: 'dateFrom', label: 'From', type: 'date' },
  { key: 'dateTo', label: 'To', type: 'date' },
];

/** Tanggal dari input `date` (lokal) → batas ISO inklusif. */
function dayBoundary(value: string | undefined, end: boolean): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

type AdminWithdrawalsGridProps = {
  currency?: string;
};

/**
 * Antrean withdrawal seluruh platform untuk Finance org sistem (plan §5.3).
 * Approve/Reject hanya untuk withdrawal manual berstatus PENDING dan hanya
 * tampil bagi pemegang permission terkait; backend tetap menegakkannya.
 */
export default function AdminWithdrawalsGrid({ currency }: AdminWithdrawalsGridProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailRow, setDetailRow] = useState<WithdrawalRequest | null>(null);
  const { hasSystemPermission } = useOrganizationPermissions();
  const canApprove = hasSystemPermission(PAYOUT_PERMISSIONS.WITHDRAWALS_APPROVE);
  const canReject = hasSystemPermission(PAYOUT_PERMISSIONS.WITHDRAWALS_REJECT);

  const [approvingRow, setApprovingRow] = useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [providerReferenceId, setProviderReferenceId] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const [rejectingRow, setRejectingRow] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const handleOpenApprove = (row: WithdrawalRequest) => {
    setApprovingRow(row);
    setAdminNotes('');
    setProofUrl('');
    setProviderReferenceId('');
    setApproveError(null);
  };

  const handleOpenReject = (row: WithdrawalRequest) => {
    setRejectingRow(row);
    setRejectReason('');
    setRejectError(null);
  };

  const errorMessage = (err: unknown, fallback: string) =>
    (err as { message?: string })?.message || fallback;

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRow) return;
    try {
      setIsApproving(true);
      setApproveError(null);
      await approveWithdrawalRequest(approvingRow.id, {
        adminNotes: adminNotes.trim() || undefined,
        proofUrl: proofUrl.trim() || undefined,
        providerReferenceId: providerReferenceId.trim() || undefined,
      });
      setApprovingRow(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setApproveError(errorMessage(err, 'Failed to approve withdrawal request'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRow) return;
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required');
      return;
    }
    try {
      setIsRejecting(true);
      setRejectError(null);
      await rejectWithdrawalRequest(rejectingRow.id, { reason: rejectReason.trim() });
      setRejectingRow(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setRejectError(errorMessage(err, 'Failed to reject withdrawal request'));
    } finally {
      setIsRejecting(false);
    }
  };

  const fetchData = useCallback(
    (params: { page: number; size: number; filter?: Record<string, string> }) =>
      listWithdrawalRequests({
        page: params.page,
        size: params.size,
        currency: currency || undefined,
        ownerType: 'all',
        status: params.filter?.status,
        provider: params.filter?.provider,
        filterOrgId: params.filter?.filterOrgId,
        dateFrom: dayBoundary(params.filter?.dateFrom, false),
        dateTo: dayBoundary(params.filter?.dateTo, true),
      }),
    [currency],
  );

  const columns: GridColumn[] = [
    {
      key: 'created_at',
      label: 'Requested',
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
          {new Date(val).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      key: 'owner',
      label: 'Wallet / Owner',
      render: (_, row: WithdrawalRequest) => {
        const isPersonalOwner = !!row.user_id;
        const identifier = row.user_id || row.org_id || '-';
        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className={[
                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase border',
                isPersonalOwner
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              ].join(' ')}
            >
              {isPersonalOwner ? 'Personal' : 'Organization'}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-mono truncate max-w-[150px]" title={identifier}>
              {identifier}
            </span>
            {row.app_id && row.app_id !== 'default' && (
              <span className="text-[11px] font-mono text-[var(--text-muted)]">app: {row.app_id}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'account',
      label: 'Payout Account',
      render: (_, row: WithdrawalRequest) => <WithdrawalAccountCell row={row} />,
    },
    {
      key: 'provider',
      label: 'Channel',
      render: (_, row: WithdrawalRequest) => <WithdrawalChannelBadge row={row} showEngine />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row: WithdrawalRequest) => <WithdrawalStatusBadge row={row} showInternal />,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (_, row: WithdrawalRequest) => <WithdrawalAmountCell row={row} currency={currency} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row: WithdrawalRequest) => {
        const actionable = row.status?.toUpperCase() === 'PENDING' && isManualWithdrawal(row);
        return (
          <div className="flex items-center gap-2">
            {actionable && canApprove && (
              <button
                type="button"
                onClick={() => handleOpenApprove(row)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                title="Approve manual transfer"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
            )}
            {actionable && canReject && (
              <button
                type="button"
                onClick={() => handleOpenReject(row)}
                className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                title="Reject and release funds"
              >
                <X className="h-3.5 w-3.5" /> Reject
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
        );
      },
    },
  ];

  return (
    <>
      <DataGrid
        title="Platform Withdrawal Requests"
        description="Review, approve, or reject payout requests across all organizations, users, and applications"
        columns={columns}
        fetchData={fetchData}
        filterFields={adminFilters}
        refreshTrigger={`${currency || 'all'}-${refreshKey}`}
        emptyState={{
          title: 'No withdrawal requests',
          description: 'No payout requests found across the platform.',
          icon: <ArrowUpRight className="h-12 w-12 text-[var(--text-muted)]" />,
        }}
        fullHeight
      />

      <WithdrawalDetailModal row={detailRow} isAdmin currency={currency} onClose={() => setDetailRow(null)} />

      {/* Approve Modal */}
      {approvingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isApproving && setApprovingRow(null)}
          />
          <div className="relative w-full max-w-md scale-100 transform overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-left shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Approve Withdrawal
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Confirm manual transfer execution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingRow(null)}
                disabled={isApproving}
                className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-3.5">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Transfer amount:</span>
                  <span className="font-semibold text-emerald-500">
                    {formatMoney(Number(approvingRow.net_amount ?? approvingRow.amount), withdrawalCurrency(approvingRow, currency))}
                  </span>
                </div>
                {Number(approvingRow.fee_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Fee (kept by platform):</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatMoney(Number(approvingRow.fee_amount), withdrawalCurrency(approvingRow, currency))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Destination:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {approvingRow.bank_info?.bankName} ({approvingRow.bank_info?.accountIdentifier})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Beneficiary:</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {approvingRow.bank_info?.accountHolderName || '-'}
                  </span>
                </div>
              </div>

              {approveError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{approveError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Bank Reference No / Transfer ID (Optional)
                </label>
                <input
                  type="text"
                  value={providerReferenceId}
                  onChange={(e) => setProviderReferenceId(e.target.value)}
                  placeholder="e.g. BCA-TRX-2026102501"
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                  disabled={isApproving}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Proof Attachment URL (Optional)
                </label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://storage.../receipt.jpg"
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                  disabled={isApproving}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Admin Notes (Optional)
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Transfer processed by finance"
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                  disabled={isApproving}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingRow(null)}
                  disabled={isApproving}
                  className="rounded-lg border border-[var(--border-default)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isApproving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isRejecting && setRejectingRow(null)}
          />
          <div className="relative w-full max-w-md scale-100 transform overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-left shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Reject Withdrawal
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Reject and automatically refund balance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingRow(null)}
                disabled={isRejecting}
                className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3.5">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
                <strong>Attention:</strong> Rejecting this request will immediately release{' '}
                <strong className="underline">
                  {formatMoney(rejectingRow.amount, withdrawalCurrency(rejectingRow, currency))}
                </strong>{' '}
                back to the owner&apos;s available wallet balance.
              </div>

              {rejectError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{rejectError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Invalid account number or beneficiary name mismatch"
                  rows={3}
                  required
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)]"
                  disabled={isRejecting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRow(null)}
                  disabled={isRejecting}
                  className="rounded-lg border border-[var(--border-default)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isRejecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Reject & Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

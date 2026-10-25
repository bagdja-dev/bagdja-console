'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  Banknote,
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import DataGrid, { type FilterField, type GridColumn } from '@/components/DataGrid';
import {
  listWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  type WithdrawalRequest,
} from '@/lib/payment-api';

type Currency = string;

function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

function getProviderBadge(provider?: string) {
  const p = (provider || 'manual').toLowerCase();
  if (p === 'duitku' || p === 'duitku-disbursement') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-orange-500/20 bg-orange-500/10 text-orange-500">
        Duitku
      </span>
    );
  }
  if (p === 'midtrans' || p === 'midtrans-iris' || p === 'iris') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-purple-500/20 bg-purple-500/10 text-purple-500">
        Midtrans
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-sky-500/20 bg-sky-500/10 text-sky-500">
      Manual
    </span>
  );
}

function getStatusBadge(status: string) {
  const s = status?.toUpperCase();
  if (s === 'COMPLETED' || s === 'PAID') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-500">
        {s}
      </span>
    );
  }
  if (s === 'PENDING') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500">
        PENDING
      </span>
    );
  }
  if (s === 'REJECTED' || s === 'FAILED') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/10 text-red-500">
        {s}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500">
      {s || 'PROCESSING'}
    </span>
  );
}

const withdrawalFilters: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Pending', value: 'PENDING' },
      { label: 'Completed / Paid', value: 'PAID' },
      { label: 'Processing', value: 'PROCESSING' },
      { label: 'Rejected', value: 'REJECTED' },
      { label: 'Failed', value: 'FAILED' },
    ],
  },
];

type WithdrawalRequestsGridProps = {
  currency?: Currency;
  isPersonal?: boolean;
  isAdminView?: boolean;
};

export default function WithdrawalRequestsGrid({
  currency,
  isPersonal,
  isAdminView,
}: WithdrawalRequestsGridProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states for Approval & Rejection
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
    } catch (err: any) {
      setApproveError(err?.message || 'Failed to approve withdrawal request');
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
      await rejectWithdrawalRequest(rejectingRow.id, {
        reason: rejectReason.trim(),
      });
      setRejectingRow(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      setRejectError(err?.message || 'Failed to reject withdrawal request');
    } finally {
      setIsRejecting(false);
    }
  };

  const columns: GridColumn[] = [
    {
      key: 'created_at',
      label: 'Requested',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
          {new Date(val).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    ...(isAdminView
      ? [
          {
            key: 'owner',
            label: 'Wallet / Owner',
            render: (_: any, row: WithdrawalRequest) => {
              const isPersonalOwner =
                !!row.user_id || (!row.org_id && !!row.wallet?.user_id);
              const identifier =
                row.org_id ||
                row.user_id ||
                row.wallet?.org_id ||
                row.wallet?.user_id ||
                '-';
              return (
                <div className="flex flex-col gap-1 items-start">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                      isPersonalOwner
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                    ].join(' ')}
                  >
                    {isPersonalOwner ? '👤 Personal' : '🏢 Organization'}
                  </span>
                  <span
                    className="text-xs text-[var(--text-secondary)] font-mono truncate max-w-[150px]"
                    title={identifier}
                  >
                    {identifier}
                  </span>
                </div>
              );
            },
          },
          {
            key: 'app_id',
            label: 'Application',
            render: (val: string) => {
              if (!val || val === 'default') {
                return (
                  <span className="text-xs text-[var(--text-muted)] italic">
                    Direct / Console
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center rounded bg-[var(--bg-card)] border border-[var(--border-default)] px-1.5 py-0.5 text-xs font-mono text-[var(--text-primary)]">
                  {val}
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: 'account',
      label: 'Payout Account',
      render: (_, row: WithdrawalRequest) => {
        const bankName =
          row.bank_info?.bankName ||
          row.payout_details_snapshot?.bankName ||
          'Bank';
        const accountNum =
          row.bank_info?.accountIdentifier ||
          row.payout_details_snapshot?.accountNumber ||
          '-';
        const holderName =
          row.bank_info?.accountHolderName ||
          row.payout_details_snapshot?.accountName ||
          '';

        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
              <Banknote className="h-4 w-4 text-orange-500" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {bankName} — <span className="font-mono text-xs">{accountNum}</span>
              </div>
              {holderName && (
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {holderName}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (_, row: WithdrawalRequest) => getProviderBadge(row.provider),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status: string, row: WithdrawalRequest) => (
        <div className="flex flex-col gap-1 items-start">
          {getStatusBadge(status)}
          {row.rejection_reason && (
            <span
              className="text-[11px] text-red-500 max-w-[200px] truncate"
              title={row.rejection_reason}
            >
              Note: {row.rejection_reason}
            </span>
          )}
          {row.proof_url && (
            <a
              href={row.proof_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--action-primary)] hover:underline"
            >
              <FileText className="h-3 w-3" /> Receipt
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val, row: WithdrawalRequest) => (
        <div className="text-right font-semibold tabular-nums text-orange-500">
          -{formatMoney(Number(val), (row.wallet?.currency_code as Currency) || currency || 'IDR')}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row: WithdrawalRequest) => {
        if (row.status?.toUpperCase() === 'PENDING' && isAdminView && (row.provider === 'manual' || !row.provider)) {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenApprove(row)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                title="Approve manual transfer"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => handleOpenReject(row)}
                className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                title="Reject and refund"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          );
        }
        return (
          <span className="text-xs text-[var(--text-secondary)]">
            {row.processed_at
              ? new Date(row.processed_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : '-'}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <DataGrid
        title={isAdminView ? 'Platform Withdrawal Requests' : 'Withdrawal requests'}
        description={
          isAdminView
            ? 'Review, approve, or reject payout requests across all organizations, users, and applications'
            : 'Payout requests submitted for this wallet'
        }
        columns={columns}
        fetchData={(params) =>
          listWithdrawalRequests({
            page: params.page,
            size: params.size,
            currency: currency || undefined,
            status: params.filter?.status,
            ownerType: isAdminView
              ? 'all'
              : isPersonal
                ? 'personal'
                : 'organization',
          })
        }
        filterFields={withdrawalFilters}
        refreshTrigger={`${currency || 'all'}-${refreshKey}`}
        emptyState={{
          title: 'No withdrawal requests',
          description: isAdminView
            ? 'No payout requests found across the platform.'
            : `No payout requests for ${currency || 'this'} wallet yet.`,
          icon: <ArrowUpRight className="h-12 w-12 text-[var(--text-muted)]" />,
        }}
        fullHeight
      />

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
                  <span className="text-[var(--text-secondary)]">Amount:</span>
                  <span className="font-semibold text-emerald-500">
                    {formatMoney(approvingRow.amount, (approvingRow.wallet?.currency_code as Currency) || currency || 'IDR')}
                  </span>
                </div>
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
                <strong>Attention:</strong> Rejecting this request will immediately refund{' '}
                <strong className="underline">
                  {formatMoney(rejectingRow.amount, (rejectingRow.wallet?.currency_code as Currency) || currency || 'IDR')}
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

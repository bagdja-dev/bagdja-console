'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Loader2,
  ArrowDownLeft,
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  createWithdrawalRequest,
  getWithdrawalChannels,
  listPayoutAccounts,
  type PayoutAccount,
  type WithdrawalChannel,
} from '@/lib/payment-api';
import { formatMoney } from '@/lib/money';

type WithdrawModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currency: string;
  availableBalance: number;
  isPersonal?: boolean;
};

const CHANNEL_LABELS: Record<string, string> = {
  manual: 'Transfer manual',
  midtrans: 'Transfer otomatis',
  duitku: 'Transfer otomatis',
};

export default function WithdrawModal({
  isOpen,
  onClose,
  onSuccess,
  currency,
  availableBalance,
  isPersonal,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  // Channel (engine × metode) dipilih user; biaya dipotong dari nominal.
  // Sementara di console sampai hosted withdraw UI (plan Fase 4b) siap.
  const [channels, setChannels] = useState<WithdrawalChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Fetch payout accounts when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true);
        setError(null);
        setIsSuccess(false);
        const res = await listPayoutAccounts({
          page: 1,
          size: 50,
          ownerType: isPersonal ? 'personal' : 'organization',
        });
        if (mounted) {
          const list = res.data || [];
          setAccounts(list);
          // Auto select first account if available
          if (list.length > 0) {
            setSelectedAccountId(list[0].id);
          } else {
            setSelectedAccountId('');
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load payout accounts');
        }
      } finally {
        if (mounted) {
          setLoadingAccounts(false);
        }
      }
    };

    fetchAccounts();

    return () => {
      mounted = false;
    };
  }, [isOpen, isPersonal]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Muat channel + pratinjau biaya saat rekening/nominal berubah (debounce).
  useEffect(() => {
    if (!isOpen || !selectedAccountId) {
      setChannels([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoadingChannels(true);
        const list = await getWithdrawalChannels({
          payoutAccountId: selectedAccountId,
          amount: Number(amount) || 0,
          currency,
          ownerType: isPersonal ? 'personal' : 'organization',
        });
        if (cancelled) return;
        setChannels(list);
        setSelectedChannelId((prev) => {
          if (list.some((c) => c.id === prev && c.eligible)) return prev;
          return list.find((c) => c.eligible)?.id || list[0]?.id || '';
        });
      } catch (err: any) {
        if (!cancelled) {
          setChannels([]);
          setError(err.message || 'Failed to load payout options');
        }
      } finally {
        if (!cancelled) setLoadingChannels(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, selectedAccountId, amount, currency, isPersonal]);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  // Rekening lama yang belum dipetakan ke katalog tidak punya channel:
  // backend memprosesnya manual tanpa biaya.
  const legacyAccount = Boolean(selectedAccount && !selectedAccount.method_code);

  if (!isOpen) return null;

  const handlePresetPercentage = (pct: number) => {
    const calculated = Math.floor((availableBalance * pct) / 100);
    setAmount(calculated > 0 ? calculated : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setError('Please select a payout account');
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount > availableBalance) {
      setError('Withdrawal amount cannot exceed available balance');
      return;
    }

    if (!legacyAccount) {
      if (!selectedChannel) {
        setError('Pilih metode transfer');
        return;
      }
      if (!selectedChannel.eligible) {
        setError(selectedChannel.reason || 'Metode transfer ini tidak bisa dipakai untuk nominal tersebut');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await createWithdrawalRequest({
        ownerType: isPersonal ? 'personal' : 'organization',
        amount: numAmount,
        currency,
        payoutAccountId: selectedAccountId,
        payoutMethodFeeId: legacyAccount ? undefined : selectedChannelId,
        description: description.trim() || undefined,
      });

      setIsSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="relative w-full max-w-lg scale-100 transform overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-left shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <ArrowDownLeft className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Withdraw Funds
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Withdraw from your {isPersonal ? 'personal' : 'organization'} {currency} wallet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success View */}
        {isSuccess ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              Withdrawal Request Submitted!
            </h4>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              Your request to withdraw{' '}
              <strong className="text-[var(--text-primary)]">
                {formatMoney(Number(amount), currency)}
              </strong>{' '}
              {selectedChannel && selectedChannel.feeAmount > 0 && (
                <>
                  (diterima{' '}
                  <strong className="text-[var(--text-primary)]">
                    {formatMoney(selectedChannel.netAmount, currency)}
                  </strong>
                  ){' '}
                </>
              )}
              to{' '}
              <strong className="text-[var(--text-primary)]">
                {selectedAccount?.bank_name} ({selectedAccount?.account_identifier})
              </strong>{' '}
              has been recorded and is being processed.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Balance info banner */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-3.5">
              <div>
                <span className="text-xs text-[var(--text-secondary)]">Available Balance</span>
                <div className="text-base font-bold text-[var(--text-primary)]">
                  {formatMoney(availableBalance, currency)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--text-secondary)]">Wallet Currency</span>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{currency}</div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Payout Account Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Destination Payout Account
                </label>
                <Link
                  href="/payment/payout-setup"
                  className="text-xs text-[var(--action-primary)] hover:underline inline-flex items-center gap-1"
                >
                  Manage accounts <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {loadingAccounts ? (
                <div className="flex items-center justify-center p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading accounts...
                </div>
              ) : accounts.length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-center">
                  <Building2 className="h-6 w-6 text-amber-500 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    No Payout Account Configured
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 mb-2">
                    You need to register a bank account before withdrawing funds.
                  </p>
                  <Link
                    href="/payment/payout-setup"
                    className="inline-flex items-center justify-center rounded-lg bg-[var(--action-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--action-primary-hover)] transition-colors"
                  >
                    Set Up Bank Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none"
                    disabled={isSubmitting}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bank_name || 'Bank'} — {acc.account_identifier} ({acc.account_holder_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Withdrawal Amount
                </label>
                {selectedChannel?.minAmount != null && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    Min: {formatMoney(selectedChannel.minAmount, currency)}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-secondary)]">
                  {currency}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val === '' ? '' : Number(val));
                  }}
                  placeholder="0"
                  max={availableBalance}
                  disabled={isSubmitting || accounts.length === 0}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-2.5 pl-14 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none"
                />
              </div>

              {/* Percentage shortcut buttons */}
              {availableBalance > 0 && accounts.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePresetPercentage(pct)}
                      disabled={isSubmitting}
                      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--action-primary)] hover:text-[var(--action-primary)] transition-colors"
                    >
                      {pct === 100 ? 'Max (100%)' : `${pct}%`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Channel selection (fee deducted from amount) */}
            {accounts.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Metode transfer
                </label>
                {legacyAccount ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-500">
                    Rekening ini belum terhubung ke daftar bank. Penarikan diproses manual tanpa biaya.
                    Perbarui rekening di halaman Payout Setup untuk melihat pilihan lain.
                  </div>
                ) : loadingChannels && channels.length === 0 ? (
                  <div className="flex items-center justify-center p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] text-sm text-[var(--text-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Memuat pilihan transfer...
                  </div>
                ) : channels.length === 0 ? (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-500">
                    Belum ada metode transfer untuk bank tujuan ini. Hubungi admin atau pilih rekening lain.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {channels.map((channel) => {
                      const active = channel.id === selectedChannelId;
                      return (
                        <label
                          key={channel.id}
                          className={[
                            'flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 transition-colors',
                            active
                              ? 'border-[var(--action-primary)] bg-[var(--bg-hover)]'
                              : 'border-[var(--border-default)] bg-[var(--bg-main)]',
                            channel.eligible ? '' : 'opacity-60',
                          ].join(' ')}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="withdraw-channel"
                              className="mt-1"
                              checked={active}
                              disabled={isSubmitting || !channel.eligible}
                              onChange={() => setSelectedChannelId(channel.id)}
                            />
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {CHANNEL_LABELS[channel.provider] || channel.provider}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {channel.estimatedTime || '—'}
                                {!channel.eligible && channel.reason ? ` · ${channel.reason}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs tabular-nums">
                            <p className="text-[var(--text-secondary)]">
                              Biaya {channel.feeAmount > 0 ? formatMoney(channel.feeAmount, currency) : 'gratis'}
                            </p>
                            {Number(amount) > 0 && (
                              <p className="font-semibold text-[var(--text-primary)]">
                                Diterima {formatMoney(Math.max(0, channel.netAmount), currency)}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Description (optional) */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Notes / Reference (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly withdrawal"
                disabled={isSubmitting || accounts.length === 0}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  accounts.length === 0 ||
                  !amount ||
                  Number(amount) <= 0 ||
                  Number(amount) > availableBalance ||
                  (!legacyAccount && !selectedChannel?.eligible)
                }
                className="flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--text-muted)] transition-colors"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Withdrawal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

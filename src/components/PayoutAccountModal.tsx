'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import type { ApiError } from '@/types';
import {
  listPayoutMethods,
  requestPayoutAccountOtp,
  type CreatePayoutAccountRequest,
  type PayoutAccount,
  type PayoutAccountOtpPayload,
  type PayoutMethod,
  type WalletOtpRequested,
} from '@/lib/payment-api';
import { isOtpError, walletErrorMessage } from '@/lib/wallet-errors';

/** Pilihan "Lainnya": bank di luar katalog, diproses manual tanpa channel. */
const OTHER_METHOD = '__other__';

type Mode = 'create' | 'edit';

type FormState = {
  currency_code: string;
  payout_method: string;
  account_holder_name: string;
  account_identifier: string;
  bank_name: string;
  method_code: string;
  swift_code: string;
  iban: string;
  bank_address: string;
  network: string;
  provider_name: string;
};

function omitEmptyStrings<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const next: Partial<T> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key as keyof T];
    if (value === '') return;
    next[key as keyof T] = value;
  });
  return next;
}

export default function PayoutAccountModal({
  isOpen,
  mode,
  account,
  isLoadingInitial,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  mode: Mode;
  account: PayoutAccount | null;
  isLoadingInitial?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePayoutAccountRequest, accountId?: string) => Promise<void>;
}) {
  const emptyForm = useMemo<FormState>(
    () => ({
      currency_code: 'IDR',
      payout_method: 'BANK_TRANSFER',
      account_holder_name: '',
      account_identifier: '',
      bank_name: '',
      method_code: '',
      swift_code: '',
      iban: '',
      bank_address: '',
      network: '',
      provider_name: '',
    }),
    [],
  );
  const [methods, setMethods] = useState<PayoutMethod[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // OTP email untuk tujuan dana baru/berubah (D14) — terikat isi rekening.
  const [otp, setOtp] = useState<(WalletOtpRequested & { payloadKey: string }) | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setOtp(null);
    setOtpCode('');

    if (mode === 'edit' && account) {
      setForm({
        currency_code: account.currency_code || 'IDR',
        payout_method: account.payout_method || 'BANK_TRANSFER',
        account_holder_name: account.account_holder_name || '',
        account_identifier: account.account_identifier || '',
        bank_name: account.bank_name || '',
        method_code: account.method_code || (account.bank_name ? OTHER_METHOD : ''),
        swift_code: account.swift_code || '',
        iban: account.iban || '',
        bank_address: account.bank_address || '',
        network: account.network || '',
        provider_name: account.provider_name || '',
      });
      return;
    }

    if (mode === 'create') {
      setForm(emptyForm);
    }
  }, [account, emptyForm, isOpen, mode]);

  // Katalog metode tujuan menentukan channel payout yang tersedia (plan §4.6a).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listPayoutMethods(form.currency_code)
      .then((list) => {
        if (!cancelled) setMethods(list);
      })
      .catch(() => {
        if (!cancelled) setMethods([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, form.currency_code]);

  const handleMethodChange = (value: string) => {
    if (value === OTHER_METHOD || value === '') {
      setForm((prev) => ({ ...prev, method_code: value, bank_name: value === '' ? '' : prev.bank_name }));
      return;
    }
    const method = methods.find((m) => m.code === value);
    setForm((prev) => ({ ...prev, method_code: value, bank_name: method?.name || value }));
  };

  const disabled = Boolean(isLoadingInitial) || submitting;

  /** Field penentu tujuan dana — sama dengan yang di-hash payment-service. */
  const destination: PayoutAccountOtpPayload = useMemo(
    () => ({
      currency_code: form.currency_code,
      payout_method: form.payout_method,
      method_code: form.method_code && form.method_code !== OTHER_METHOD ? form.method_code : undefined,
      bank_name: form.bank_name || undefined,
      account_identifier: form.account_identifier,
      account_holder_name: form.account_holder_name,
    }),
    [form],
  );
  const destinationKey = JSON.stringify(destination);

  const destinationChanged =
    mode === 'create' ||
    !account ||
    (account.currency_code || '') !== destination.currency_code ||
    (account.payout_method || '') !== destination.payout_method ||
    (account.method_code || '') !== (destination.method_code || '') ||
    (account.bank_name || '') !== (destination.bank_name || '') ||
    (account.account_identifier || '') !== destination.account_identifier ||
    (account.account_holder_name || '') !== destination.account_holder_name;

  // Isi rekening berubah setelah kode dikirim → kode lama tidak berlaku.
  const otpValid = otp !== null && otp.payloadKey === destinationKey;

  useEffect(() => {
    if (!otp) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otp]);

  const resendSeconds = otp
    ? Math.max(0, Math.ceil((new Date(otp.resendAvailableAt).getTime() - now) / 1000))
    : 0;

  const sendOtp = async () => {
    if (!destination.account_identifier || !destination.account_holder_name) {
      setError('Fill in the account holder name and account identifier first.');
      return;
    }
    setSendingOtp(true);
    setError(null);
    try {
      const requested = await requestPayoutAccountOtp(destination);
      setOtp({ ...requested, payloadKey: destinationKey });
      setOtpCode('');
      setNow(Date.now());
    } catch (err) {
      setError(walletErrorMessage(err, 'Failed to send the verification code'));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (destinationChanged && (!otpValid || otpCode.length !== 6)) {
      setError('Verify this account with the code sent to your email.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payloadBase: CreatePayoutAccountRequest = {
        currency_code: form.currency_code,
        payout_method: form.payout_method,
        account_holder_name: form.account_holder_name,
        account_identifier: form.account_identifier,
        bank_name: form.bank_name || undefined,
        method_code:
          form.method_code && form.method_code !== OTHER_METHOD ? form.method_code : undefined,
        swift_code: form.swift_code || undefined,
        iban: form.iban || undefined,
        bank_address: form.bank_address || undefined,
        network: form.network || undefined,
        provider_name: form.provider_name || undefined,
        ...(destinationChanged && otp ? { otpId: otp.otpId, otpCode } : {}),
      };

      const payload = omitEmptyStrings(payloadBase) as CreatePayoutAccountRequest;

      await onSubmit(payload, mode === 'edit' ? account?.id : undefined);
      onClose();
    } catch (err) {
      setError(walletErrorMessage(err as ApiError, 'Failed to save payout account'));
      if (isOtpError(err)) {
        setOtp(null);
        setOtpCode('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {mode === 'create' ? 'Create payout account' : 'Edit payout account'}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Required: currency, method, holder name, and account identifier.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            disabled={disabled}
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {isLoadingInitial ? (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Loading…
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Currency"
              value={form.currency_code}
              onChange={(e) => setForm((prev) => ({ ...prev, currency_code: e.target.value }))}
              disabled={disabled}
              required
            >
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
              <option value="MYR">MYR</option>
            </Select>

            <Select
              label="Payout method"
              value={form.payout_method}
              onChange={(e) => setForm((prev) => ({ ...prev, payout_method: e.target.value }))}
              disabled={disabled}
              required
            >
              <option value="BANK_TRANSFER">BANK_TRANSFER</option>
              <option value="CRYPTO">CRYPTO</option>
              <option value="VIRTUAL_ACCOUNT">VIRTUAL_ACCOUNT</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Account holder name"
              value={form.account_holder_name}
              onChange={(e) => setForm((prev) => ({ ...prev, account_holder_name: e.target.value }))}
              disabled={disabled}
              required
              placeholder="e.g. Budi Santoso"
            />

            <Input
              label="Account identifier"
              value={form.account_identifier}
              onChange={(e) => setForm((prev) => ({ ...prev, account_identifier: e.target.value }))}
              disabled={disabled}
              required
              placeholder="e.g. bank account number / crypto address"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Bank / e-wallet"
              value={form.method_code}
              onChange={(e) => handleMethodChange(e.target.value)}
              disabled={disabled}
            >
              <option value="">Pilih bank / e-wallet</option>
              {methods.map((method) => (
                <option key={method.code} value={method.code}>
                  {method.name} ({method.code})
                </option>
              ))}
              <option value={OTHER_METHOD}>Lainnya (diproses manual)</option>
            </Select>

            {form.method_code === OTHER_METHOD && (
              <Input
                label="Bank name"
                value={form.bank_name}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                disabled={disabled}
                placeholder="Nama bank di luar daftar"
              />
            )}

            <Input
              label="Provider name (optional)"
              value={form.provider_name}
              onChange={(e) => setForm((prev) => ({ ...prev, provider_name: e.target.value }))}
              disabled={disabled}
              placeholder="e.g. MiniPay"
            />

            <Input
              label="SWIFT code (optional)"
              value={form.swift_code}
              onChange={(e) => setForm((prev) => ({ ...prev, swift_code: e.target.value }))}
              disabled={disabled}
              placeholder="e.g. CENAIDJA"
            />

            <Input
              label="IBAN (optional)"
              value={form.iban}
              onChange={(e) => setForm((prev) => ({ ...prev, iban: e.target.value }))}
              disabled={disabled}
              placeholder="e.g. GB82WEST12345698765432"
            />

            <Input
              label="Bank address (optional)"
              value={form.bank_address}
              onChange={(e) => setForm((prev) => ({ ...prev, bank_address: e.target.value }))}
              disabled={disabled}
              placeholder="e.g. Jl. Sudirman No. 1, Jakarta"
            />

            <Input
              label="Network (optional)"
              value={form.network}
              onChange={(e) => setForm((prev) => ({ ...prev, network: e.target.value }))}
              disabled={disabled}
              placeholder="e.g. TRC20 / ERC20"
            />
          </div>

          {destinationChanged && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Email verification</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  For your security, new or changed payout destinations are confirmed with a code sent to your
                  email. The code is valid for these exact account details.
                </p>
              </div>
              {!otpValid ? (
                <Button type="button" variant="secondary" onClick={sendOtp} disabled={disabled || sendingOtp}>
                  {sendingOtp ? 'Sending…' : 'Send verification code'}
                </Button>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-end">
                  <Input
                    label={`Code sent to ${otp?.maskedEmail ?? ''}`}
                    value={otpCode}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={disabled}
                    placeholder="6-digit code"
                  />
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={disabled || sendingOtp || resendSeconds > 0}
                    className="text-left text-xs font-medium text-[var(--action-primary)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--text-secondary)] disabled:no-underline"
                  >
                    {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={disabled}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={disabled} className="gap-2">
              <Save className="h-4 w-4" />
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Banknote,
  Zap,
  Building2,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  getPayoutSettings,
  setPayoutSettings,
  type PayoutSettingResponse,
} from '@/lib/payment-api';

interface AppPayoutSettingsCardProps {
  appId: string;
  orgId?: string;
  appName?: string;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

interface ProviderOption {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  summary: string;
  details: string[];
  credentialNote?: string;
  credentialUrl?: string;
}

export default function AppPayoutSettingsCard({
  appId,
  orgId,
  appName,
  onShowAlert,
}: AppPayoutSettingsCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setting, setSetting] = useState<PayoutSettingResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('manual');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const providerOptions: ProviderOption[] = [
    {
      id: 'manual',
      name: 'Manual Bank Transfer',
      badge: 'Review & Approval',
      badgeColor: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
      icon: <Banknote className="h-5 w-5 text-sky-400" />,
      summary: 'Permintaan penarikan ditinjau dan ditransfer manual oleh administrator melalui internet banking.',
      details: [
        'Status awal penarikan PENDING untuk diverifikasi admin',
        'Mendukung upload bukti transfer (receipt) dan referensi bank',
        'Penolakan otomatis mengembalikan saldo (atomic refund) ke user',
        'Tanpa biaya gateway pihak ketiga, ideal untuk kepatuhan & staging',
      ],
    },
    {
      id: 'midtrans',
      name: 'Midtrans Iris Disbursement',
      badge: 'Automated API',
      badgeColor: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
      icon: <Zap className="h-5 w-5 text-purple-400" />,
      summary: 'Penyaluran dana otomatis secara real-time ke semua bank Indonesia & e-wallet via Midtrans Iris.',
      details: [
        'Disbursement langsung dieksekusi via API Midtrans Iris',
        'Webhook otomatis untuk pembaruan status COMPLETED / REJECTED',
        'Atomic refund instan bila penolakan atau kegagalan API terjadi',
      ],
      credentialNote: 'Memerlukan Midtrans Server Key (Iris). Kredensial dibaca per-aplikasi atau fallback ke kredensial organisasi.',
      credentialUrl: '/infrastructure/payment-gateway-credentials',
    },
    {
      id: 'duitku',
      name: 'Duitku Disbursement',
      badge: 'Automated API',
      badgeColor: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
      icon: <Building2 className="h-5 w-5 text-orange-400" />,
      summary: 'Penyaluran dana otomatis ke rekening bank di Indonesia menggunakan API Duitku Disbursement.',
      details: [
        'Transfer langsung dengan verifikasi checksum/signature Duitku',
        'Mendukung tracking nomor referensi transaksi Duitku',
        'Atomic refund instan bila inisiasi transfer gateway ditolak',
      ],
      credentialNote: 'Memerlukan Duitku Merchant Code & API Key. Dikonfigurasi di menu Payment Gateway Credentials.',
      credentialUrl: '/infrastructure/payment-gateway-credentials',
    },
  ];

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPayoutSettings(appId, orgId);
      setSetting(res);
      setSelectedProvider(res.activeProvider || 'manual');
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat konfigurasi payout.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appId) {
      fetchSettings();
    }
  }, [appId, orgId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await setPayoutSettings(
        {
          appId,
          provider: selectedProvider,
          isActive: true,
        },
        orgId,
      );

      const updated = await getPayoutSettings(appId, orgId);
      setSetting(updated);
      setSelectedProvider(updated.activeProvider || selectedProvider);

      const successText = `Pengaturan payout berhasil disimpan. Provider aktif: ${selectedProvider.toUpperCase()}`;
      setSuccessMessage(successText);
      if (onShowAlert) {
        onShowAlert(successText, 'success', 'Pengaturan Tersimpan');
      }
    } catch (err: any) {
      const errText = err?.message || 'Gagal menyimpan konfigurasi payout.';
      setError(errText);
      if (onShowAlert) {
        onShowAlert(errText, 'error', 'Gagal Menyimpan');
      }
    } finally {
      setSaving(false);
    }
  };

  const getSourceBadge = () => {
    if (!setting) return null;
    if (setting.appSetting?.isActive && setting.appSetting?.provider) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Dikonfigurasi Spesifik untuk Aplikasi Ini
        </span>
      );
    }
    if (setting.orgDefaultSetting?.isActive && setting.orgDefaultSetting?.provider) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border border-blue-500/20 bg-blue-500/10 text-blue-400">
          <ShieldCheck className="h-3 w-3" />
          Mengikuti Default Organisasi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border border-amber-500/20 bg-amber-500/10 text-amber-400">
        <Sliders className="h-3 w-3" />
        Default Sistem (Manual)
      </span>
    );
  };

  const hasChanges = setting ? selectedProvider !== setting.activeProvider : false;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 max-w-4xl shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-default)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Payout & Withdrawal Provider
            </h3>
            {getSourceBadge()}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Tentukan provider gateway penyaluran dana penarikan (disbursement / withdrawal) untuk aplikasi{' '}
            <span className="font-semibold text-[var(--text-primary)]">{appName || appId}</span>.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading || saving}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:bg-white/5 transition-colors disabled:opacity-50"
          title="Segarkan pengaturan"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mt-4 p-3.5 rounded-lg border border-red-500/20 bg-red-500/10 text-sm text-red-400 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-sm text-emerald-400 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-[var(--text-secondary)] text-sm">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--action-primary)] mb-3" />
          <span>Memuat konfigurasi payout...</span>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 gap-4">
            {providerOptions.map((opt) => {
              const isSelected = selectedProvider === opt.id;
              const isCurrentlyActive = setting?.activeProvider === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedProvider(opt.id)}
                  className={`relative cursor-pointer rounded-xl border p-5 transition-all ${
                    isSelected
                      ? 'border-[var(--action-primary)] bg-[var(--action-primary)]/5 shadow-md ring-1 ring-[var(--action-primary)]'
                      : 'border-[var(--border-default)] bg-white/5 hover:border-[var(--border-hover)] hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      {/* Radio Indicator */}
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all">
                        <div
                          className={`h-2.5 w-2.5 rounded-full transition-all ${
                            isSelected ? 'bg-[var(--action-primary)] scale-100' : 'bg-transparent scale-0'
                          }`}
                        />
                      </div>

                      {/* Provider Info */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="p-1 rounded-md bg-white/5">{opt.icon}</span>
                          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                            {opt.name}
                          </h4>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${opt.badgeColor}`}
                          >
                            {opt.badge}
                          </span>
                          {isCurrentlyActive && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Check className="h-3 w-3" />
                              Sedang Digunakan
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                          {opt.summary}
                        </p>

                        {/* Feature bullets */}
                        <ul className="mt-3 space-y-1">
                          {opt.details.map((detail, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-[var(--text-secondary)] flex items-center gap-2"
                            >
                              <span className="h-1 w-1 rounded-full bg-[var(--text-secondary)] shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Credential Note & Link */}
                        {opt.credentialNote && (
                          <div className="mt-3 pt-3 border-t border-[var(--border-default)]/50 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-[var(--text-secondary)]">
                              {opt.credentialNote}
                            </span>
                            {opt.credentialUrl && (
                              <Link
                                href={opt.credentialUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--action-primary)] hover:underline"
                              >
                                <span>Konfigurasi Kredensial</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-8 pt-5 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <Link
                href="/infrastructure/payment-gateway-credentials"
                className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Payment Gateway Credentials</span>
              </Link>
              <span>•</span>
              <Link
                href="/balance"
                className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors"
              >
                <Banknote className="h-3.5 w-3.5" />
                <span>Withdrawal Requests Ledger</span>
              </Link>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--action-primary)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Simpan Pengaturan Payout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

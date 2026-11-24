'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Users, X } from 'lucide-react';
import {
  getTenantPartners,
  setTenantPartnerStatus,
  type TenantPartner,
  type TenantPartners,
} from '@/lib/payment-api';

interface TenantPartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrowProductId: string | null;
  escrowProductName?: string;
  orgId?: string;
  onShowAlert: (message: string, type?: string, title?: string) => void;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

/**
 * Wallet Tenant & partner satu Escrow Product (Tenant) — dilihat pemilik App
 * di Console. Wallet Tenant & pendaftaran partner diatur App atas nama
 * Tenant; di sini pemilik App hanya bisa membekukan/mengaktifkan partner.
 */
export default function TenantPartnersModal({
  isOpen,
  onClose,
  escrowProductId,
  escrowProductName,
  orgId,
  onShowAlert,
}: TenantPartnersModalProps) {
  const [data, setData] = useState<TenantPartners | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const showAlertRef = useRef(onShowAlert);
  showAlertRef.current = onShowAlert;

  const load = useCallback(async () => {
    if (!escrowProductId) return;
    try {
      setLoading(true);
      setData(await getTenantPartners(escrowProductId, orgId));
    } catch (err) {
      showAlertRef.current(
        (err as { message?: string })?.message || 'Gagal memuat partner tenant',
        'error',
        'Error',
      );
    } finally {
      setLoading(false);
    }
  }, [escrowProductId, orgId]);

  useEffect(() => {
    if (isOpen) {
      setData(null);
      load();
    }
  }, [isOpen, load]);

  const toggle = async (partner: TenantPartner) => {
    if (!escrowProductId) return;
    const next = partner.status === 'active' ? 'suspended' : 'active';
    if (
      next === 'suspended' &&
      !window.confirm(
        'Bekukan partner ini? Ia tidak bisa menerima alokasi atau bagian rilis baru sampai diaktifkan lagi.',
      )
    ) {
      return;
    }
    try {
      setTogglingId(partner.id);
      const updated = await setTenantPartnerStatus(escrowProductId, partner.id, next, orgId);
      setData((prev) =>
        prev
          ? { ...prev, partners: prev.partners.map((p) => (p.id === updated.id ? updated : p)) }
          : prev,
      );
    } catch (err) {
      showAlertRef.current(
        (err as { message?: string })?.message || 'Gagal mengubah status partner',
        'error',
        'Error',
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] p-4 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Partner Tenant</h2>
            <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
              {escrowProductName || escrowProductId}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              title="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 rounded-lg border border-[var(--border-default)] bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Wallet Tenant
            </p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
              {data?.tenant_wallet_id || '—'}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {data?.tenant_wallet_id
                ? 'Dana escrow ditahan di wallet ini dan sisa setelah fee & bagian partner masuk ke sini.'
                : 'Belum diatur — app memakai wallet penjual yang dikirim saat checkout.'}{' '}
              Diatur oleh app atas nama tenant.
            </p>
          </div>

          {loading && !data ? (
            <p className="py-10 text-center text-sm text-[var(--text-secondary)]">Memuat partner...</p>
          ) : !data || data.partners.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Users className="mb-3 h-8 w-8 text-[var(--text-secondary)] opacity-50" />
              <p className="text-sm text-[var(--text-secondary)]">
                Belum ada partner terdaftar di tenant ini.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.partners.map((partner) => {
                const active = partner.status === 'active';
                return (
                  <li
                    key={partner.id}
                    className="flex flex-col gap-3 rounded-lg border border-[var(--border-default)] bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[var(--bg-sidebar)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                          {partner.partner_type}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'
                          }`}
                        >
                          {active ? 'aktif' : 'beku'}
                        </span>
                        {partner.max_percentage !== null && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            maks. {partner.max_percentage}%
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm text-[var(--text-primary)]" title={partner.external_ref}>
                        Ref app: {partner.external_ref}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-[var(--text-secondary)]" title={partner.wallet_id}>
                        Wallet {shortId(partner.wallet_id)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(partner)}
                      disabled={togglingId === partner.id}
                      className={`w-full flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 sm:w-auto ${
                        active
                          ? 'border border-[var(--border-default)] text-[var(--text-danger)] hover:bg-white/5'
                          : 'bg-[var(--action-primary)] text-white hover:opacity-90'
                      }`}
                    >
                      {togglingId === partner.id ? 'Menyimpan...' : active ? 'Bekukan' : 'Aktifkan'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

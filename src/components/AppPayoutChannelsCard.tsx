'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, RefreshCw } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import {
  listAppPayoutChannels,
  setAppPayoutChannel,
  type AppPayoutChannel,
} from '@/lib/payment-api';

const PROVIDER_LABELS: Record<string, string> = {
  manual: 'Transfer manual',
  midtrans: 'Transfer otomatis (Midtrans Iris)',
  duitku: 'Transfer otomatis (Duitku)',
};

function feeLabel(channel: AppPayoutChannel): string {
  const parts: string[] = [];
  if (channel.fixedFee > 0) parts.push(formatMoney(channel.fixedFee, channel.currency));
  if (channel.percentageFee > 0) parts.push(`${channel.percentageFee}%`);
  return parts.length ? `Biaya ${parts.join(' + ')}` : 'Tanpa biaya';
}

interface AppPayoutChannelsCardProps {
  appId: string;
  orgId?: string;
  onShowAlert: (message: string, type?: string, title?: string) => void;
}

/**
 * Self-service owner app: sembunyikan channel payout untuk user app ini
 * (cermin toggle Payment Methods). Daftar channel dikelola Bagdja.
 */
export default function AppPayoutChannelsCard({ appId, orgId, onShowAlert }: AppPayoutChannelsCardProps) {
  const [channels, setChannels] = useState<AppPayoutChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Ref agar callback inline dari parent tidak memicu fetch ulang tiap render.
  const showAlertRef = useRef(onShowAlert);
  showAlertRef.current = onShowAlert;

  const load = useCallback(async () => {
    if (!appId) return;
    try {
      setLoading(true);
      setChannels(await listAppPayoutChannels(appId, orgId));
    } catch (err) {
      showAlertRef.current(
        (err as { message?: string })?.message || 'Failed to load payout channels',
        'error',
        'Error',
      );
    } finally {
      setLoading(false);
    }
  }, [appId, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, AppPayoutChannel[]>();
    channels.forEach((channel) => {
      const list = map.get(channel.methodCode) || [];
      list.push(channel);
      map.set(channel.methodCode, list);
    });
    return Array.from(map.entries());
  }, [channels]);

  const toggle = async (channel: AppPayoutChannel) => {
    const nextEnabled = !channel.isEnabledForApp;
    try {
      setTogglingId(channel.id);
      await setAppPayoutChannel(channel.id, appId, nextEnabled, orgId);
      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, isEnabledForApp: nextEnabled } : c)),
      );
    } catch (err) {
      showAlertRef.current(
        (err as { message?: string })?.message || 'Failed to update payout channel',
        'error',
        'Error',
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Payout Channels</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Pilihan transfer yang bisa dipakai user app ini saat menarik dana. Channel dan biayanya
            dikonfigurasi Bagdja — Anda hanya bisa menyembunyikannya.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && channels.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-secondary)] text-sm">
            Loading payout channels...
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowDownLeft className="h-8 w-8 text-[var(--text-secondary)] opacity-50 mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">
              Belum ada channel payout yang tersedia untuk app ini.
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {grouped.map(([methodCode, items]) => (
              <div key={methodCode}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {methodCode}
                </p>
                <div className="space-y-3">
                  {items.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[var(--border-default)] bg-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {PROVIDER_LABELS[channel.provider] || channel.provider}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {feeLabel(channel)}
                          {channel.estimatedTime ? ` · ${channel.estimatedTime}` : ''}
                        </p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={channel.isEnabledForApp}
                        disabled={togglingId === channel.id}
                        onClick={() => toggle(channel)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                          channel.isEnabledForApp ? 'bg-[var(--action-primary)]' : 'bg-white/10'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            channel.isEnabledForApp ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

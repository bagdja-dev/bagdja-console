'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle, Building2 } from 'lucide-react';
import {
  upsertPayoutEngineConfig,
  type PayoutEngineConfig,
} from '@/lib/payment-api';

interface PayoutEngineConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: PayoutEngineConfig | null;
}

const PROVIDERS = [
  { id: 'manual', name: 'Manual Bank Transfer' },
  { id: 'midtrans', name: 'Midtrans Iris' },
  { id: 'duitku', name: 'Duitku Disbursement' },
];

export default function PayoutEngineConfigModal({
  isOpen,
  onClose,
  onSuccess,
  config,
}: PayoutEngineConfigModalProps) {
  const [provider, setProvider] = useState('manual');
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('default');
  const [appId, setAppId] = useState('default');
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setName(config.name);
      setOrgId(config.orgId);
      setAppId(config.appId);
      setIsActive(config.isActive);
      setDescription(config.description || '');
    } else {
      setProvider('manual');
      setName('Manual Bank Transfer');
      setOrgId('default');
      setAppId('default');
      setIsActive(true);
      setDescription('');
    }
    setError(null);
  }, [config, isOpen]);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    if (!config) {
      const match = PROVIDERS.find((p) => p.id === newProvider);
      if (match) setName(match.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Display name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await upsertPayoutEngineConfig({
        provider,
        name: name.trim(),
        orgId: orgId.trim() || 'default',
        appId: appId.trim() || 'default',
        isActive,
        description: description.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save payout engine configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {config ? 'Edit Payout Engine Config' : 'Configure Payout Engine'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Platform infrastructure level payout service availability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Payout Provider Engine
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={!!config}
              className="w-full rounded-lg border border-[var(--border-default)] bg-black/20 px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none transition-colors disabled:opacity-50"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midtrans Iris Realtime"
              className="w-full rounded-lg border border-[var(--border-default)] bg-black/20 px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Org Scope (slug)
              </label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="default"
                disabled={!!config && config.orgId === 'default'}
                className="w-full rounded-lg border border-[var(--border-default)] bg-black/20 px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                Gunakan 'default' untuk semua organisasi
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                App Scope (slug)
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="default"
                disabled={!!config && config.appId === 'default'}
                className="w-full rounded-lg border border-[var(--border-default)] bg-black/20 px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                Gunakan 'default' untuk semua aplikasi
              </p>
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-[var(--border-default)] bg-white/5">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Status Engine di Platform
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Jika dinonaktifkan, aplikasi dalam scope ini tidak akan dapat menggunakan engine ini.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-[var(--action-primary)]' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Description / Catatan
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informasi operasional engine ini..."
              className="w-full rounded-lg border border-[var(--border-default)] bg-black/20 px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg border border-[var(--border-default)] hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--action-primary)] hover:opacity-90 rounded-lg shadow transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Simpan Konfigurasi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

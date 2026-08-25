'use client';

import { useState, useEffect } from 'react';
import type { EscrowProduct, CreateEscrowProductRequest, UpdateEscrowProductRequest, ApiError } from '@/types';
import { ProductStatus } from '@/types';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import { X, Code2, AlertCircle } from 'lucide-react';
import { listEscrowFeeConfigs } from '@/lib/escrow-fee-configs-api';
import { PercentFeeInput } from '@/components/billing/FeeInputFields';

/**
 * Fee override khusus 1 escrow product, opsional. `active: false` berarti
 * "matikan override yang sudah ada" (upsert `is_active:false`) — dikirim
 * hanya kalau sebelumnya memang ada override aktif, supaya tidak membuat
 * baris `escrow_fee_configs` baru yang tidak perlu untuk produk yang belum
 * pernah di-override. `null` = tidak ada perubahan sama sekali.
 */
export type EscrowProductFeeOverride =
  | {
      active: true;
      platform_fixed_fee: number;
      platform_percentage_fee: number;
      platform_minimum_fee: number;
      platform_maximum_fee: number | null;
      platform_minimum_transaction_amount: number;
      app_fixed_fee: number;
      app_percentage_fee: number;
      app_minimum_fee: number;
      app_maximum_fee: number | null;
      app_minimum_transaction_amount: number;
    }
  | { active: false }
  | null;

interface EscrowProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateEscrowProductRequest | UpdateEscrowProductRequest,
    feeOverride: EscrowProductFeeOverride,
  ) => Promise<void>;
  escrowProduct?: EscrowProduct | null;
}

const CURRENCIES = ['IDR', 'USD', 'MYR', 'SGD'];

type FeeFormState = {
  platform_fixed_fee: string;
  platform_percentage_fee: string;
  platform_minimum_fee: string;
  platform_maximum_fee: string;
  platform_minimum_transaction_amount: string;
  app_fixed_fee: string;
  app_percentage_fee: string;
  app_minimum_fee: string;
  app_maximum_fee: string;
  app_minimum_transaction_amount: string;
};

const emptyFeeForm: FeeFormState = {
  platform_fixed_fee: '',
  platform_percentage_fee: '',
  platform_minimum_fee: '',
  platform_maximum_fee: '',
  platform_minimum_transaction_amount: '',
  app_fixed_fee: '',
  app_percentage_fee: '',
  app_minimum_fee: '',
  app_maximum_fee: '',
  app_minimum_transaction_amount: '',
};

type FormState = {
  name: string;
  description: string;
  currency: string;
  price: number;
  isDynamic: boolean;
  isActive: boolean;
  status: ProductStatus;
  releaseMode: string;
  milestoneRequired: boolean;
  allowPartialMilestoneRelease: boolean;
  disputeEnabled: boolean;
  releaseWindowEnforced: boolean;
  fullPaymentRequired: boolean;
  allowedPaymentMethodsText: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  currency: 'IDR',
  price: 0,
  isDynamic: false,
  isActive: true,
  status: ProductStatus.ACTIVE,
  releaseMode: 'buyer_confirmation',
  milestoneRequired: true,
  allowPartialMilestoneRelease: false,
  disputeEnabled: true,
  releaseWindowEnforced: false,
  fullPaymentRequired: true,
  allowedPaymentMethodsText: '',
};

export default function EscrowProductModal({ isOpen, onClose, onSubmit, escrowProduct }: EscrowProductModalProps) {
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataJson, setMetadataJson] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [feeOverrideEnabled, setFeeOverrideEnabled] = useState(false);
  const [feeForm, setFeeForm] = useState<FeeFormState>(emptyFeeForm);
  const [hadExistingFeeOverride, setHadExistingFeeOverride] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);

  useEffect(() => {
    if (escrowProduct) {
      setFormData({
        name: escrowProduct.name,
        description: escrowProduct.description || '',
        currency: escrowProduct.currency,
        price: escrowProduct.price ?? 0,
        isDynamic: escrowProduct.isDynamic,
        isActive: escrowProduct.isActive,
        status: escrowProduct.status,
        releaseMode: escrowProduct.releaseMode,
        milestoneRequired: escrowProduct.milestoneRequired,
        allowPartialMilestoneRelease: escrowProduct.allowPartialMilestoneRelease,
        disputeEnabled: escrowProduct.disputeEnabled,
        releaseWindowEnforced: escrowProduct.releaseWindowEnforced,
        fullPaymentRequired: escrowProduct.fullPaymentRequired,
        allowedPaymentMethodsText: (escrowProduct.allowedPaymentMethods || []).join(', '),
      });
      setMetadataJson(JSON.stringify(escrowProduct.metadata || {}, null, 2));
    } else {
      setFormData(emptyForm);
      setMetadataJson('{}');
    }
    setError(null);
    setJsonError(null);
  }, [escrowProduct, isOpen]);

  // Fee override — hanya ada kalau produk sudah punya id (mode edit).
  // Mode create: belum ada product_id untuk di-filter, jadi mulai kosong
  // (checkbox tetap bisa diaktifkan; override baru benar-benar disubmit
  // setelah produk berhasil dibuat — lihat parent `handleEscrowProductSubmit`).
  useEffect(() => {
    if (!isOpen) return;
    if (!escrowProduct?.id) {
      setFeeOverrideEnabled(false);
      setFeeForm(emptyFeeForm);
      setHadExistingFeeOverride(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setFeeLoading(true);
      try {
        const configs = await listEscrowFeeConfigs({ product_id: escrowProduct.id });
        const active = configs.find((c) => c.isActive) ?? null;
        if (cancelled) return;
        if (active) {
          setFeeOverrideEnabled(true);
          setHadExistingFeeOverride(true);
          setFeeForm({
            platform_fixed_fee: String(active.platformFixedFee ?? 0),
            platform_percentage_fee: String(active.platformPercentageFee ?? 0),
            platform_minimum_fee: String(active.platformMinimumFee ?? 0),
            platform_maximum_fee: active.platformMaximumFee != null ? String(active.platformMaximumFee) : '',
            platform_minimum_transaction_amount: String(active.platformMinimumTransactionAmount ?? 0),
            app_fixed_fee: String(active.appFixedFee ?? 0),
            app_percentage_fee: String(active.appPercentageFee ?? 0),
            app_minimum_fee: String(active.appMinimumFee ?? 0),
            app_maximum_fee: active.appMaximumFee != null ? String(active.appMaximumFee) : '',
            app_minimum_transaction_amount: String(active.appMinimumTransactionAmount ?? 0),
          });
        } else {
          setFeeOverrideEnabled(false);
          setHadExistingFeeOverride(false);
          setFeeForm(emptyFeeForm);
        }
      } catch (err) {
        // Non-fatal — override section cukup mulai kosong/nonaktif kalau gagal fetch.
        console.error('Failed to fetch existing escrow fee override', err);
      } finally {
        if (!cancelled) setFeeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [escrowProduct, isOpen]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateJson = (jsonString: string): Record<string, any> | null => {
    if (!jsonString.trim()) return {};
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Metadata must be a JSON object');
        return null;
      }
      setJsonError(null);
      return parsed;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  };

  const formatJson = () => {
    const parsed = validateJson(metadataJson);
    if (parsed !== null) setMetadataJson(JSON.stringify(parsed, null, 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const metadata = validateJson(metadataJson);
      if (metadata === null) {
        setError('Please fix JSON errors in metadata');
        setLoading(false);
        return;
      }

      const allowedPaymentMethods = formData.allowedPaymentMethodsText
        .split(',')
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean);

      const submitData: CreateEscrowProductRequest = {
        name: formData.name,
        description: formData.description || undefined,
        currency: formData.currency,
        price: formData.isDynamic ? undefined : formData.price,
        isDynamic: formData.isDynamic,
        isActive: formData.isActive,
        status: formData.status,
        releaseMode: formData.releaseMode,
        milestoneRequired: formData.milestoneRequired,
        allowPartialMilestoneRelease: formData.allowPartialMilestoneRelease,
        disputeEnabled: formData.disputeEnabled,
        releaseWindowEnforced: formData.releaseWindowEnforced,
        fullPaymentRequired: formData.fullPaymentRequired,
        allowedPaymentMethods: allowedPaymentMethods.length > 0 ? allowedPaymentMethods : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      const feeOverride: EscrowProductFeeOverride = feeOverrideEnabled
        ? {
            active: true,
            platform_fixed_fee: feeForm.platform_fixed_fee ? Number(feeForm.platform_fixed_fee) : 0,
            platform_percentage_fee: feeForm.platform_percentage_fee ? Number(feeForm.platform_percentage_fee) : 0,
            platform_minimum_fee: feeForm.platform_minimum_fee ? Number(feeForm.platform_minimum_fee) : 0,
            platform_maximum_fee: feeForm.platform_maximum_fee ? Number(feeForm.platform_maximum_fee) : null,
            platform_minimum_transaction_amount: feeForm.platform_minimum_transaction_amount
              ? Number(feeForm.platform_minimum_transaction_amount)
              : 0,
            app_fixed_fee: feeForm.app_fixed_fee ? Number(feeForm.app_fixed_fee) : 0,
            app_percentage_fee: feeForm.app_percentage_fee ? Number(feeForm.app_percentage_fee) : 0,
            app_minimum_fee: feeForm.app_minimum_fee ? Number(feeForm.app_minimum_fee) : 0,
            app_maximum_fee: feeForm.app_maximum_fee ? Number(feeForm.app_maximum_fee) : null,
            app_minimum_transaction_amount: feeForm.app_minimum_transaction_amount
              ? Number(feeForm.app_minimum_transaction_amount)
              : 0,
          }
        : hadExistingFeeOverride
          ? { active: false }
          : null;

      await onSubmit(submitData, feeOverride);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to save escrow product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {escrowProduct ? 'Edit Escrow Product' : 'Create Escrow Product'}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Katalog/policy escrow — biasanya 1 per website tenant, dipakai untuk semua produknya saat checkout.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            disabled={loading}
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

          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={loading}
            placeholder="e.g., Toko Barber Jaya"
            helpText="Rekomendasi: pakai nama website tenant supaya mudah dicari."
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent placeholder:text-[var(--text-muted)]"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              disabled={loading}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>

            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.isDynamic}
                onChange={(e) => setFormData({ ...formData, isDynamic: e.target.checked })}
                disabled={loading}
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Dynamic amount (set per escrow, e.g. cart total)</span>
            </label>
          </div>

          {!formData.isDynamic && (
            <Input
              label="Fixed Price"
              type="number"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              disabled={loading}
              placeholder="0"
            />
          )}

          <div className="border border-[var(--border-default)] rounded-lg p-4 space-y-3 bg-[var(--bg-sidebar)]/30">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Escrow Policy</h3>

            <Input
              label="Release Mode"
              value={formData.releaseMode}
              onChange={(e) => setFormData({ ...formData, releaseMode: e.target.value })}
              disabled={loading}
              placeholder="buyer_confirmation"
              helpText="Informasi saja untuk app pemanggil — payment-service tidak menegakkan ini."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.milestoneRequired}
                  onChange={(e) => setFormData({ ...formData, milestoneRequired: e.target.checked })}
                  disabled={loading}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Milestone required</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allowPartialMilestoneRelease}
                  onChange={(e) => setFormData({ ...formData, allowPartialMilestoneRelease: e.target.checked })}
                  disabled={loading}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Allow partial milestone release</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.disputeEnabled}
                  onChange={(e) => setFormData({ ...formData, disputeEnabled: e.target.checked })}
                  disabled={loading}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Dispute enabled</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.releaseWindowEnforced}
                  onChange={(e) => setFormData({ ...formData, releaseWindowEnforced: e.target.checked })}
                  disabled={loading}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Enforce release window</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.fullPaymentRequired}
                  onChange={(e) => setFormData({ ...formData, fullPaymentRequired: e.target.checked })}
                  disabled={loading}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Full payment required</span>
              </label>
            </div>
          </div>

          <div className="border border-[var(--border-default)] rounded-lg p-4 space-y-3 bg-[var(--bg-sidebar)]/30">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={feeOverrideEnabled}
                onChange={(e) => setFeeOverrideEnabled(e.target.checked)}
                disabled={loading || feeLoading}
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Override fee khusus produk ini
              </span>
            </label>
            <p className="text-xs text-[var(--text-secondary)]">
              Kosongkan / matikan untuk memakai fee yang di-set platform (default global atau scope org/app Anda) saat release.
            </p>

            {feeOverrideEnabled && (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-[var(--border-default)] p-3 space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Platform fee (Bagdja)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Fixed fee"
                      type="number"
                      min={0}
                      value={feeForm.platform_fixed_fee}
                      onChange={(e) => setFeeForm((prev) => ({ ...prev, platform_fixed_fee: e.target.value }))}
                      disabled={loading}
                      placeholder="0"
                    />
                    <PercentFeeInput
                      id="escrow-product-platform-percentage-fee"
                      label="Percentage fee"
                      value={feeForm.platform_percentage_fee}
                      onChange={(val) => setFeeForm((prev) => ({ ...prev, platform_percentage_fee: val }))}
                      disabled={loading}
                    />
                    <Input
                      label="Minimum fee"
                      type="number"
                      min={0}
                      value={feeForm.platform_minimum_fee}
                      onChange={(e) => setFeeForm((prev) => ({ ...prev, platform_minimum_fee: e.target.value }))}
                      disabled={loading}
                      placeholder="0"
                    />
                    <Input
                      label="Maximum fee"
                      type="number"
                      min={0}
                      value={feeForm.platform_maximum_fee}
                      onChange={(e) => setFeeForm((prev) => ({ ...prev, platform_maximum_fee: e.target.value }))}
                      disabled={loading}
                      placeholder="Tidak ada cap"
                    />
                    <Input
                      label="Minimum transaction amount"
                      type="number"
                      min={0}
                      value={feeForm.platform_minimum_transaction_amount}
                      onChange={(e) =>
                        setFeeForm((prev) => ({
                          ...prev,
                          platform_minimum_transaction_amount: e.target.value,
                        }))
                      }
                      disabled={loading}
                      placeholder="0"
                      helpText="Ambang bebas-fee khusus platform_fee — di bawah nominal ini, platform_fee = 0."
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] p-3 space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-[var(--text-secondary)]">App fee (aggregator)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Fixed fee"
                      type="number"
                      min={0}
                      value={feeForm.app_fixed_fee}
                      onChange={(e) => setFeeForm((prev) => ({ ...prev, app_fixed_fee: e.target.value }))}
                      disabled={loading}
                      placeholder="0"
                    />
                    <PercentFeeInput
                      id="escrow-product-app-percentage-fee"
                      label="Percentage fee"
                      value={feeForm.app_percentage_fee}
                      onChange={(val) => setFeeForm((prev) => ({ ...prev, app_percentage_fee: val }))}
                      disabled={loading}
                    />
                    <Input
                      label="Minimum fee"
                      type="number"
                      min={0}
                      value={feeForm.app_minimum_fee}
                      onChange={(e) => setFeeForm((prev) => ({ ...prev, app_minimum_fee: e.target.value }))}
                      disabled={loading}
                      placeholder="0"
                    />
                    <Input
                      label="Maximum fee"
                      type="number"
                      min={0}
                      value={feeForm.app_maximum_fee}
                      onChange={(e) => setFeeForm((prev) => ({ ...prev, app_maximum_fee: e.target.value }))}
                      disabled={loading}
                      placeholder="Tidak ada cap"
                    />
                    <Input
                      label="Minimum transaction amount"
                      type="number"
                      min={0}
                      value={feeForm.app_minimum_transaction_amount}
                      onChange={(e) =>
                        setFeeForm((prev) => ({ ...prev, app_minimum_transaction_amount: e.target.value }))
                      }
                      disabled={loading}
                      placeholder="0"
                      helpText="Ambang bebas-fee khusus app_fee — di bawah nominal ini, app_fee = 0."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Input
            label="Allowed Payment Methods (optional)"
            value={formData.allowedPaymentMethodsText}
            onChange={(e) => setFormData({ ...formData, allowedPaymentMethodsText: e.target.value })}
            disabled={loading}
            placeholder="QRIS, VA, INTERNAL_WALLET"
            helpText="Pisahkan dengan koma. Kosongkan untuk mengizinkan semua metode."
          />

          <div className="border-t border-[var(--border-default)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Metadata (Optional)</h3>
              <button
                type="button"
                onClick={formatJson}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors disabled:opacity-50"
                title="Format JSON"
              >
                <Code2 className="h-3 w-3" />
                Format
              </button>
            </div>
            <textarea
              value={metadataJson}
              onChange={(e) => {
                setMetadataJson(e.target.value);
                if (jsonError) validateJson(e.target.value);
              }}
              onBlur={() => validateJson(metadataJson)}
              disabled={loading}
              rows={6}
              className={`
                w-full px-4 py-2 border rounded-lg
                bg-[var(--bg-surface)] text-[var(--text-primary)]
                border-[var(--border-default)]
                focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent
                placeholder:text-[var(--text-muted)]
                font-mono text-sm
                disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50
                ${jsonError ? 'border-[var(--brand-error)]' : ''}
              `}
              placeholder='{\n  "website_id": "..."\n}'
              spellCheck={false}
            />
            {jsonError && (
              <div className="mt-2 flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 text-xs">{jsonError}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })}
              disabled={loading}
            >
              <option value={ProductStatus.ACTIVE}>Active</option>
              <option value={ProductStatus.INACTIVE}>Inactive</option>
            </Select>

            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                disabled={loading}
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Is Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : escrowProduct ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

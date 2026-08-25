'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, X, Building2, AppWindow, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/ui/button';
import { FancySelect } from '@/ui/fancy-select';
import { getAllOrganizations, getAppsByOrgSlug } from '@/lib/api';
import { getEscrowProducts } from '@/lib/escrow-products-api';
import type { ApiError, Organization, ClientApp, EscrowProduct } from '@/types';
import type { EscrowFeeConfig, UpsertEscrowFeeConfigRequest } from '@/lib/escrow-fee-configs-api';
import { PercentFeeInput } from '@/components/billing/FeeInputFields';
import { Input } from '@/ui/input';

const DEFAULT_SCOPE = 'default';

type FormState = {
  org_id: string;
  app_id: string;
  product_id: string;
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
  is_active: boolean;
};

const emptyForm: FormState = {
  org_id: DEFAULT_SCOPE,
  app_id: DEFAULT_SCOPE,
  product_id: DEFAULT_SCOPE,
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
  is_active: true,
};

export default function EscrowFeeConfigModal({
  isOpen,
  config,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  config: EscrowFeeConfig | null;
  onClose: () => void;
  onSubmit: (payload: UpsertEscrowFeeConfigRequest) => Promise<void>;
}) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [apps, setApps] = useState<ClientApp[]>([]);
  const [escrowProducts, setEscrowProducts] = useState<EscrowProduct[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(config);
  const isGlobalOrg = form.org_id === DEFAULT_SCOPE;
  const isDefaultApp = form.app_id === DEFAULT_SCOPE;
  const canSelectProduct = Boolean(form.org_id) && !isGlobalOrg && Boolean(form.app_id) && !isDefaultApp;

  useEffect(() => {
    if (!isOpen) return;
    fetchOrganizations();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (form.org_id && form.org_id !== DEFAULT_SCOPE) {
      fetchApps(form.org_id);
    } else {
      setApps([]);
    }
  }, [form.org_id, isOpen]);

  useEffect(() => {
    if (!isOpen || !canSelectProduct) {
      setEscrowProducts([]);
      return;
    }
    const app = apps.find((a) => (a.appId || a.id) === form.app_id);
    if (!app?.appId) {
      setEscrowProducts([]);
      return;
    }
    fetchEscrowProducts(app.appId);
  }, [form.app_id, apps, canSelectProduct, isOpen]);

  async function fetchOrganizations() {
    try {
      setLoadingLookups(true);
      setError(null);
      const data = await getAllOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to fetch organizations', err);
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch organizations from Auth Service');
    } finally {
      setLoadingLookups(false);
    }
  }

  async function fetchApps(orgSlug: string) {
    try {
      setError(null);
      const data = await getAppsByOrgSlug(orgSlug);
      setApps(data);
    } catch (err) {
      console.error('Failed to fetch apps', err);
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch applications from Auth Service');
    }
  }

  async function fetchEscrowProducts(appSlug: string) {
    try {
      setLoadingProducts(true);
      setError(null);
      const data = await getEscrowProducts(appSlug);
      setEscrowProducts(data);
    } catch (err) {
      console.error('Failed to fetch escrow products', err);
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch escrow products from Payment Service');
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (config) {
      setForm({
        org_id: config.orgId,
        app_id: config.appId,
        product_id: config.productId || DEFAULT_SCOPE,
        platform_fixed_fee: config.platformFixedFee != null ? String(config.platformFixedFee) : '',
        platform_percentage_fee: config.platformPercentageFee != null ? String(config.platformPercentageFee) : '',
        platform_minimum_fee: config.platformMinimumFee != null ? String(config.platformMinimumFee) : '',
        platform_maximum_fee: config.platformMaximumFee != null ? String(config.platformMaximumFee) : '',
        platform_minimum_transaction_amount:
          config.platformMinimumTransactionAmount != null
            ? String(config.platformMinimumTransactionAmount)
            : '',
        app_fixed_fee: config.appFixedFee != null ? String(config.appFixedFee) : '',
        app_percentage_fee: config.appPercentageFee != null ? String(config.appPercentageFee) : '',
        app_minimum_fee: config.appMinimumFee != null ? String(config.appMinimumFee) : '',
        app_maximum_fee: config.appMaximumFee != null ? String(config.appMaximumFee) : '',
        app_minimum_transaction_amount:
          config.appMinimumTransactionAmount != null ? String(config.appMinimumTransactionAmount) : '',
        is_active: config.isActive,
      });
    } else {
      setForm(emptyForm);
    }
  }, [config, isOpen]);

  const disabled = submitting || loadingLookups;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: UpsertEscrowFeeConfigRequest = {
        org_id: form.org_id !== DEFAULT_SCOPE ? form.org_id : undefined,
        app_id: form.app_id !== DEFAULT_SCOPE ? form.app_id : undefined,
        product_id: form.product_id !== DEFAULT_SCOPE ? form.product_id : undefined,
        platform_fixed_fee: form.platform_fixed_fee ? Number(form.platform_fixed_fee) : 0,
        platform_percentage_fee: form.platform_percentage_fee ? Number(form.platform_percentage_fee) : 0,
        platform_minimum_fee: form.platform_minimum_fee ? Number(form.platform_minimum_fee) : 0,
        platform_maximum_fee: form.platform_maximum_fee ? Number(form.platform_maximum_fee) : null,
        platform_minimum_transaction_amount: form.platform_minimum_transaction_amount
          ? Number(form.platform_minimum_transaction_amount)
          : 0,
        app_fixed_fee: form.app_fixed_fee ? Number(form.app_fixed_fee) : 0,
        app_percentage_fee: form.app_percentage_fee ? Number(form.app_percentage_fee) : 0,
        app_minimum_fee: form.app_minimum_fee ? Number(form.app_minimum_fee) : 0,
        app_maximum_fee: form.app_maximum_fee ? Number(form.app_maximum_fee) : null,
        app_minimum_transaction_amount: form.app_minimum_transaction_amount
          ? Number(form.app_minimum_transaction_amount)
          : 0,
        is_active: form.is_active,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to save escrow fee config');
    } finally {
      setSubmitting(false);
    }
  };

  const orgOptions = useMemo(
    () => [
      {
        value: DEFAULT_SCOPE,
        label: 'Default — all organizations',
        description: 'Global fallback scope (platform only)',
        icon: <Building2 className="w-4 h-4 text-primary" />,
      },
      ...organizations.map((org) => ({
        value: org.orgId || org.id,
        label: org.name,
        description: org.orgId || org.id,
        icon: <Building2 className="w-4 h-4 text-emerald-500" />,
      })),
    ],
    [organizations],
  );

  if (!isOpen) return null;

  const appOptions = [
    {
      value: DEFAULT_SCOPE,
      label: 'Default — all applications',
      description: isGlobalOrg ? 'Required for the global scope' : 'Applies to every escrow product in this org',
      icon: <AppWindow className="w-4 h-4 text-amber-500" />,
    },
    ...(isGlobalOrg
      ? []
      : apps.map((app) => ({
          value: app.appId || app.id,
          label: app.appName,
          description: app.appId,
          icon: <AppWindow className="w-4 h-4 text-indigo-500" />,
        }))),
  ];

  const productOptions = [
    {
      value: DEFAULT_SCOPE,
      label: 'Default — all escrow products',
      description: isDefaultApp ? 'Select a specific app to target one escrow product' : 'Applies to every escrow product in this app',
      icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
    },
    ...escrowProducts.map((p) => ({
      value: p.id,
      label: p.name,
      description: p.id,
      icon: <ShieldCheck className="w-4 h-4 text-indigo-500" />,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {isEdit ? 'Edit escrow fee config' : 'Create escrow fee config'}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Dipotong dari dana milestone saat <span className="font-medium">release</span> — bukan saat checkout. Resolusi: produk spesifik → app → org → default global.
            </p>
          </div>
          <button
            type="button"
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FancySelect
              label="Organization"
              value={form.org_id}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, org_id: val, app_id: DEFAULT_SCOPE, product_id: DEFAULT_SCOPE }))
              }
              disabled={disabled || isEdit}
              placeholder="Default — all organizations"
              options={orgOptions}
              loading={loadingLookups}
            />

            <FancySelect
              label="Application"
              value={form.app_id}
              onChange={(val) => setForm((prev) => ({ ...prev, app_id: val, product_id: DEFAULT_SCOPE }))}
              disabled={disabled || isEdit || !form.org_id || isGlobalOrg}
              placeholder="Default — all applications"
              options={appOptions}
            />
          </div>

          <FancySelect
            label="Escrow Product"
            value={form.product_id}
            onChange={(val) => setForm((prev) => ({ ...prev, product_id: val }))}
            disabled={disabled || isEdit || !canSelectProduct}
            placeholder="Default — all escrow products"
            options={productOptions}
            loading={loadingProducts}
          />

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)]/50 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Platform fee (Bagdja)</h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Dipotong ke wallet org bagdja saat release.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Fixed fee"
                type="number"
                min={0}
                value={form.platform_fixed_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, platform_fixed_fee: e.target.value }))}
                disabled={disabled}
                placeholder="0"
                helpText="Dalam mata uang escrow product (biasanya IDR)."
              />
              <PercentFeeInput
                id="escrow-platform-percentage-fee"
                label="Percentage fee"
                value={form.platform_percentage_fee}
                onChange={(val) => setForm((prev) => ({ ...prev, platform_percentage_fee: val }))}
                disabled={disabled}
              />
              <Input
                label="Minimum fee"
                type="number"
                min={0}
                value={form.platform_minimum_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, platform_minimum_fee: e.target.value }))}
                disabled={disabled}
                placeholder="0"
                helpText="Floor — dipakai kalau (fixed + persen) di bawah nilai ini. 0 = tidak ada floor."
              />
              <Input
                label="Maximum fee"
                type="number"
                min={0}
                value={form.platform_maximum_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, platform_maximum_fee: e.target.value }))}
                disabled={disabled}
                placeholder="Tidak ada cap"
                helpText="Cap — dipakai kalau (fixed + persen) di atas nilai ini. Kosongkan = tidak ada cap."
              />
              <Input
                label="Minimum transaction amount"
                type="number"
                min={0}
                value={form.platform_minimum_transaction_amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, platform_minimum_transaction_amount: e.target.value }))
                }
                disabled={disabled}
                placeholder="0"
                helpText="Ambang bebas-fee KHUSUS platform_fee — di bawah nilai ini, platform_fee = 0 (release tetap jalan). 0 = selalu dipungut."
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)]/50 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">App fee (aggregator)</h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Dipotong ke wallet org app pemanggil (mis. Website Builder) saat release.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Fixed fee"
                type="number"
                min={0}
                value={form.app_fixed_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, app_fixed_fee: e.target.value }))}
                disabled={disabled}
                placeholder="0"
              />
              <PercentFeeInput
                id="escrow-app-percentage-fee"
                label="Percentage fee"
                value={form.app_percentage_fee}
                onChange={(val) => setForm((prev) => ({ ...prev, app_percentage_fee: val }))}
                disabled={disabled}
              />
              <Input
                label="Minimum fee"
                type="number"
                min={0}
                value={form.app_minimum_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, app_minimum_fee: e.target.value }))}
                disabled={disabled}
                placeholder="0"
                helpText="Floor — dipakai kalau (fixed + persen) di bawah nilai ini. 0 = tidak ada floor."
              />
              <Input
                label="Maximum fee"
                type="number"
                min={0}
                value={form.app_maximum_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, app_maximum_fee: e.target.value }))}
                disabled={disabled}
                placeholder="Tidak ada cap"
                helpText="Cap — dipakai kalau (fixed + persen) di atas nilai ini. Kosongkan = tidak ada cap."
              />
              <Input
                label="Minimum transaction amount"
                type="number"
                min={0}
                value={form.app_minimum_transaction_amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, app_minimum_transaction_amount: e.target.value }))
                }
                disabled={disabled}
                placeholder="0"
                helpText="Ambang bebas-fee KHUSUS app_fee — di bawah nilai ini, app_fee = 0 (release tetap jalan). 0 = selalu dipungut."
              />
            </div>
          </div>

          <FancySelect
            label="Status"
            value={form.is_active ? 'true' : 'false'}
            onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
            disabled={disabled}
            searchable={false}
            options={[
              { value: 'true', label: 'Active', description: 'Used in fee resolution', icon: <div className="w-2 h-2 rounded-full bg-emerald-500" /> },
              { value: 'false', label: 'Inactive', description: 'Skipped during resolution', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> },
            ]}
          />

          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[var(--text-secondary)]">
platform_fee = 0 kalau amount di bawah "Minimum transaction amount" platform, selain itu clamp(fixed+persen×amount, minimum, maximum) — app_fee sama, dengan ambangnya sendiri · seller_credit = amount − platform_fee − app_fee. Kalau tidak ada config sama sekali di scope manapun, fee = 0 (seller terima penuh).
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={disabled}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isEdit ? 'Save changes' : 'Create config'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, X, Building2, AppWindow, Coins, Info, Package } from 'lucide-react';
import { Button } from '@/ui/button';
import { FancySelect } from '@/ui/fancy-select';
import { getAllOrganizations, getAppsByOrgSlug, getSupportedCurrencies } from '@/lib/api';
import { getProducts } from '@/lib/products-api';
import type { ApiError, Organization, ClientApp, Product } from '@/types';
import type { BillingSetting } from '@/lib/payment-api';
import {
  percentageFeeFromInput,
  percentageFeeToInput,
} from '@/lib/billing-utils';
import {
  BILLING_DEFAULT_APP,
  BILLING_DEFAULT_CURRENCY,
  BILLING_DEFAULT_ORG,
  BILLING_DEFAULT_PRODUCT,
  describeHierarchyStep,
  formatRuleKeyLabel,
  isSystemGlobalKeys,
} from '@/lib/billing-hierarchy';
import { parseAmount } from '@/lib/billing-format';
import { CurrencyAmountInput, PercentFeeInput } from '@/components/billing/FeeInputFields';

type Mode = 'create' | 'edit';

type FormState = {
  org_id: string;
  app_id: string;
  product_id: string;
  currency: string;
  fixed_fee: string;
  percentage_fee: string;
  fixed_cap_fee: string;
  max_service_fee: string;
  is_active: boolean;
};

export default function BillingSettingModal({
  isOpen,
  mode,
  setting,
  isLoadingInitial,
  onClose,
  onSubmit,
  onEditSystemGlobal,
}: {
  isOpen: boolean;
  mode: Mode;
  setting: BillingSetting | null;
  isLoadingInitial?: boolean;
  onClose: () => void;
  onSubmit: (payload: BillingSetting) => Promise<void>;
  onEditSystemGlobal?: () => void;
}) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [apps, setApps] = useState<ClientApp[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['IDR', 'USD', 'MYR']);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const defaultCurrency = supportedCurrencies[0] ?? 'IDR';

  const emptyForm = useMemo<FormState>(
    () => ({
      org_id: '',
      app_id: BILLING_DEFAULT_APP,
      product_id: BILLING_DEFAULT_PRODUCT,
      currency: defaultCurrency,
      fixed_fee: '',
      percentage_fee: '',
      fixed_cap_fee: '',
      max_service_fee: '',
      is_active: true,
    }),
    [defaultCurrency],
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountDisplayCurrency =
    form.currency === BILLING_DEFAULT_CURRENCY ? defaultCurrency : form.currency;

  const isGlobalOrg = form.org_id === BILLING_DEFAULT_ORG;
  const isDefaultApp = form.app_id === BILLING_DEFAULT_APP;
  const canSelectProduct =
    Boolean(form.org_id) && !isGlobalOrg && Boolean(form.app_id) && !isDefaultApp;
  const isSystemGlobalRule = isSystemGlobalKeys(
    form.org_id,
    form.app_id,
    form.product_id,
    form.currency,
  );

  const hierarchyHint =
    form.org_id && form.app_id && form.product_id && form.currency
      ? describeHierarchyStep(form.org_id, form.app_id, form.product_id, form.currency)
      : 'Select organization, application, product, and currency.';

  useEffect(() => {
    if (!isOpen) return;
    fetchOrganizations();
    fetchCurrencies();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (form.org_id && form.org_id !== BILLING_DEFAULT_ORG) {
      fetchApps(form.org_id);
    } else {
      setApps([]);
    }
  }, [form.org_id, isOpen]);

  useEffect(() => {
    if (!isOpen || !canSelectProduct) {
      setProducts([]);
      return;
    }
    const app = apps.find((a) => (a.appId || a.id) === form.app_id);
    if (!app?.id) {
      setProducts([]);
      return;
    }
    fetchProducts(app.id);
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

  async function fetchCurrencies() {
    try {
      const data = await getSupportedCurrencies();
      if (data?.length) setSupportedCurrencies(data);
    } catch (err) {
      console.error('Failed to fetch supported currencies', err);
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

  async function fetchProducts(appUuid: string) {
    try {
      setLoadingProducts(true);
      setError(null);
      const data = await getProducts(appUuid);
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch products from Auth Service');
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (mode === 'edit' && setting) {
      setForm({
        org_id: setting.org_id,
        app_id: setting.app_id,
        product_id: setting.product_id || BILLING_DEFAULT_PRODUCT,
        currency: setting.currency,
        fixed_fee: setting.fixed_fee != null ? String(setting.fixed_fee) : '',
        percentage_fee:
          setting.percentage_fee != null
            ? String(percentageFeeToInput(setting.percentage_fee))
            : '',
        fixed_cap_fee: setting.fixed_cap_fee?.toString() || '',
        max_service_fee: setting.max_service_fee?.toString() || '',
        is_active: setting.is_active,
      });
      return;
    }

    if (mode === 'create') {
      setForm(emptyForm);
    }
  }, [setting, emptyForm, isOpen, mode]);

  const disabled = Boolean(isLoadingInitial) || submitting || loadingLookups;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!form.org_id) {
      setError('Select an organization.');
      return;
    }

    if (form.product_id !== BILLING_DEFAULT_PRODUCT && isDefaultApp) {
      setError('Select a specific application before choosing a product.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: BillingSetting = {
        org_id: form.org_id,
        app_id: form.app_id || BILLING_DEFAULT_APP,
        product_id: form.product_id || BILLING_DEFAULT_PRODUCT,
        currency: form.currency || defaultCurrency,
        fixed_fee: parseAmount(form.fixed_fee),
        percentage_fee: percentageFeeFromInput(parseAmount(form.percentage_fee)),
        fixed_cap_fee: form.fixed_cap_fee ? parseAmount(form.fixed_cap_fee) : undefined,
        max_service_fee: form.max_service_fee ? parseAmount(form.max_service_fee) : undefined,
        is_active: form.is_active,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to save billing setting');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const orgOptions = [
    {
      value: BILLING_DEFAULT_ORG,
      label: 'Default — all organizations',
      description: 'System-wide fallback (steps 5-6 in hierarchy)',
      icon: <Building2 className="w-4 h-4 text-primary" />,
    },
    ...organizations.map((org) => ({
      value: org.slug || org.id,
      label: org.name,
      description: org.slug || org.id,
      icon: <Building2 className="w-4 h-4 text-emerald-500" />,
    })),
  ];

  const appOptions = [
    {
      value: BILLING_DEFAULT_APP,
      label: 'Default — all applications',
      description: isGlobalOrg
        ? 'Required for system-wide rules'
        : 'Applies to every app in this organization',
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
      value: BILLING_DEFAULT_PRODUCT,
      label: 'Default — all products',
      description: isDefaultApp
        ? 'Select a specific app to target one product'
        : 'Applies to every product in this app',
      icon: <Package className="w-4 h-4 text-amber-500" />,
    },
    ...products.map((product) => ({
      value: product.id,
      label: product.name,
      description: product.id,
      icon: <Package className="w-4 h-4 text-indigo-500" />,
    })),
  ];

  const currencyOptions = [
    {
      value: BILLING_DEFAULT_CURRENCY,
      label: 'Default — all currencies',
      description: 'Applies to any currency for this org/app',
      icon: <Coins className="w-4 h-4 text-primary" />,
    },
    ...supportedCurrencies.map((code) => ({
      value: code,
      label: code,
      description: `Specific currency: ${code}`,
      icon: <Coins className="w-4 h-4 text-amber-500" />,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {mode === 'create' ? 'Create billing rule' : 'Edit billing rule'}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Use <span className="font-medium">Default</span> in dropdowns for broader rules (all organizations / apps / products / currencies).
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

          {isLoadingInitial || loadingLookups || loadingProducts ? (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-secondary)] animate-pulse">
              Loading data from Auth Service...
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FancySelect
              label="Organization"
              value={form.org_id}
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  org_id: val,
                  app_id: BILLING_DEFAULT_APP,
                  product_id: BILLING_DEFAULT_PRODUCT,
                }))
              }
              disabled={disabled || mode === 'edit'}
              placeholder="Default — all organizations"
              options={orgOptions}
              loading={loadingLookups}
            />

            <FancySelect
              label="Application"
              value={form.app_id}
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  app_id: val,
                  product_id: BILLING_DEFAULT_PRODUCT,
                }))
              }
              disabled={disabled || mode === 'edit' || !form.org_id || isGlobalOrg}
              placeholder="Default — all applications"
              options={appOptions}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FancySelect
              label="Product"
              value={form.product_id}
              onChange={(val) => setForm((prev) => ({ ...prev, product_id: val }))}
              disabled={disabled || mode === 'edit' || !canSelectProduct}
              placeholder="Default — all products"
              options={productOptions}
              loading={loadingProducts}
            />

            <FancySelect
              label="Currency"
              value={form.currency}
              onChange={(val) => setForm((prev) => ({ ...prev, currency: val }))}
              disabled={disabled || mode === 'edit'}
              placeholder="Default — all currencies"
              searchable={false}
              options={currencyOptions}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FancySelect
              label="Status"
              value={form.is_active ? 'true' : 'false'}
              onChange={(val) => setForm((prev) => ({ ...prev, is_active: val === 'true' }))}
              disabled={disabled}
              searchable={false}
              options={[
                {
                  value: 'true',
                  label: 'Active',
                  description: 'Used in hierarchy lookup',
                  icon: <div className="w-2 h-2 rounded-full bg-emerald-500" />,
                },
                {
                  value: 'false',
                  label: 'Inactive',
                  description: 'Skipped during lookup',
                  icon: <div className="w-2 h-2 rounded-full bg-red-500" />,
                },
              ]}
            />
          </div>

          {form.org_id && form.app_id && form.product_id && form.currency ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {formatRuleKeyLabel(
                    form.org_id,
                    form.app_id,
                    form.product_id,
                    form.currency,
                  )}
                </p>
                <p className="mt-0.5 text-[var(--text-secondary)]">{hierarchyHint}</p>
                {isSystemGlobalRule ? (
                  <p className="mt-1 text-[var(--text-secondary)]">
                    Same rule as the Global Default card — you can also edit it there.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)]/50 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Fee structure</h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                If amount ≤ threshold → fixed fee; otherwise → percentage (capped by max).
                {form.currency === BILLING_DEFAULT_CURRENCY ? (
                  <span className=" block mt-1">
                    Amounts shown in {amountDisplayCurrency} (display only).
                  </span>
                ) : null}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CurrencyAmountInput
                id="billing-fixed-fee"
                label="Fixed fee"
                currency={amountDisplayCurrency}
                value={form.fixed_fee}
                onChange={(fixed_fee) => setForm((prev) => ({ ...prev, fixed_fee }))}
                disabled={disabled}
              />
              <PercentFeeInput
                id="billing-percentage-fee"
                value={form.percentage_fee}
                onChange={(percentage_fee) => setForm((prev) => ({ ...prev, percentage_fee }))}
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CurrencyAmountInput
                id="billing-fixed-cap"
                label="Threshold (transaction cap)"
                currency={amountDisplayCurrency}
                value={form.fixed_cap_fee}
                onChange={(fixed_cap_fee) => setForm((prev) => ({ ...prev, fixed_cap_fee }))}
                disabled={disabled}
                helpText="Above this amount, percentage fee applies instead of fixed."
                placeholder={amountDisplayCurrency === 'IDR' ? '150000' : '1000'}
              />
              <CurrencyAmountInput
                id="billing-max-fee"
                label="Max service fee"
                currency={amountDisplayCurrency}
                value={form.max_service_fee}
                onChange={(max_service_fee) => setForm((prev) => ({ ...prev, max_service_fee }))}
                disabled={disabled}
                helpText="Optional ceiling on the calculated fee."
                placeholder={amountDisplayCurrency === 'IDR' ? '250000' : '5000'}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={disabled}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {mode === 'create' ? 'Create rule' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

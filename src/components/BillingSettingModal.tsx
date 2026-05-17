'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, X, Building2, AppWindow, Coins } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { FancySelect } from '@/ui/fancy-select';
import { getAllOrganizations, getAppsByOrgSlug, getSupportedCurrencies } from '@/lib/api';
import type { ApiError, Organization, ClientApp } from '@/types';
import type { BillingSetting } from '@/lib/payment-api';
import {
  percentageFeeFromInput,
  percentageFeeToInput,
} from '@/lib/billing-utils';
import { parseAmount } from '@/lib/billing-format';
import { CurrencyAmountInput, PercentFeeInput } from '@/components/billing/FeeInputFields';

type Mode = 'create' | 'edit';

type FormState = {
  org_id: string;
  app_id: string;
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
}: {
  isOpen: boolean;
  mode: Mode;
  setting: BillingSetting | null;
  isLoadingInitial?: boolean;
  onClose: () => void;
  onSubmit: (payload: BillingSetting) => Promise<void>;
}) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [apps, setApps] = useState<ClientApp[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['IDR', 'USD', 'MYR']);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const defaultCurrency = supportedCurrencies[0] ?? 'IDR';

  const emptyForm = useMemo<FormState>(
    () => ({
      org_id: '',
      app_id: 'default',
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

  const isSystemGlobalRule =
    form.org_id === 'default' && form.app_id === 'default';

  useEffect(() => {
    if (!isOpen) return;
    fetchOrganizations();
    fetchCurrencies();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (form.org_id && form.org_id !== 'default') {
      fetchApps(form.org_id);
    } else {
      setApps([]);
    }
  }, [form.org_id, isOpen]);

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

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (mode === 'edit' && setting) {
      setForm({
        org_id: setting.org_id,
        app_id: setting.app_id,
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

    setSubmitting(true);
    setError(null);

    try {
      const payload: BillingSetting = {
        org_id: form.org_id,
        app_id: form.app_id,
        currency: form.currency,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {mode === 'create' ? 'Create billing rule' : 'Edit billing rule'}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Define fee structure for organizations and applications.
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

          {isLoadingInitial || loadingLookups ? (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-secondary)] animate-pulse">
              Loading data from Auth Service...
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FancySelect
              label="Organization"
              value={form.org_id}
              onChange={(val) => setForm((prev) => ({ ...prev, org_id: val, app_id: 'default' }))}
              disabled={disabled || mode === 'edit'}
              placeholder="Select Organization"
              options={[
                ...organizations.map(org => ({
                  value: org.slug || org.id,
                  label: org.name,
                  description: org.slug || org.id,
                  icon: <Building2 className="w-4 h-4 text-emerald-500" />
                }))
              ]}
              loading={loadingLookups}
            />

            <FancySelect
              label="Application"
              value={form.app_id}
              onChange={(val) => setForm((prev) => ({ ...prev, app_id: val }))}
              disabled={disabled || mode === 'edit' || !form.org_id}
              placeholder="All Applications (Default)"
              options={[
                {
                  value: 'default',
                  label: 'All Applications (Default)',
                  description: 'Apply to all apps in this organization',
                  icon: <AppWindow className="w-4 h-4 text-amber-500" />
                },
                ...apps.map(app => ({
                  value: app.appId || app.id,
                  label: app.appName,
                  description: app.appId,
                  icon: <AppWindow className="w-4 h-4 text-indigo-500" />
                }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isSystemGlobalRule ? (
              <Input
                label="Currency"
                value="DEFAULT"
                disabled
                readOnly
              />
            ) : (
              <FancySelect
                label="Currency"
                value={form.currency}
                onChange={(val) => setForm((prev) => ({ ...prev, currency: val }))}
                disabled={disabled || mode === 'edit'}
                placeholder="Select currency"
                searchable={false}
                options={supportedCurrencies.map((code) => ({
                  value: code,
                  label: code,
                  description: `Rule for ${code}`,
                  icon: <Coins className="w-4 h-4 text-amber-500" />,
                }))}
              />
            )}

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
                  description: 'Rule is currently applied',
                  icon: <div className="w-2 h-2 rounded-full bg-emerald-500" />
                },
                {
                  value: 'false',
                  label: 'Inactive',
                  description: 'Rule is disabled',
                  icon: <div className="w-2 h-2 rounded-full bg-red-500" />
                }
              ]}
            />
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)]/50 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Fee structure</h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                If amount ≤ threshold → fixed fee; otherwise → percentage of amount (capped by max service fee).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CurrencyAmountInput
                id="billing-fixed-fee"
                label="Fixed fee"
                currency={form.currency}
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
                label="Threshold (fixed cap)"
                currency={form.currency}
                value={form.fixed_cap_fee}
                onChange={(fixed_cap_fee) => setForm((prev) => ({ ...prev, fixed_cap_fee }))}
                disabled={disabled}
                helpText="Transactions above this amount use the percentage fee instead of the fixed fee."
                placeholder={form.currency === 'IDR' ? '100000' : '1000'}
              />
              <CurrencyAmountInput
                id="billing-max-fee"
                label="Max service fee"
                currency={form.currency}
                value={form.max_service_fee}
                onChange={(max_service_fee) => setForm((prev) => ({ ...prev, max_service_fee }))}
                disabled={disabled}
                helpText="Optional ceiling on the calculated platform fee."
                placeholder={form.currency === 'IDR' ? '50000' : '500'}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {mode === 'create' ? 'Create Rule' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

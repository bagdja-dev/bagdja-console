'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { FancySelect, type FancySelectOption } from '@/ui/fancy-select';
import type { PaymentMethodFee } from '@/lib/payment-fees-api';
import { getAllOrganizations, getAppsByOrgSlug } from '@/lib/api';

const GLOBAL_DEFAULT_OPTION: FancySelectOption = {
  value: 'default',
  label: 'Global default',
  description: 'Visible to every organization / app unless a more specific row exists',
};

interface PaymentFeeModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  fee: PaymentMethodFee | null;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

const MIDTRANS_PAYMENT_METHODS = [
  'bank_transfer',
  'credit_card',
  'qris',
  'gopay',
  'shopeepay',
  'ovo',
  'dana',
  'linkaja',
  'indomaret',
  'alfamart',
  'akulaku',
  'kredivo',
];

const INTERNAL_PAYMENT_METHODS = [
  'wallet',
];

// Duitku's `paymentMethod` values are their own short channel codes (not free-form
// slugs like Midtrans's) — the `value` here is sent as-is to Duitku's API via
// DuitkuProvider, so it must match their documented codes exactly.
const DUITKU_PAYMENT_METHODS = [
  { value: 'BC', label: 'BCA Virtual Account' },
  { value: 'M2', label: 'Mandiri Virtual Account' },
  { value: 'BT', label: 'Permata Virtual Account' },
  { value: 'B1', label: 'CIMB Niaga Virtual Account' },
  { value: 'VA', label: 'Maybank Virtual Account' },
  { value: 'I1', label: 'BNI Virtual Account' },
  { value: 'A1', label: 'ATM Bersama Virtual Account' },
  { value: 'OV', label: 'OVO' },
  { value: 'DA', label: 'DANA' },
  { value: 'SP', label: 'ShopeePay / QRIS' },
  { value: 'VC', label: 'Credit Card' },
  { value: 'FT', label: 'Retail (Indomaret/Alfamart)' },
];

const CURRENCIES = ['IDR', 'USD'];

const providerOptions = [
  { value: 'midtrans', label: 'Midtrans', description: 'Payment gateway Midtrans' },
  { value: 'internal', label: 'Internal', description: 'Internal wallet payment' },
  { value: 'duitku', label: 'Duitku', description: 'Payment gateway Duitku' },
];

const statusOptions = [
  { value: 'true', label: 'Active', description: 'Fee configuration active' },
  { value: 'false', label: 'Inactive', description: 'Fee configuration inactive' },
];

export default function PaymentFeeModal({
  isOpen,
  mode,
  fee,
  onClose,
  onSubmit,
}: PaymentFeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<PaymentMethodFee>>({
    provider: 'midtrans',
    method: '',
    fixedFee: 0,
    percentageFee: 0,
    currency: 'IDR',
    orgId: 'default',
    appId: 'default',
    isActive: true,
    topupRewardFixedFee: 0,
    topupRewardPercentageFee: 0,
  });

  const [orgOptions, setOrgOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [appOptions, setAppOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Load the org picker once when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setOrgsLoading(true);
    getAllOrganizations()
      .then((orgs) => {
        if (cancelled) return;
        setOrgOptions([
          GLOBAL_DEFAULT_OPTION,
          ...orgs.map((o) => ({ value: o.orgId, label: o.name, description: o.orgId })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setOrgOptions([GLOBAL_DEFAULT_OPTION]);
      })
      .finally(() => {
        if (!cancelled) setOrgsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Reload the app picker whenever the selected org changes — apps are scoped to an org.
  useEffect(() => {
    if (!isOpen) return;
    const orgId = formData.orgId || 'default';
    if (orgId === 'default') {
      setAppOptions([GLOBAL_DEFAULT_OPTION]);
      return;
    }
    let cancelled = false;
    setAppsLoading(true);
    getAppsByOrgSlug(orgId)
      .then((apps) => {
        if (cancelled) return;
        setAppOptions([
          GLOBAL_DEFAULT_OPTION,
          ...apps.map((a) => ({ value: a.appId, label: a.appName, description: a.appId })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setAppOptions([GLOBAL_DEFAULT_OPTION]);
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.orgId]);

  useEffect(() => {
    if (fee && mode === 'edit') {
      setFormData(fee);
    } else {
      setFormData({
        provider: 'midtrans',
        method: '',
        fixedFee: 0,
        percentageFee: 0,
        currency: 'IDR',
        orgId: 'default',
        appId: 'default',
        isActive: true,
        topupRewardFixedFee: 0,
        topupRewardPercentageFee: 0,
      });
    }
  }, [fee, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getPaymentMethodsForProvider = (provider: string | undefined) => {
    switch (provider) {
      case 'internal':
        return INTERNAL_PAYMENT_METHODS;
      case 'duitku':
        return DUITKU_PAYMENT_METHODS.map((m) => m.value);
      case 'midtrans':
      default:
        return MIDTRANS_PAYMENT_METHODS;
    }
  };

  const paymentMethodOptions = getPaymentMethodsForProvider(formData.provider).map((method) => {
    const duitkuMethod = DUITKU_PAYMENT_METHODS.find((m) => m.value === method);
    return {
      value: method,
      label: duitkuMethod?.label ?? method.replace('_', ' '),
      description: method,
    };
  });

  const currencyOptions = CURRENCIES.map((currency) => ({
    value: currency,
    label: currency,
    description: currency,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {mode === 'create' ? 'Add Payment Fee' : 'Edit Payment Fee'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FancySelect
            label="Provider"
            value={formData.provider}
            onChange={(val) => setFormData((prev) => ({ ...prev, provider: val, method: '' }))}
            disabled={isSubmitting}
            options={providerOptions}
            placeholder="Select provider"
          />

          <FancySelect
            label="Organization"
            value={formData.orgId || 'default'}
            onChange={(val) => setFormData((prev) => ({ ...prev, orgId: val, appId: 'default' }))}
            disabled={isSubmitting || orgsLoading}
            loading={orgsLoading}
            searchable
            options={orgOptions}
            placeholder="Search organization or pick Global default"
          />

          <FancySelect
            label="App"
            value={formData.appId || 'default'}
            onChange={(val) => setFormData((prev) => ({ ...prev, appId: val }))}
            disabled={isSubmitting || (formData.orgId || 'default') === 'default' || appsLoading}
            loading={appsLoading}
            searchable
            options={appOptions}
            placeholder={(formData.orgId || 'default') === 'default' ? 'Pick a specific organization first' : 'Search app or pick Global default'}
          />
          <p className="text-xs text-[var(--text-secondary)] -mt-2">
            If this org/app has ANY active method configured, buyers see <strong>only</strong> those —
            global methods are hidden for this scope, not merged. Leave both as Global default to
            keep this method available everywhere.
          </p>

          <FancySelect
            label="Payment Method"
            value={formData.method}
            onChange={(val) => setFormData((prev) => ({ ...prev, method: val }))}
            disabled={isSubmitting}
            options={paymentMethodOptions}
            placeholder="Select payment method"
          />

          <FancySelect
            label="Currency"
            value={formData.currency}
            onChange={(val) => setFormData((prev) => ({ ...prev, currency: val }))}
            disabled={isSubmitting}
            options={currencyOptions}
            placeholder="Select currency"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Fixed Fee"
              id="fixedFee"
              type="number"
              value={formData.fixedFee}
              onChange={(e) => setFormData((prev) => ({ ...prev, fixedFee: Number(e.target.value) || 0 }))}
              placeholder="e.g. 2500"
              disabled={isSubmitting}
            />
            <Input
              label="Percentage Fee (%)"
              id="percentageFee"
              type="number"
              step="0.01"
              value={formData.percentageFee}
              onChange={(e) => setFormData((prev) => ({ ...prev, percentageFee: Number(e.target.value) || 0 }))}
              placeholder="e.g. 2.5"
              disabled={isSubmitting}
            />
          </div>

          {/* Topup Reward Section */}
          <div className="pt-3 border-t border-[var(--border-default)]">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Topup Reward
            </p>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Amount rewarded to the triggering organization when a user completes a topup via this method.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Reward Fixed (IDR)"
                id="topupRewardFixedFee"
                type="number"
                value={formData.topupRewardFixedFee ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, topupRewardFixedFee: Number(e.target.value) || 0 }))}
                placeholder="e.g. 1000"
                disabled={isSubmitting}
              />
              <Input
                label="Reward Percentage (%)"
                id="topupRewardPercentageFee"
                type="number"
                step="0.01"
                value={formData.topupRewardPercentageFee ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, topupRewardPercentageFee: Number(e.target.value) || 0 }))}
                placeholder="e.g. 0.5"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <FancySelect
            label="Status"
            value={formData.isActive ? 'true' : 'false'}
            onChange={(val) => setFormData((prev) => ({ ...prev, isActive: val === 'true' }))}
            disabled={isSubmitting}
            options={statusOptions}
            placeholder="Select status"
          />

          <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.method} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

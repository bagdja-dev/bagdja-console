'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { FancySelect, type FancySelectOption } from '@/ui/fancy-select';
import { getAllOrganizations, getAppsByOrgSlug } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type {
  PayoutMethod,
  PayoutMethodFee,
  PayoutMethodFeePayload,
} from '@/lib/payment-api';

const GLOBAL_DEFAULT_OPTION: FancySelectOption = {
  value: 'default',
  label: 'Global default',
  description: 'Berlaku untuk semua org / app kecuali ada channel di scope yang lebih spesifik',
};

const providerOptions: FancySelectOption[] = [
  { value: 'manual', label: 'Manual', description: 'Transfer oleh tim Finance, disetujui admin' },
  { value: 'midtrans', label: 'Midtrans Iris', description: 'Disbursement otomatis Midtrans' },
  { value: 'duitku', label: 'Duitku', description: 'Disbursement otomatis Duitku' },
];

const statusOptions: FancySelectOption[] = [
  { value: 'true', label: 'Active', description: 'Bisa dipilih user saat menarik dana' },
  { value: 'false', label: 'Inactive', description: 'Disembunyikan dari user' },
];

const EMPTY_FORM: PayoutMethodFeePayload = {
  provider: 'manual',
  methodCode: '',
  providerMethodCode: null,
  fixedFee: 0,
  percentageFee: 0,
  minFee: null,
  maxFee: null,
  minAmount: null,
  maxAmount: null,
  providerCost: null,
  estimatedTime: '',
  priority: 0,
  currency: 'IDR',
  orgId: 'default',
  appId: 'default',
  isActive: true,
};

const PREVIEW_AMOUNT = 100000;

/** Rumus sama dengan payment-service `calculateMethodFee` (biaya dipotong dari nominal). */
function previewFee(form: PayoutMethodFeePayload, amount: number) {
  let fee =
    (Number(form.fixedFee) || 0) +
    Math.ceil(amount * ((Number(form.percentageFee) || 0) / 100));
  if (form.minFee != null) fee = Math.max(fee, Number(form.minFee));
  if (form.maxFee != null) fee = Math.min(fee, Number(form.maxFee));
  return { fee, net: amount - fee };
}

function toNullableNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

interface PayoutChannelModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  channel: PayoutMethodFee | null;
  methods: PayoutMethod[];
  onClose: () => void;
  onSubmit: (payload: PayoutMethodFeePayload) => Promise<void>;
}

/**
 * Tambah/ubah channel payout (provider × metode tujuan) beserta biaya.
 * Provider, metode, mata uang, dan scope adalah kunci channel sehingga
 * tidak bisa diubah setelah dibuat — buat channel baru bila perlu.
 */
export default function PayoutChannelModal({
  isOpen,
  mode,
  channel,
  methods,
  onClose,
  onSubmit,
}: PayoutChannelModalProps) {
  const [formData, setFormData] = useState<PayoutMethodFeePayload>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAmount, setPreviewAmount] = useState(PREVIEW_AMOUNT);
  const [orgOptions, setOrgOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [appOptions, setAppOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [appsLoading, setAppsLoading] = useState(false);
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setFormData(isEdit && channel ? { ...channel } : EMPTY_FORM);
  }, [isOpen, isEdit, channel]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
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
  }, [isOpen, isEdit]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
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
  }, [isOpen, isEdit, formData.orgId]);

  const methodOptions = useMemo<FancySelectOption[]>(
    () =>
      methods.map((m) => ({
        value: m.code,
        label: `${m.name}${m.isActive ? '' : ' (inactive)'}`,
        description: `${m.code} · ${m.methodType === 'bank' ? 'Bank' : 'E-wallet'} · ${m.currency}`,
      })),
    [methods],
  );

  const preview = previewFee(formData, previewAmount);
  const currency = formData.currency || 'IDR';

  if (!isOpen) return null;

  const set = <K extends keyof PayoutMethodFeePayload>(key: K, value: PayoutMethodFeePayload[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const editable: PayoutMethodFeePayload = {
      providerMethodCode: formData.providerMethodCode?.trim() || null,
      fixedFee: Number(formData.fixedFee) || 0,
      percentageFee: Number(formData.percentageFee) || 0,
      minFee: formData.minFee ?? null,
      maxFee: formData.maxFee ?? null,
      minAmount: formData.minAmount ?? null,
      maxAmount: formData.maxAmount ?? null,
      providerCost: formData.providerCost ?? null,
      estimatedTime: formData.estimatedTime?.trim() || null,
      priority: Number(formData.priority) || 0,
      isActive: formData.isActive !== false,
    };
    try {
      await onSubmit(
        isEdit
          ? editable
          : {
              ...editable,
              provider: formData.provider,
              methodCode: formData.methodCode,
              currency,
              orgId: formData.orgId || 'default',
              appId: formData.appId || 'default',
            },
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'Failed to save payout channel',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const numberField = (
    key: 'minFee' | 'maxFee' | 'minAmount' | 'maxAmount' | 'providerCost',
    label: string,
    helpText?: string,
  ) => (
    <Input
      label={label}
      id={`payout-channel-${key}`}
      type="number"
      min={0}
      value={formData[key] ?? ''}
      onChange={(e) => set(key, toNullableNumber(e.target.value))}
      placeholder="Kosong = tanpa batas"
      helpText={helpText}
      disabled={isSubmitting}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {isEdit ? 'Edit Payout Channel' : 'Add Payout Channel'}
          </h2>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FancySelect
              label="Engine"
              value={formData.provider}
              onChange={(val) => set('provider', val)}
              options={providerOptions}
              disabled={isSubmitting || isEdit}
            />
            <FancySelect
              label="Destination Method"
              value={formData.methodCode}
              onChange={(val) => set('methodCode', val)}
              options={methodOptions}
              searchable
              disabled={isSubmitting || isEdit}
              placeholder="Pilih bank / e-wallet"
            />
            <FancySelect
              label="Organization"
              value={formData.orgId || 'default'}
              onChange={(val) => setFormData((prev) => ({ ...prev, orgId: val, appId: 'default' }))}
              options={isEdit ? [{ value: formData.orgId || 'default', label: formData.orgId || 'default' }] : orgOptions}
              loading={orgsLoading}
              searchable
              disabled={isSubmitting || isEdit || orgsLoading}
            />
            <FancySelect
              label="App"
              value={formData.appId || 'default'}
              onChange={(val) => set('appId', val)}
              options={isEdit ? [{ value: formData.appId || 'default', label: formData.appId || 'default' }] : appOptions}
              loading={appsLoading}
              searchable
              disabled={isSubmitting || isEdit || (formData.orgId || 'default') === 'default' || appsLoading}
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)] -mt-2">
            Bila org/app punya <strong>satu saja</strong> channel aktif di scope-nya, user di scope itu
            hanya melihat channel tersebut — channel global tidak ikut ditampilkan.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Currency"
              id="payout-channel-currency"
              value={currency}
              onChange={(e) => set('currency', e.target.value.toUpperCase())}
              disabled={isSubmitting || isEdit}
            />
            <Input
              label="Provider Bank Code"
              id="payout-channel-provider-code"
              value={formData.providerMethodCode || ''}
              onChange={(e) => set('providerMethodCode', e.target.value)}
              placeholder={formData.provider === 'duitku' ? 'e.g. 014' : formData.provider === 'midtrans' ? 'e.g. bca' : '—'}
              helpText="Kode bank versi provider. Kosongkan untuk manual."
              disabled={isSubmitting}
            />
            <Input
              label="Priority"
              id="payout-channel-priority"
              type="number"
              value={formData.priority ?? 0}
              onChange={(e) => set('priority', Number(e.target.value) || 0)}
              helpText="Lebih tinggi tampil lebih dulu"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-default)]">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Biaya ke user (dipotong dari nominal)
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Fixed Fee"
                id="payout-channel-fixed"
                type="number"
                min={0}
                value={formData.fixedFee ?? 0}
                onChange={(e) => set('fixedFee', Number(e.target.value) || 0)}
                disabled={isSubmitting}
              />
              <Input
                label="Percentage Fee (%)"
                id="payout-channel-percentage"
                type="number"
                min={0}
                step="0.01"
                value={formData.percentageFee ?? 0}
                onChange={(e) => set('percentageFee', Number(e.target.value) || 0)}
                disabled={isSubmitting}
              />
              {numberField('minFee', 'Min Fee')}
              {numberField('maxFee', 'Max Fee', 'Batas atas biaya, berguna untuk mode persen')}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-default)]">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Batas & operasional
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {numberField('minAmount', 'Min Amount')}
              {numberField('maxAmount', 'Max Amount')}
              {numberField('providerCost', 'Provider Cost', 'Biaya riil ke provider (beban platform), untuk laporan margin')}
              <Input
                label="Estimated Time"
                id="payout-channel-eta"
                value={formData.estimatedTime || ''}
                onChange={(e) => set('estimatedTime', e.target.value)}
                placeholder="e.g. Instan / Maks. 1x24 jam kerja"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Calculator className="h-4 w-4 text-[var(--action-primary)]" /> Simulasi biaya
            </div>
            <Input
              label="Nominal contoh"
              id="payout-channel-preview"
              type="number"
              min={0}
              value={previewAmount}
              onChange={(e) => setPreviewAmount(Number(e.target.value) || 0)}
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Biaya</p>
                <p className="font-semibold text-[var(--text-primary)]">{formatMoney(preview.fee, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Diterima rekening</p>
                <p className={`font-semibold ${preview.net > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatMoney(preview.net, currency)}
                </p>
              </div>
            </div>
          </div>

          <FancySelect
            label="Status"
            value={formData.isActive === false ? 'false' : 'true'}
            onChange={(val) => set('isActive', val === 'true')}
            options={statusOptions}
            disabled={isSubmitting}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.methodCode || !formData.provider}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : isEdit ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

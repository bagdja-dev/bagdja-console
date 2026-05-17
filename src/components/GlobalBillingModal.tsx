'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Select } from '@/ui/select';
import type { ApiError } from '@/types';
import type { BillingSetting } from '@/lib/payment-api';
import {
  percentageFeeFromInput,
  percentageFeeToInput,
} from '@/lib/billing-utils';
import { parseAmount } from '@/lib/billing-format';
import { CurrencyAmountInput, PercentFeeInput } from '@/components/billing/FeeInputFields';

export default function GlobalBillingModal({
  isOpen,
  setting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  setting: BillingSetting | null;
  onClose: () => void;
  onSubmit: (payload: Partial<BillingSetting>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    fixed_fee: '',
    percentage_fee: '',
    fixed_cap_fee: '',
    max_service_fee: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (setting) {
      setForm({
        fixed_fee: setting.fixed_fee != null ? String(setting.fixed_fee) : '',
        percentage_fee:
          setting.percentage_fee != null
            ? String(percentageFeeToInput(setting.percentage_fee))
            : '',
        fixed_cap_fee: setting.fixed_cap_fee?.toString() || '',
        max_service_fee: setting.max_service_fee?.toString() || '',
        is_active: setting.is_active,
      });
    }
  }, [setting, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        fixed_fee: parseAmount(form.fixed_fee),
        percentage_fee: percentageFeeFromInput(parseAmount(form.percentage_fee)),
        fixed_cap_fee: form.fixed_cap_fee ? parseAmount(form.fixed_cap_fee) : undefined,
        max_service_fee: form.max_service_fee ? parseAmount(form.max_service_fee) : undefined,
        is_active: form.is_active,
      });
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to update global default');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] w-full max-w-lg shadow-2xl m-4">
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between bg-primary/5 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Edit Global Default</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">These settings apply to all organizations as a fallback.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)]/50 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CurrencyAmountInput
                id="global-fixed-fee"
                label="Default fixed fee"
                currency="DEFAULT"
                value={form.fixed_fee}
                onChange={(fixed_fee) => setForm((prev) => ({ ...prev, fixed_fee }))}
                disabled={submitting}
              />
              <PercentFeeInput
                id="global-percentage-fee"
                label="Default percentage"
                value={form.percentage_fee}
                onChange={(percentage_fee) => setForm((prev) => ({ ...prev, percentage_fee }))}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CurrencyAmountInput
                id="global-fixed-cap"
                label="Default threshold"
                currency="DEFAULT"
                value={form.fixed_cap_fee}
                onChange={(fixed_cap_fee) => setForm((prev) => ({ ...prev, fixed_cap_fee }))}
                disabled={submitting}
                placeholder="100000"
              />
              <CurrencyAmountInput
                id="global-max-fee"
                label="Default max fee"
                currency="DEFAULT"
                value={form.max_service_fee}
                onChange={(max_service_fee) => setForm((prev) => ({ ...prev, max_service_fee }))}
                disabled={submitting}
                placeholder="50000"
              />
            </div>
          </div>

          {/* <Select
            label="System-wide Status"
            value={form.is_active ? 'true' : 'false'}
            onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
          >
            <option value="true">Active (Enabled)</option>
            <option value="false">Inactive (Disabled)</option>
          </Select> */}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex items-center gap-2 px-8">
              <Save className="h-4 w-4" /> Save Global Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

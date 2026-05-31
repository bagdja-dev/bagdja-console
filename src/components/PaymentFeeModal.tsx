'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { FancySelect } from '@/ui/fancy-select';
import type { PaymentMethodFee } from '@/lib/payment-fees-api';

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

const CURRENCIES = ['IDR', 'USD'];

const providerOptions = [
  { value: 'midtrans', label: 'Midtrans', description: 'Payment gateway Midtrans' },
  { value: 'internal', label: 'Internal', description: 'Internal wallet payment' },
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
    isActive: true,
    topupRewardFixedFee: 0,
    topupRewardPercentageFee: 0,
  });

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
      case 'midtrans':
      default:
        return MIDTRANS_PAYMENT_METHODS;
    }
  };

  const paymentMethodOptions = getPaymentMethodsForProvider(formData.provider).map((method) => ({
    value: method,
    label: method.replace('_', ' '),
    description: method,
  }));

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

'use client';

import { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { FancySelect } from '@/ui/fancy-select';
import type { PayoutMethod, PayoutMethodPayload } from '@/lib/payment-api';

interface PayoutMethodModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  method: PayoutMethod | null;
  onClose: () => void;
  onSubmit: (payload: PayoutMethodPayload) => Promise<void>;
}

const EMPTY_FORM: PayoutMethodPayload = {
  code: '',
  name: '',
  methodType: 'bank',
  currency: 'IDR',
  isActive: true,
};

const typeOptions = [
  { value: 'bank', label: 'Bank', description: 'Transfer ke rekening bank' },
  { value: 'ewallet', label: 'E-wallet', description: 'Transfer ke dompet digital' },
];

const statusOptions = [
  { value: 'true', label: 'Active', description: 'Bisa dipilih untuk rekening & channel' },
  { value: 'false', label: 'Inactive', description: 'Disembunyikan dari pilihan' },
];

/** Tambah/ubah metode tujuan payout (katalog `payout_methods`). */
export default function PayoutMethodModal({
  isOpen,
  mode,
  method,
  onClose,
  onSubmit,
}: PayoutMethodModalProps) {
  const [formData, setFormData] = useState<PayoutMethodPayload>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setFormData(mode === 'edit' && method ? { ...method } : EMPTY_FORM);
  }, [isOpen, mode, method]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(
        mode === 'create'
          ? { ...formData, code: formData.code?.trim().toUpperCase() }
          : {
              name: formData.name,
              methodType: formData.methodType,
              currency: formData.currency,
              isActive: formData.isActive,
            },
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to save payout method');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {mode === 'create' ? 'Add Payout Method' : 'Edit Payout Method'}
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
          <Input
            label="Code"
            id="payoutMethodCode"
            value={formData.code || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="e.g. BCA"
            disabled={isSubmitting || mode === 'edit'}
            helpText={mode === 'edit' ? 'Kode tidak bisa diubah (dipakai rekening & channel).' : 'Huruf besar, angka, underscore.'}
          />
          <Input
            label="Name"
            id="payoutMethodName"
            value={formData.name || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Bank Central Asia"
            disabled={isSubmitting}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FancySelect
              label="Type"
              value={formData.methodType}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, methodType: val as PayoutMethodPayload['methodType'] }))
              }
              options={typeOptions}
              disabled={isSubmitting}
            />
            <Input
              label="Currency"
              id="payoutMethodCurrency"
              value={formData.currency || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
              disabled={isSubmitting}
            />
          </div>
          <FancySelect
            label="Status"
            value={formData.isActive === false ? 'false' : 'true'}
            onChange={(val) => setFormData((prev) => ({ ...prev, isActive: val === 'true' }))}
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
              disabled={isSubmitting || !formData.code || !formData.name}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, Loader2, ArrowUpRight } from 'lucide-react';
import { createPersonalTopup, createOrgTopup } from '@/lib/payment-api';

type TopUpModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  isPersonal?: boolean;
};

const TOPUP_PRESETS = [50000, 100000, 250000, 500000];

export default function TopUpModal({ isOpen, onClose, currency, isPersonal }: TopUpModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTopUp = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = isPersonal 
        ? await createPersonalTopup(Number(amount), currency)
        : await createOrgTopup(Number(amount), currency);

      if (response.checkoutUrl) {
        // Open Midtrans Snap/Checkout URL
        window.open(response.checkoutUrl, '_self');
      } else {
        setError('Checkout URL not returned from server');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize top-up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onClose()}
      />
      
      <div className="relative w-full max-w-md scale-100 transform overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-left shadow-2xl transition-all">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--action-primary)]/10">
              <ArrowUpRight className="h-5 w-5 text-[var(--action-primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Top Up Wallet
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Add funds to your {isPersonal ? 'personal' : 'organization'} {currency} wallet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Top Up Amount ({currency})
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-[var(--text-secondary)] sm:text-sm">
                  {currency === 'IDR' ? 'Rp' : currency}
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value ? Number(e.target.value) : '');
                  setError(null);
                }}
                className="block w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] py-2.5 pl-10 pr-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--action-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                placeholder="0"
                min="0"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setAmount(preset);
                  setError(null);
                }}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--action-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border-default)] pt-4">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || !amount || amount <= 0}
              onClick={handleTopUp}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--text-muted)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

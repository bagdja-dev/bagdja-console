'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Wallet as WalletIcon } from 'lucide-react';

type Currency = 'IDR' | 'USD' | 'MYR';
type TabKey = 'transactions' | 'withdraw_requests';

type WalletSummary = {
  currency: Currency;
  availableBalance: number;
  heldBalance: number;
};

function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

function WalletCard({
  wallet,
  isActive,
  isSelected,
  onActivate,
  onSelect,
}: {
  wallet: WalletSummary;
  isActive: boolean;
  isSelected: boolean;
  onActivate: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'relative w-full rounded-lg border bg-[var(--bg-surface)] p-5 text-left transition-colors',
        isSelected
          ? 'border-[var(--action-primary)] ring-1 ring-[var(--action-primary)]'
          : 'border-[var(--border-default)] hover:bg-[var(--bg-hover)]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--action-primary)]/10">
              <WalletIcon className="h-5 w-5 text-[var(--action-primary)]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{wallet.currency}</div>
              <div className="text-xs text-[var(--text-secondary)]">Wallet</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-main)] px-2.5 py-1">
          {isActive ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-[var(--action-primary)]" />
              <span className="text-xs font-medium text-[var(--text-primary)]">Active</span>
            </>
          ) : (
            <>
              <Clock3 className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">Inactive</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-3">
          <div className="text-xs text-[var(--text-secondary)]">Available balance</div>
          <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {formatMoney(wallet.availableBalance, wallet.currency)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-3">
          <div className="text-xs text-[var(--text-secondary)]">Held balance</div>
          <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {formatMoney(wallet.heldBalance, wallet.currency)}
          </div>
        </div>
      </div>

      <div className="pointer-events-none mt-2 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActivate();
          }}
          disabled={isActive}
          className="pointer-events-auto rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--text-muted)]"
        >
          Activate
        </button>
      </div>
    </button>
  );
}

export default function WalletPage() {
  const wallets = useMemo<WalletSummary[]>(
    () => [
      { currency: 'IDR', availableBalance: 0, heldBalance: 0 },
      { currency: 'USD', availableBalance: 0, heldBalance: 0 },
      { currency: 'MYR', availableBalance: 0, heldBalance: 0 },
    ],
    [],
  );

  const [activeCurrencies, setActiveCurrencies] = useState<Set<Currency>>(new Set());
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('IDR');
  const [activeTab, setActiveTab] = useState<TabKey>('transactions');

  const handleActivate = (currency: Currency) => {
    setActiveCurrencies((prev) => {
      const next = new Set(prev);
      next.add(currency);
      return next;
    });
    setSelectedCurrency(currency);
  };

  const selectedWallet = wallets.find((w) => w.currency === selectedCurrency) ?? wallets[0];
  const isSelectedActive = activeCurrencies.has(selectedWallet.currency);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Wallet</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Manage balances and payouts.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet.currency}
            wallet={wallet}
            isActive={activeCurrencies.has(wallet.currency)}
            isSelected={wallet.currency === selectedWallet.currency}
            onActivate={() => handleActivate(wallet.currency)}
            onSelect={() => setSelectedCurrency(wallet.currency)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Details</h2>
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-main)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                {selectedWallet.currency}
              </span>
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-main)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {isSelectedActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Transactions and withdraw requests.</p>
          </div>

          <div className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'transactions'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              Transaction
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('withdraw_requests')}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'withdraw_requests'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              Withdraw Request
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'transactions' ? (
            <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)]">
              <div className="border-b border-[var(--border-default)] px-4 py-3">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Transaction</div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  All movements for {selectedWallet.currency} wallet.
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <tr className="text-xs text-[var(--text-secondary)]">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border-default)] last:border-0">
                      <td className="px-4 py-4 text-[var(--text-secondary)]" colSpan={4}>
                        No transactions yet for {selectedWallet.currency} wallet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)]">
              <div className="border-b border-[var(--border-default)] px-4 py-3">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Withdraw Request</div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Payout requests for {selectedWallet.currency} wallet.
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <tr className="text-xs text-[var(--text-secondary)]">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Currency</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border-default)] last:border-0">
                      <td className="px-4 py-4 text-[var(--text-secondary)]" colSpan={4}>
                        No withdraw requests yet for {selectedWallet.currency} wallet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

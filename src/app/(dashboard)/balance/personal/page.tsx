'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, Clock3, Wallet as WalletIcon, Loader2 } from 'lucide-react';
import { listUserWallets, activateUserWallet, type Wallet } from '@/lib/payment-api';
import { getSupportedCurrencies } from '@/lib/api';
import { useLayout } from '@/context/LayoutContext';
import WalletLedgerGrid from '../WalletLedgerGrid';
import WithdrawalRequestsGrid from '../WithdrawalRequestsGrid';
import TopUpModal from '@/components/TopUpModal';

type Currency = string;
type TabKey = 'transactions' | 'withdraw_requests';

type WalletSummary = {
  currency: Currency;
  availableBalance: number;
  heldBalance: number;
  isActive: boolean;
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
  isSelected,
  onActivate,
  onSelect,
  onTopUp,
  isActivating,
}: {
  wallet: WalletSummary;
  isSelected: boolean;
  onActivate: () => void;
  onSelect: () => void;
  onTopUp: () => void;
  isActivating: boolean;
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
              <div className="text-xs text-[var(--text-secondary)]">Personal Wallet</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-main)] px-2.5 py-1">
          {wallet.isActive ? (
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

      <div className="mt-4 flex justify-end gap-2">
        {wallet.isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTopUp();
            }}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-main)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--action-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--action-primary)] flex items-center gap-2 transition-colors"
          >
            Top Up
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActivate();
          }}
          disabled={wallet.isActive || isActivating}
          className="rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--text-muted)] flex items-center gap-2"
        >
          {isActivating && <Loader2 className="h-4 w-4 animate-spin" />}
          {wallet.isActive ? 'Activated' : 'Activate'}
        </button>
      </div>
    </button>
  );
}

export default function PersonalWalletPage() {
  const [walletsData, setWalletsData] = useState<Wallet[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['IDR', 'USD', 'MYR']);
  const [loading, setLoading] = useState(true);
  const [activatingCurrency, setActivatingCurrency] = useState<Currency | null>(null);
  const [topUpCurrency, setTopUpCurrency] = useState<Currency | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('IDR');
  const [activeTab, setActiveTab] = useState<TabKey>('transactions');
  const { setTopbarContent } = useLayout();
  const headerRef = useRef<HTMLDivElement>(null);

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listUserWallets();
      setWalletsData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch personal wallets:', error);
      setWalletsData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWallets();
  }, [fetchWallets]);

  useEffect(() => {
    getSupportedCurrencies()
      .then((codes) => {
        if (codes?.length) {
          setSupportedCurrencies(codes);
          setSelectedCurrency((prev) => (codes.includes(prev) ? prev : codes[0]));
        }
      })
      .catch((err) => console.error('Failed to fetch supported currencies:', err));
  }, []);

  const walletsSummary = useMemo<WalletSummary[]>(() => {
    return supportedCurrencies.map((curr) => {
      const found = walletsData.find((w) => w.currency_code === curr);
      return {
        currency: curr,
        availableBalance: found != null ? Number(found.balance) || 0 : 0,
        heldBalance: found != null ? Number(found.held_balance) || 0 : 0,
        isActive: Boolean(found?.is_active),
      };
    });
  }, [walletsData, supportedCurrencies]);

  // Contextual Topbar Logic (reuse from org balance)
  const isHeaderVisibleRef = useRef(true);

  useEffect(() => {
    if (walletsSummary.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentlyVisible = entry.isIntersecting;

        if (currentlyVisible !== isHeaderVisibleRef.current) {
          isHeaderVisibleRef.current = currentlyVisible;

          if (!currentlyVisible) {
            setTopbarContent(
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="h-4 w-[1px] bg-[var(--border-default)] mx-2 hidden md:block" />
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {walletsSummary.map((w) => (
                    <button
                      key={w.currency}
                      onClick={() => {
                        setSelectedCurrency(w.currency);
                        setActiveTab('transactions');
                        headerRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={[
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                        w.currency === selectedCurrency
                          ? 'bg-[var(--action-primary)] text-white shadow-sm'
                          : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]',
                      ].join(' ')}
                    >
                      <WalletIcon className={`h-3 w-3 ${w.currency === selectedCurrency ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                      {w.currency}
                      <span className={`opacity-70 ${w.currency === selectedCurrency ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                        ({formatMoney(w.availableBalance, w.currency)})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          } else {
            setTopbarContent(null);
          }
        }
      },
      {
        threshold: 0,
        rootMargin: '-64px 0px 0px 0px',
      },
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      observer.disconnect();
      setTopbarContent(null);
    };
  }, [walletsSummary, selectedCurrency, setTopbarContent]);

  const handleActivate = async (currency: Currency) => {
    try {
      setActivatingCurrency(currency);
      await activateUserWallet(currency);
      await fetchWallets();
      setSelectedCurrency(currency);
    } catch (error) {
      console.error('Failed to activate personal wallet:', error);
      alert('Failed to activate wallet. Please try again.');
    } finally {
      setActivatingCurrency(null);
    }
  };

  const selectedWallet = walletsSummary.find((w) => w.currency === selectedCurrency) ?? walletsSummary[0];

  if (loading && walletsData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--action-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div ref={headerRef} className="mb-8 flex-shrink-0">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Personal Balance</h1>
        <p className="mt-2 text-[var(--text-secondary)]">View and manage your personal wallet balances.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3 flex-shrink-0">
        {walletsSummary.map((wallet) => (
          <WalletCard
            key={wallet.currency}
            wallet={wallet}
            isSelected={wallet.currency === selectedCurrency}
            onActivate={() => handleActivate(wallet.currency)}
            onSelect={() => setSelectedCurrency(wallet.currency)}
            onTopUp={() => setTopUpCurrency(wallet.currency)}
            isActivating={activatingCurrency === wallet.currency}
          />
        ))}
      </div>

      <div className=" flex flex-col rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden mb-8 h-[calc(100vh-140px)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4 flex-shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Details</h2>
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-main)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]">
                {selectedWallet.currency}
              </span>
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-main)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {selectedWallet.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
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

        <div className="flex-1 flex flex-col min-h-0 mt-4 mx-4">
          {activeTab === 'transactions' ? (
            <WalletLedgerGrid key={`ledger-${selectedCurrency}`} currency={selectedCurrency} isPersonal />
          ) : (
            <WithdrawalRequestsGrid key={`withdraw-${selectedCurrency}`} currency={selectedCurrency} />
          )}
        </div>
      </div>

      <TopUpModal 
        isOpen={topUpCurrency !== null} 
        onClose={() => setTopUpCurrency(null)} 
        currency={topUpCurrency || 'IDR'} 
        isPersonal={true}
      />
    </div>
  );
}

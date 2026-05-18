'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, Clock3, Wallet as WalletIcon, Loader2, ArrowUpRight, ArrowDownLeft, ChevronDown } from 'lucide-react';
import {
  listWallets,
  activateWallet,
  getPaymentTransactions,
  listWithdrawalRequests,
  type Wallet,
  type PaymentTransaction,
  type WithdrawalRequest
} from '@/lib/payment-api';
import { getSupportedCurrencies } from '@/lib/api';
import { getActiveOrganizationSlug } from '@/lib/auth';
import DataGrid, { type GridColumn, type FilterField } from '@/components/DataGrid';
import { useLayout } from '@/context/LayoutContext';

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
  isActivating,
}: {
  wallet: WalletSummary;
  isSelected: boolean;
  onActivate: () => void;
  onSelect: () => void;
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
              <div className="text-xs text-[var(--text-secondary)]">Wallet</div>
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

      <div className="mt-4 flex justify-end">
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

export default function WalletPage() {
  const [walletsData, setWalletsData] = useState<Wallet[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['IDR', 'USD', 'MYR']);
  const [loading, setLoading] = useState(true);
  const [activatingCurrency, setActivatingCurrency] = useState<Currency | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('IDR');
  const [activeTab, setActiveTab] = useState<TabKey>('transactions');
  const { setTopbarContent } = useLayout();
  const headerRef = useRef<HTMLDivElement>(null);

  const fetchWallets = useCallback(async () => {
    const orgSlug = getActiveOrganizationSlug();
    if (!orgSlug) {
      setWalletsData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await listWallets(orgSlug);
      setWalletsData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
      setWalletsData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWallets();

    const onOrganizationChanged = () => {
      void fetchWallets();
    };
    window.addEventListener('organizationChanged', onOrganizationChanged);
    return () => window.removeEventListener('organizationChanged', onOrganizationChanged);
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

  // Contextual Topbar Logic based on owned applications detail
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
                        //update ref to scroll to top of the page
                        headerRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={[
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                        w.currency === selectedCurrency
                          ? 'bg-[var(--action-primary)] text-white shadow-sm'
                          : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]'
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
        rootMargin: '-64px 0px 0px 0px'
      }
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
      await activateWallet(currency);
      await fetchWallets();
      setSelectedCurrency(currency);
    } catch (error) {
      console.error('Failed to activate wallet:', error);
      alert('Failed to activate wallet. Please try again.');
    } finally {
      setActivatingCurrency(null);
    }
  };

  const selectedWallet = walletsSummary.find((w) => w.currency === selectedCurrency) ?? walletsSummary[0];

  // DataGrid Columns for Transactions
  const transactionColumns: GridColumn[] = [
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: 'type',
      label: 'Type',
      render: () => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-[var(--text-primary)]">Payment</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status) => (
        <span className={[
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          status === 'PAID' || status === 'COMPLETED' || status === 'SUCCESS'
            ? 'bg-emerald-500/10 text-emerald-500'
            : status === 'PENDING'
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-red-500/10 text-red-500'
        ].join(' ')}>
          {status}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val, row) => (
        <div className="text-right font-medium text-[var(--text-primary)]">
          {formatMoney(Number(val), row.currency as Currency)}
        </div>
      )
    }
  ];

  // DataGrid Columns for Withdrawals
  const withdrawalColumns: GridColumn[] = [
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: 'account',
      label: 'Account',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10">
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <div className="text-[var(--text-primary)]">Withdraw</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {row.bank_info?.bankName || 'Unknown Bank'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status) => (
        <span className={[
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          status === 'COMPLETED'
            ? 'bg-emerald-500/10 text-emerald-500'
            : status === 'PENDING'
              ? 'bg-amber-500/10 text-amber-500'
              : status === 'REJECTED'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-blue-500/10 text-blue-500'
        ].join(' ')}>
          {status}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val, row) => (
        <div className="text-right font-medium text-[var(--text-primary)]">
          -{formatMoney(val, (row.wallet?.currency_code as Currency) || selectedCurrency)}
        </div>
      )
    }
  ];

  const transactionFilters: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Success', value: 'SUCCESS' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Paid', value: 'PAID' },
      ]
    }
  ];

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
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Wallet</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Manage balances and payouts.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3 flex-shrink-0">
        {walletsSummary.map((wallet) => (
          <WalletCard
            key={wallet.currency}
            wallet={wallet}
            isSelected={wallet.currency === selectedCurrency}
            onActivate={() => handleActivate(wallet.currency)}
            onSelect={() => setSelectedCurrency(wallet.currency)}
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
            <DataGrid
              title=""
              columns={transactionColumns}
              fetchData={(params) => getPaymentTransactions({
                ...params,
                status: params.filter?.status,
                currency: selectedCurrency // Auto filter by selected wallet
              })}
              filterFields={transactionFilters}
              refreshTrigger={selectedCurrency}
              emptyState={{
                title: 'No transactions',
                description: `No transactions found for ${selectedCurrency} wallet.`,
                icon: <ArrowDownLeft className="h-12 w-12 text-[var(--text-muted)]" />
              }}
              fullHeight={true}
            />
          ) : (
            <DataGrid
              title=""
              columns={withdrawalColumns}
              fetchData={(params) => listWithdrawalRequests({
                ...params,
                organizationId: undefined // Handled by paymentApiRequest
              })}
              refreshTrigger={selectedCurrency}
              emptyState={{
                title: 'No withdrawals',
                description: `No withdrawal requests found for ${selectedCurrency} wallet.`,
                icon: <ArrowUpRight className="h-12 w-12 text-[var(--text-muted)]" />
              }}
              fullHeight={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import DataGrid, { type FilterField, type GridColumn } from '@/components/DataGrid';
import { getPaymentTransactions, type WalletLedgerEntry } from '@/lib/payment-api';

type Currency = string;

const TX_TYPE_LABELS: Record<string, string> = {
  SALE_PROCEEDS: 'Payment received',
  TRANSACTION_FEE: 'Service fee',
  WITHDRAWAL_HOLD: 'Withdrawal hold',
  WITHDRAWAL_COMPLETED: 'Withdrawal completed',
};

function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(Math.abs(amount));
}

function labelForType(type: string) {
  return TX_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

function buildLedgerColumns(currency: Currency): GridColumn[] {
  return [
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (val) =>
        new Date(val).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
    },
    {
      key: 'type',
      label: 'Description',
      sortable: true,
      render: (type: string, row: WalletLedgerEntry) => {
        const isCredit = row.direction === 'credit' || Number(row.amount) >= 0;
        return (
          <div className="flex items-center gap-2">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full',
                isCredit ? 'bg-emerald-500/10' : 'bg-red-500/10',
              ].join(' ')}
            >
              {isCredit ? (
                <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div>
              <div className="text-[var(--text-primary)]">{labelForType(type)}</div>
              <div className="text-xs text-[var(--text-secondary)]">{type}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'reference_id',
      label: 'Reference',
      render: (val) => (
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          {val ? `${String(val).slice(0, 8)}…` : '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val, row: WalletLedgerEntry) => {
        const isCredit = row.direction === 'credit' || Number(val) >= 0;
        const curr = (row.currency as Currency) || currency;
        const signed = isCredit
          ? `+${formatMoney(Number(val), curr)}`
          : `-${formatMoney(Number(val), curr)}`;
        return (
          <div
            className={[
              'text-right font-semibold tabular-nums',
              isCredit ? 'text-emerald-500' : 'text-red-500',
            ].join(' ')}
          >
            {signed}
          </div>
        );
      },
    },
  ];
}

const ledgerFilters: FilterField[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'Payment received', value: 'SALE_PROCEEDS' },
      { label: 'Service fee', value: 'TRANSACTION_FEE' },
      { label: 'Withdrawal hold', value: 'WITHDRAWAL_HOLD' },
      { label: 'Withdrawal completed', value: 'WITHDRAWAL_COMPLETED' },
    ],
  },
];

type WalletLedgerGridProps = {
  currency: Currency;
};

export default function WalletLedgerGrid({ currency }: WalletLedgerGridProps) {
  return (
    <DataGrid
      title="Wallet activity"
      description="Credits and debits applied to this wallet balance"
      columns={buildLedgerColumns(currency)}
      fetchData={(params) =>
        getPaymentTransactions({
          ...params,
          type: params.filter?.type,
          currency,
        })
      }
      filterFields={ledgerFilters}
      refreshTrigger={currency}
      emptyState={{
        title: 'No wallet activity',
        description: `No credits or debits recorded for ${currency} wallet yet.`,
        icon: <ArrowDownLeft className="h-12 w-12 text-[var(--text-muted)]" />,
      }}
      fullHeight
    />
  );
}

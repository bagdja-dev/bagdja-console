'use client';

import { ArrowUpRight, Banknote } from 'lucide-react';
import DataGrid, { type FilterField, type GridColumn } from '@/components/DataGrid';
import { listWithdrawalRequests, type WithdrawalRequest } from '@/lib/payment-api';

type Currency = string;

function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

function buildWithdrawalColumns(currency: Currency): GridColumn[] {
  return [
    {
      key: 'created_at',
      label: 'Requested',
      sortable: true,
      render: (val) =>
        new Date(val).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
    },
    {
      key: 'account',
      label: 'Payout account',
      render: (_, row: WithdrawalRequest) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10">
            <Banknote className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <div className="text-[var(--text-primary)]">Withdrawal</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {row.bank_info?.bankName ||
                row.payout_details_snapshot?.bankName ||
                'Payout account'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status: string) => (
        <span
          className={[
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            status === 'COMPLETED'
              ? 'bg-emerald-500/10 text-emerald-500'
              : status === 'PENDING'
                ? 'bg-amber-500/10 text-amber-500'
                : status === 'REJECTED'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-blue-500/10 text-blue-500',
          ].join(' ')}
        >
          {status}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (val, row: WithdrawalRequest) => (
        <div className="text-right font-semibold tabular-nums text-orange-500">
          -{formatMoney(Number(val), (row.wallet?.currency_code as Currency) || currency)}
        </div>
      ),
    },
  ];
}

const withdrawalFilters: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Pending', value: 'PENDING' },
      { label: 'Approved', value: 'APPROVED' },
      { label: 'Completed', value: 'COMPLETED' },
      { label: 'Rejected', value: 'REJECTED' },
    ],
  },
];

type WithdrawalRequestsGridProps = {
  currency: Currency;
};

export default function WithdrawalRequestsGrid({ currency }: WithdrawalRequestsGridProps) {
  return (
    <DataGrid
      title="Withdrawal requests"
      description="Payout requests submitted for this wallet"
      columns={buildWithdrawalColumns(currency)}
      fetchData={(params) =>
        listWithdrawalRequests({
          page: params.page,
          size: params.size,
          currency,
          status: params.filter?.status,
        })
      }
      filterFields={withdrawalFilters}
      refreshTrigger={currency}
      emptyState={{
        title: 'No withdrawal requests',
        description: `No payout requests for ${currency} wallet yet.`,
        icon: <ArrowUpRight className="h-12 w-12 text-[var(--text-muted)]" />,
      }}
      fullHeight
    />
  );
}

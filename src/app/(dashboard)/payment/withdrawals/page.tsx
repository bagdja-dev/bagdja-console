'use client';

import React, { useState } from 'react';
import { ArrowDownLeft, ShieldCheck, ShieldAlert, Filter } from 'lucide-react';
import AdminWithdrawalsGrid from '@/components/withdrawal/AdminWithdrawalsGrid';
import { PAYOUT_PERMISSIONS } from '@/lib/payout-permissions';
import { useOrganizationPermissions } from '@/lib/use-organization-permissions';
type Currency = string;

const SUPPORTED_CURRENCIES: (Currency | 'ALL')[] = ['ALL', 'IDR', 'USD', 'SGD'];

export default function WithdrawalApprovalsPage() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | 'ALL'>('ALL');
  const { loading, hasSystemPermission } = useOrganizationPermissions();
  const canViewAll = hasSystemPermission(PAYOUT_PERMISSIONS.WITHDRAWALS_VIEW_ALL);

  return (
    <div className="flex flex-col h-full space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Withdrawal Approvals
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Platform-wide payout and withdrawal requests from all organizations and users
              </p>
            </div>
          </div>
        </div>

        {/* Currency Filter Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-1">
          <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-[var(--text-muted)]">
            <Filter className="h-3.5 w-3.5" />
            <span>Currency:</span>
          </div>
          {SUPPORTED_CURRENCIES.map((curr) => {
            const isActive = selectedCurrency === curr;
            return (
              <button
                key={curr}
                type="button"
                onClick={() => setSelectedCurrency(curr)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-[var(--action-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                ].join(' ')}
              >
                {curr === 'ALL' ? 'All' : curr}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-400">
        <ShieldCheck className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-300">
            Akses Administrator Platform & Finance
          </p>
          <p className="mt-0.5 text-blue-400/90 leading-relaxed">
            Halaman ini menampilkan seluruh antrean penarikan dana (manual & otomatis) dari dompet organisasi maupun personal di semua aplikasi. Approve menandai transfer manual selesai (nominal yang ditransfer = nominal diterima, biaya menjadi pendapatan platform); Reject mengembalikan dana yang ditahan ke saldo pemohon.
          </p>
        </div>
      </div>

      {/* Grid Container */}
      {!loading && !canViewAll ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-500">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p>
            Halaman ini khusus anggota organisasi sistem dengan permission{' '}
            <code className="font-mono">{PAYOUT_PERMISSIONS.WITHDRAWALS_VIEW_ALL}</code>.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-4 shadow-sm">
          <AdminWithdrawalsGrid
            key={`admin-grid-${selectedCurrency}`}
            currency={selectedCurrency === 'ALL' ? undefined : selectedCurrency}
          />
        </div>
      )}
    </div>
  );
}

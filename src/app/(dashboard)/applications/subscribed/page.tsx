'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBalance } from '@/lib/piece-api';
import type { BalanceResponse, BalanceItem } from '@/lib/piece-api';
import type { ApiError } from '@/types';
import { Package, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

export default function SubscribedAppsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBalance();
      setBalance(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch subscribed apps');
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const formatBalance = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const handleAppClick = (appId: string) => {
    // Navigate to app detail page or app balance
    // For now, we'll navigate to a placeholder or could navigate to balance page with app filter
    router.push(`/applications/subscribed/${appId}`);
  };

  // Filter only apps (subscribed apps)
  const subscribedApps: BalanceItem[] = balance?.apps || [];

  if (loading) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Subscribed Apps
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Apps you have subscribed to or purchased
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Subscribed Apps
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Apps you have subscribed to or purchased
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div
            className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]"
            role="alert"
          >
            {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Subscribed Apps
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Apps you have subscribed to or purchased
            </p>
          </div>
          <button
            onClick={fetchBalance}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:bg-[var(--action-primary-hover)] disabled:bg-[var(--text-muted)] disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Apps List */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            My Subscribed Apps
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {subscribedApps.length} app{subscribedApps.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {subscribedApps.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
            <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
              No Subscribed Apps
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              You haven&apos;t subscribed to or purchased any apps yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-default)]">
              <thead className="bg-[var(--bg-sidebar)]">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    App Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Balance
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Last Activity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-default)]">
                {subscribedApps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    onClick={() => app.appId && handleAppClick(app.appId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--action-primary)]/10">
                          <Package className="h-5 w-5 text-[var(--action-primary)]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {app.appName || 'Unknown App'}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            App ID: {app.appId?.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatBalance(app.balance)} {app.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--text-secondary)]">
                        {formatDate(app.updatedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-[var(--text-secondary)]" />
                        <span className="text-xs text-[var(--text-secondary)]">View Details</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}


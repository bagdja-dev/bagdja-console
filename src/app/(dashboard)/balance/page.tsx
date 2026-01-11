'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getBalance, getBalanceWithRefresh } from '@/lib/piece-api';
import type { BalanceResponse, BalanceItem } from '@/lib/piece-api';
import type { ApiError } from '@/types';
import { Wallet, Building, Package, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

export default function BalancePage() {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBalance();
      setBalance(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch balance');
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBalanceWithRefresh();
      setBalance(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to refresh balance');
      console.error('Failed to refresh balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrg = (orgId: string) => {
    setExpandedOrgs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orgId)) {
        newSet.delete(orgId);
      } else {
        newSet.add(orgId);
      }
      return newSet;
    });
  };

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

  // Group apps by organization
  const appsByOrg = balance?.organizations.reduce((acc, org) => {
    const orgApps = balance.apps.filter((app) => {
      // Apps that belong to this organization
      // Note: This is a simplified grouping - you may need to adjust based on your data structure
      return app.organizationId === org.organizationId;
    });
    if (orgApps.length > 0) {
      acc[org.organizationId || ''] = orgApps;
    }
    return acc;
  }, {} as Record<string, BalanceItem[]>) || {};

  if (loading) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Balance
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            View your Piece balance and distributions
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
            Balance
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            View your Piece balance and distributions
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
              Balance
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              View your Piece balance and distributions
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:bg-[var(--action-primary-hover)] disabled:bg-[var(--text-muted)] disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Balance Card */}
      {balance?.global && (
        <div className="mb-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--action-primary)]/10">
                <Wallet className="h-6 w-6 text-[var(--action-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Global Balance
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Your main Piece balance
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[var(--text-primary)]">
                {formatBalance(balance.global.balance)} {balance.global.currency}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Updated {formatDate(balance.global.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Distributions Table */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Distributions
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Organizational and app-level credits
          </p>
        </div>

        {balance && balance.organizations.length === 0 && balance.apps.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
            <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
              No distributions
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              You don&apos;t have any organizational or app-level credits yet.
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
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Name
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
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-default)]">
                {balance?.organizations.map((org) => {
                  const isExpanded = expandedOrgs.has(org.organizationId || '');
                  const orgApps = appsByOrg[org.organizationId || ''] || [];

                  return (
                    <React.Fragment key={org.id}>
                      <tr className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => toggleOrg(org.organizationId || '')}
                              className="mr-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <Building className="h-5 w-5 text-[var(--text-secondary)]" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {org.organizationName || 'Unknown Organization'}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            Organization
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {formatBalance(org.balance)} {org.currency}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[var(--text-secondary)]">
                            {formatDate(org.updatedAt)}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && orgApps.length > 0 && (
                        <>
                          {orgApps.map((app) => (
                            <tr
                              key={app.id}
                              className="hover:bg-[var(--bg-hover)] transition-colors bg-[var(--bg-sidebar)]/50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap pl-12">
                                <Package className="h-4 w-4 text-[var(--text-secondary)]" />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                  {app.appName || 'Unknown App'}
                                </div>
                                <div className="text-xs text-[var(--text-secondary)]">
                                  App
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
                            </tr>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Standalone apps (not grouped under any organization) */}
                {balance?.apps
                  .filter((app) => {
                    // Apps that don't belong to any organization in the list
                    return !balance.organizations.some(
                      (org) => org.organizationId === app.organizationId
                    );
                  })
                  .map((app) => (
                    <tr key={app.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Package className="h-5 w-5 text-[var(--text-secondary)]" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {app.appName || 'Unknown App'}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          App
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


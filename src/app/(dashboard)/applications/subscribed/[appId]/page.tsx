'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPublicAppDetails } from '@/lib/api';
import { getMyAppBalance, type AppBalanceResponse } from '@/lib/piece-api';
import { getSubscriptionsForOrg } from '@/lib/subscriptions-api';
import { getPurchasedLicenses } from '@/lib/licenses-api';
import { getPlans } from '@/lib/plans-api';
import type { ApiError, ClientApp, Subscription, License, Plan } from '@/types';
import {
  ArrowLeft,
  Package,
  Wallet,
  History,
  CreditCard,
  Key,
  Loader2,
  RefreshCw,
  Mail,
  Calendar,
  Building2,
} from 'lucide-react';

type TabType = 'history' | 'subscribed' | 'licenses';

export default function SubscribedAppDetailPage() {
  const params = useParams();
  const appId = params?.appId as string;

  const [app, setApp] = useState<ClientApp | null>(null);
  const [balanceData, setBalanceData] = useState<AppBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [plansById, setPlansById] = useState<Record<string, Plan>>({});

  const [licenses, setLicenses] = useState<License[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [licensesError, setLicensesError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!appId) return;
    
    try {
      setRefreshingBalance(true);
      const balance = await getMyAppBalance(appId);
      setBalanceData(balance);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      // Don't set error state on refresh, just log it
    } finally {
      setRefreshingBalance(false);
    }
  }, [appId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch app details and balance data in parallel
        const [appData, balance] = await Promise.all([
          getPublicAppDetails(appId),
          getMyAppBalance(appId),
        ]);
        
        setApp(appData);
        setBalanceData(balance);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch data');
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (appId) {
      fetchData();
    }
  }, [appId]);

  // Auto-refresh balance when window gains focus
  useEffect(() => {
    if (!appId) return;

    const handleFocus = () => {
      if (!loading) {
        fetchBalance();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [appId, loading, fetchBalance]);

  // Org aktif (console-wide selector, lihat Topbar.tsx) — subscriptions &
  // licenses di payment-service selalu scoped ke satu orgId (bukan userId,
  // krn console selalu beraksi atas nama org yang login).
  useEffect(() => {
    const readActiveOrg = () => {
      setActiveOrgId(
        typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null,
      );
    };
    readActiveOrg();

    window.addEventListener('organizationChanged', readActiveOrg);
    return () => window.removeEventListener('organizationChanged', readActiveOrg);
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    if (!appId || !activeOrgId) return;
    try {
      setSubscriptionsLoading(true);
      setSubscriptionsError(null);
      const [subs, plans] = await Promise.all([
        getSubscriptionsForOrg(appId, activeOrgId),
        getPlans(appId),
      ]);
      setSubscriptions(subs);
      setPlansById(Object.fromEntries(plans.map((p) => [p.id, p])));
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      const apiError = err as ApiError;
      setSubscriptionsError(apiError.message || 'Failed to fetch subscriptions from Payment Service');
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [appId, activeOrgId]);

  const fetchLicenses = useCallback(async () => {
    if (!appId || !activeOrgId) return;
    try {
      setLicensesLoading(true);
      setLicensesError(null);
      const data = await getPurchasedLicenses(appId, activeOrgId);
      setLicenses(data);
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
      const apiError = err as ApiError;
      setLicensesError(apiError.message || 'Failed to fetch licenses from Payment Service');
    } finally {
      setLicensesLoading(false);
    }
  }, [appId, activeOrgId]);

  // Lazy-load per tab (sama pola dgn BillingSettingModal.tsx) — tidak perlu
  // fetch kedua-nya di awal kalau user cuma buka tab History.
  useEffect(() => {
    if (activeTab === 'subscribed') {
      fetchSubscriptions();
    } else if (activeTab === 'licenses') {
      fetchLicenses();
    }
  }, [activeTab, fetchSubscriptions, fetchLicenses]);

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) + ' BP';
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deduct: 'Purchase',
      refund: 'Refund',
      distribute: 'Credit Allocation',
      add_balance: 'Top-up',
    };
    return labels[type.toLowerCase()] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower === 'deduct') return 'text-red-600 bg-red-500/10';
    if (typeLower === 'refund') return 'text-green-600 bg-green-500/10';
    if (typeLower === 'distribute') return 'text-blue-600 bg-blue-500/10';
    if (typeLower === 'add_balance') return 'text-purple-600 bg-purple-500/10';
    return 'text-gray-600 bg-gray-500/10';
  };

  const formatMoney = (amount: number, currency: string) => {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-500/10';
      case 'TRIALING':
        return 'text-blue-600 bg-blue-500/10';
      case 'PAST_DUE':
        return 'text-amber-600 bg-amber-500/10';
      case 'SUSPENDED':
        return 'text-red-600 bg-red-500/10';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'text-gray-600 bg-gray-500/10';
      default:
        return 'text-gray-600 bg-gray-500/10';
    }
  };

  const getLicenseStatusColor = (status: string) => {
    switch (status) {
      case 'PURCHASED':
        return 'text-green-600 bg-green-500/10';
      case 'AVAILABLE':
        return 'text-blue-600 bg-blue-500/10';
      case 'REVOKED':
        return 'text-red-600 bg-red-500/10';
      default:
        return 'text-gray-600 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <div
          className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/applications/subscribed"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Subscribed Apps
        </Link>
      </div>

      {/* Header Section */}
      {app && (
        <div className="mb-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {app.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={app.logo}
                  alt={app.appName}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="h-20 w-20 flex items-center justify-center rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
                  <Package className="h-10 w-10" />
                </div>
              )}
            </div>

            {/* App Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {app.appName}
              </h1>
              {app.description && (
                <p className="text-[var(--text-secondary)] mb-4">{app.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)]">App ID:</span>
                  <span className="font-mono text-[var(--text-primary)]">{app.appId}</span>
                </div>
                {app.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-secondary)]">{app.contactEmail}</span>
                  </div>
                )}
                {app.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-secondary)]">
                      Created {formatDate(app.createdAt)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      app.isActive
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-gray-500/10 text-gray-600'
                    }`}
                  >
                    {app.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            {balanceData && (
              <div className="flex-shrink-0">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[var(--text-secondary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">App Balance</span>
                    </div>
                    <button
                      onClick={fetchBalance}
                      disabled={refreshingBalance}
                      className="p-1 hover:bg-[var(--bg-surface)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh balance"
                    >
                      <RefreshCw className={`h-3 w-3 text-[var(--text-secondary)] ${refreshingBalance ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(balanceData.balance)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    Updated {formatDate(balanceData.updatedAt)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-default)]">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </div>
          </button>
          <button
            onClick={() => setActiveTab('subscribed')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'subscribed'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscribed
            </div>
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'licenses'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Licenses
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] mt-6">
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transaction History</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                All transactions related to this app balance
              </p>
            </div>
            {balanceData && balanceData.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Before Balance
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        After Balance
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {balanceData.transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(
                              transaction.type
                            )}`}
                          >
                            {getTransactionTypeLabel(transaction.type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {formatCurrency(transaction.beforeBalance)}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-[var(--text-primary)]">
                          {formatCurrency(transaction.afterBalance)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {transaction.description || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              transaction.status === 'success'
                                ? 'bg-green-500/10 text-green-600'
                                : transaction.status === 'failed'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-yellow-500/10 text-yellow-600'
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  No Transactions
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This app hasn&apos;t made any transactions yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Subscribed Tab */}
        {activeTab === 'subscribed' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Subscription Plans
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Plans your organization is currently subscribed to for this app
              </p>
            </div>

            {!activeOrgId ? (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  Select an organization
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Subscriptions are scoped per organization — pick one from the top bar.
                </p>
              </div>
            ) : subscriptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
              </div>
            ) : subscriptionsError ? (
              <div className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]">
                {subscriptionsError}
              </div>
            ) : subscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Plan</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Current Period</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Next Billing</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Auto-renew</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {subscriptions.map((sub) => {
                      const plan = plansById[sub.planId];
                      return (
                        <tr key={sub.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                          <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                            <div className="font-medium">{plan?.name || 'Unknown plan'}</div>
                            {plan?.code && (
                              <div className="text-xs text-[var(--text-secondary)] font-mono">{plan.code}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSubscriptionStatusColor(sub.status)}`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                            {formatMoney(sub.lockedAmount, sub.currency)}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                            {formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                            {formatDate(sub.nextBillingDate)}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                            {sub.cancelAtPeriodEnd ? 'Cancels at period end' : 'Yes'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  No Subscriptions
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Your organization hasn&apos;t subscribed to any plan for this app yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Licenses Tab */}
        {activeTab === 'licenses' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Licenses
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                License keys your organization has purchased for this app
              </p>
            </div>

            {!activeOrgId ? (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  Select an organization
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Licenses are scoped per organization — pick one from the top bar.
                </p>
              </div>
            ) : licensesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
              </div>
            ) : licensesError ? (
              <div className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]">
                {licensesError}
              </div>
            ) : licenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">License Key</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Max Users</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Purchased</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {licenses.map((license) => (
                      <tr key={license.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-4 text-sm font-mono text-[var(--text-primary)]">
                          {license.licenseKey}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{license.type}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLicenseStatusColor(license.status)}`}
                          >
                            {license.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{license.maxUsers}</td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {license.purchasedAt ? formatDate(license.purchasedAt) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {license.expiresAt ? formatDate(license.expiresAt) : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Key className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  No Licenses
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Your organization hasn&apos;t purchased any license for this app yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}


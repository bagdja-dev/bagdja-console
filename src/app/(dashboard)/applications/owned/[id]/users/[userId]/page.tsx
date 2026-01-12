'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getUserById } from '@/lib/api';
import { getAppBalance, type AppBalanceResponse } from '@/lib/piece-api';
import type { User, ApiError } from '@/types';
import { ArrowLeft, User as UserIcon, Mail, Calendar, Wallet, Activity, Loader2, UserX } from 'lucide-react';

// Dummy data for Activity Log tab
const dummyActivities = [
  {
    id: '1',
    timestamp: '2024-03-20T10:30:00Z',
    action: 'Logged in',
    description: 'User logged into the application',
    source: 'system',
  },
  {
    id: '2',
    timestamp: '2024-03-20T10:35:00Z',
    action: 'Purchased Product',
    description: 'Purchased Mathematics Practice Test',
    source: 'app',
  },
  {
    id: '3',
    timestamp: '2024-03-20T11:00:00Z',
    action: 'Completed Exam',
    description: 'Completed Mathematics Practice Test with score 85/100',
    source: 'app',
  },
  {
    id: '4',
    timestamp: '2024-03-19T14:20:00Z',
    action: 'Subscribed to Plan',
    description: 'Subscribed to Premium Plan',
    source: 'system',
  },
  {
    id: '5',
    timestamp: '2024-03-19T14:25:00Z',
    action: 'Purchased Product',
    description: 'Purchased Physics Quiz Set 1',
    source: 'app',
  },
  {
    id: '6',
    timestamp: '2024-03-18T09:15:00Z',
    action: 'Logged in',
    description: 'User logged into the application',
    source: 'system',
  },
];

type TabType = 'transactions' | 'activity';

export default function UserDetailPage() {
  const params = useParams();
  const appId = params?.id as string;
  const userId = params?.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [balanceData, setBalanceData] = useState<AppBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user data
        const userData = await getUserById(userId);
        setUser(userData);

        // Fetch balance data
        const balance = await getAppBalance(appId, userId);
        setBalanceData(balance);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch data');
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (appId && userId) {
      fetchData();
    }
  }, [appId, userId]);

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
    }).format(amount) + ' piece';
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEDUCT: 'Purchase',
      REFUND: 'Refund',
      DISTRIBUTE: 'Credit Allocation',
      ADD_BALANCE: 'Top-up',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      DEDUCT: 'text-red-600 bg-red-500/10',
      REFUND: 'text-green-600 bg-green-500/10',
      DISTRIBUTE: 'text-blue-600 bg-blue-500/10',
      ADD_BALANCE: 'text-green-600 bg-green-500/10',
    };
    return colors[type] || 'text-gray-600 bg-gray-500/10';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href={`/applications/owned/${appId}`}
        className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to App
      </Link>

      {/* Error Notification */}
      {(error || !user) && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <UserX className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                User Not Found
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {error || 'The user you are looking for could not be found.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {!user ? (
              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-gray-500/10 text-gray-400">
                <UserX className="h-10 w-10" />
              </div>
            ) : user.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profilePicture}
                alt={user.name || user.email}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
                <UserIcon className="h-10 w-10" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            {!user ? (
              <>
                <h1 className="text-2xl font-bold text-[var(--text-secondary)] mb-2">
                  User Information
                </h1>
                <div className="text-sm text-[var(--text-muted)]">
                  User details are not available
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {user.name || user.username || user.email}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-secondary)]">{user.email}</span>
                  </div>
                  {user.username && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-secondary)]">Username:</span>
                      <span className="text-[var(--text-primary)] font-mono">{user.username}</span>
                    </div>
                  )}
                  {user.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
                      <span className="text-[var(--text-secondary)]">
                        Joined {formatDate(user.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.emailVerified
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-gray-500/10 text-gray-600'
                      }`}
                    >
                      {user.emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Balance Card */}
          {balanceData && (
            <div className="flex-shrink-0">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-sm text-[var(--text-secondary)]">App Balance</span>
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

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-default)]">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'transactions'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Transactions
            </div>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'activity'
                ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transaction History</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                All transactions related to this user&apos;s app balance
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
                    {balanceData.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(tx.type)}`}
                          >
                            {getTransactionTypeLabel(tx.type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {formatCurrency(tx.beforeBalance)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                          {formatCurrency(tx.afterBalance)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                          {tx.description || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.status === 'SUCCESS'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-yellow-500/10 text-yellow-600'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
                <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
                  No Transactions
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This user hasn&apos;t made any transactions yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Activity Log</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                All activities performed by this user in the application
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Timestamp
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Action
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {dummyActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {formatDate(activity.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
                        {activity.action}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {activity.description}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.source === 'system'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-purple-500/10 text-purple-600'
                          }`}
                        >
                          {activity.source === 'system' ? 'System' : 'App'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


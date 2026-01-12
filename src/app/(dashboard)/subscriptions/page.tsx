'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMySubscriptions } from '@/lib/subscriptions-api';
import type { Subscription, ApiError, SubscriptionStatus } from '@/types';
import { ArrowLeft, CreditCard, Calendar } from 'lucide-react';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMySubscriptions();
        setSubscriptions(data);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch subscriptions');
        console.error('Failed to fetch subscriptions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600';
      case 'expired':
        return 'bg-gray-500/10 text-gray-600';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const isExpiringSoon = (endDate: Date | string) => {
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const now = new Date();
    const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--text-secondary)]">Loading subscriptions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-[var(--text-danger)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Subscriptions</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          View and manage your subscription plans
        </p>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)] mb-2">No subscriptions found</p>
          <p className="text-sm text-[var(--text-muted)]">
            You don&apos;t have any active subscriptions yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((subscription) => {
            const endDate = typeof subscription.endDate === 'string' 
              ? new Date(subscription.endDate) 
              : subscription.endDate;
            const expiringSoon = isExpiringSoon(endDate);

            return (
              <div
                key={subscription.id}
                className={`rounded-lg border ${
                  expiringSoon && subscription.status === 'active'
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                } p-6`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {subscription.planName || 'Unknown Plan'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                      {expiringSoon && subscription.status === 'active' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mt-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Started: {formatDate(subscription.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Ends: {formatDate(subscription.endDate)}</span>
                      </div>
                      {subscription.transactionId && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-mono text-xs">TX: {subscription.transactionId.slice(0, 8)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


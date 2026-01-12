'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getClientApps, regenerateAppSecret } from '@/lib/api';
import type { ClientApp, ApiError } from '@/types';
import { Plus, Package, Mail, Calendar, RefreshCw, Copy, Check, X } from 'lucide-react';
import { Button } from '@/ui/button';

export default function OwnedAppsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<ClientApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [newAppSecret, setNewAppSecret] = useState<string | null>(null);
  const [newAppName, setNewAppName] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Check if active organization exists
      const activeOrgId = typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null;
      if (!activeOrgId) {
        setError('Please select an organization first');
        setLoading(false);
        return;
      }
      const data = await getClientApps();
      setApps(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch apps');
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Listen for organization changes and refetch apps
  useEffect(() => {
    const handleOrganizationChange = () => {
      fetchApps();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('organizationChanged', handleOrganizationChange);
      return () => {
        window.removeEventListener('organizationChanged', handleOrganizationChange);
      };
    }
  }, [fetchApps]);

  // Check for new app secret from create page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const secret = sessionStorage.getItem('newAppSecret');
      const appName = sessionStorage.getItem('newAppName');
      if (secret && appName) {
        setNewAppSecret(secret);
        setNewAppName(appName);
        setShowSecretModal(true);
        sessionStorage.removeItem('newAppSecret');
        sessionStorage.removeItem('newAppName');
        // Refetch apps to show the new app
        fetchApps();
      }
    }
  }, [fetchApps]);

  const handleRegenerateSecret = async (appId: string) => {
    setError(null);
    setRegenerating(appId);

    try {
      const result = await regenerateAppSecret(appId);
      setNewAppSecret(result.app_secret);
      setShowSecretModal(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to regenerate secret');
      console.error('Failed to regenerate secret:', err);
    } finally {
      setRegenerating(null);
    }
  };

  const handleCopySecret = async () => {
    if (newAppSecret) {
      await navigator.clipboard.writeText(newAppSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCloseSecretModal = () => {
    setShowSecretModal(false);
    setNewAppSecret(null);
    setNewAppName(null);
    setCopiedSecret(false);
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  if (loading) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Owned Apps
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your client applications
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="text-center text-[var(--text-secondary)]">
            Loading apps...
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
            Owned Apps
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your client applications
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Owned Apps
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your client applications
          </p>
        </div>
        <Link
          href="/applications/owned/create"
          className="flex items-center gap-2 rounded-md bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Create App
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
            No apps
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Get started by creating your first client app.
          </p>
          <div className="mt-6">
            <Link
              href="/applications/owned/create"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Create App
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-default)]">
              <thead className="bg-[var(--bg-sidebar)]">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    App
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    App ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-default)]">
                {apps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => router.push(`/applications/owned/${app.id}`)}
                    className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
                          {app.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={app.logo}
                              alt={app.appName}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5" />
                          )}
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {app.appName}
                          </div>
                          {app.description && (
                            <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
                              {app.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--text-primary)] font-mono">
                        {app.appId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.contactEmail ? (
                        <div className="flex items-center text-sm text-[var(--text-secondary)]">
                          <Mail className="h-4 w-4 mr-2" />
                          {app.contactEmail}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-[var(--text-secondary)]">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(app.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          app.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {app.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRegenerateSecret(app.id); }}
                        disabled={regenerating === app.id}
                        className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ml-auto"
                      >
                        <RefreshCw className={`h-4 w-4 ${regenerating === app.id ? 'animate-spin' : ''}`} />
                        Regenerate Secret
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      {showSecretModal && newAppSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {newAppName ? `App Secret - ${newAppName}` : 'App Secret'}
              </h2>
              <button
                type="button"
                onClick={handleCloseSecretModal}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-md bg-[var(--brand-warning)]/20 border border-[var(--brand-warning)]/30 p-4 text-sm text-[var(--brand-warning)]">
                ⚠️ This secret will only be shown once. Make sure to copy it now and store it securely.
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  App Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={newAppSecret}
                    className="flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-main)] px-3 py-2 text-sm font-mono text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    {copiedSecret ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4">
                <Button
                  type="button"
                  onClick={handleCloseSecretModal}
                >
                  I&apos;ve copied the secret
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


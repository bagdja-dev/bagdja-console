'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientApp, getOrganizations } from '@/lib/api';
import { AssetSelector } from '@/components/AssetSelector';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import type { ApiError, Organization } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateAppPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    app_id: '',
    app_name: '',
    description: '',
    contact_email: '',
    logo: '',
  });

  // Check active organization and its app-creation role.
  useEffect(() => {
    let cancelled = false;
    const loadAccess = async () => {
      const activeOrgId = sessionStorage.getItem('activeOrganizationId');
      if (!activeOrgId) {
        router.push('/applications/owned');
        return;
      }
      try {
        const organizations = await getOrganizations();
        if (cancelled) return;
        setActiveOrganization(organizations.find((organization) => organization.orgId === activeOrgId) ?? null);
      } catch (err) {
        if (!cancelled) {
          const apiError = err as ApiError;
          setError(apiError.message || 'Could not verify organization access.');
        }
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    };
    void loadAccess();
    return () => { cancelled = true; };
  }, [router]);

  const canCreateApp = activeOrganization?.role?.slug === 'owner'
    || activeOrganization?.role?.name === 'Owner'
    || activeOrganization?.permissions?.includes('auth.*.client-apps.create') === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canCreateApp) {
      setError(`Only an Owner of ${activeOrganization?.name ?? 'the active organization'} can create client apps.`);
      return;
    }
    setLoading(true);

    try {
      // Check if active organization exists
      const activeOrgId = typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null;
      if (!activeOrgId) {
        setError('Please select an organization first');
        setLoading(false);
        return;
      }

      const newApp = await createClientApp({
        app_id: formData.app_id,
        app_name: formData.app_name,
        description: formData.description || undefined,
        contact_email: formData.contact_email || undefined,
        logo: formData.logo || undefined,
      });

      // Store app secret in sessionStorage to show in modal after redirect
      if (newApp.app_secret) {
        sessionStorage.setItem('newAppSecret', newApp.app_secret);
        sessionStorage.setItem('newAppName', newApp.appName);
      }

      // Redirect back to owned apps page
      router.push('/applications/owned');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create app');
      console.error('Failed to create app:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <div className="mb-8">
        <Link
          href="/applications/owned"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Owned Apps
        </Link>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Create New App
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Register a new client application for your organization
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        {error && (
          <div
            className="mb-6 rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]"
            role="alert"
          >
            {error}
          </div>
        )}

          {checkingAccess ? (
            <p className="text-sm text-[var(--text-secondary)]">Checking organization access…</p>
          ) : !canCreateApp ? (
            <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-main)] p-4 text-sm text-[var(--text-secondary)]" role="status">
              Your role in {activeOrganization?.name ?? 'the active organization'} is {activeOrganization?.role?.name ?? 'not available'} and it does not include `auth.*.client-apps.create`. Ask an organization administrator to grant this permission.
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="app_id"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              App ID <span className="text-[var(--brand-error)]">*</span>
            </label>
            <Input
              id="app_id"
              type="text"
              required
              value={formData.app_id}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, app_id: e.target.value }))
              }
              placeholder="my-app-id"
              className="w-full"
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Unique identifier for your app (e.g., &quot;my-app-id&quot;). Only lowercase letters, numbers, and hyphens allowed.
            </p>
          </div>

          <div>
            <label
              htmlFor="app_name"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              App Name <span className="text-[var(--brand-error)]">*</span>
            </label>
            <Input
              id="app_name"
              type="text"
              required
              value={formData.app_name}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, app_name: e.target.value }))
              }
              placeholder="My Application"
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="Brief description of your application"
              rows={3}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="contact_email"
              className="block text-sm font-medium text-[var(--text-primary)] mb-2"
            >
              Contact Email
            </label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, contact_email: e.target.value }))
              }
              placeholder="contact@example.com"
              className="w-full"
            />
          </div>

          <AssetSelector
            label="Logo (optional)"
            value={formData.logo}
            onChange={(logo) => setFormData(prev => ({ ...prev, logo }))}
            disabled={loading}
            filterByGroup="logo"
            helpText="Select an image asset to use as app logo"
          />

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-[var(--border-default)]">
            <Link href="/applications/owned">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create App'}
            </Button>
          </div>
        </form>
        )}
      </div>

    </>
  );
}


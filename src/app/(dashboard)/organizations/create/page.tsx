'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganization } from '@/lib/api';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import type { ApiError } from '@/types';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    contactEmail: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const organization = await createOrganization({
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        contactEmail: formData.contactEmail || undefined,
      });

      // Set as active organization
      sessionStorage.setItem('activeOrganizationId', organization.id);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Create Organization
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Create a new organization to get started
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Organization Name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              placeholder="Acme Corporation"
            />

            <Input
              label="Slug (optional)"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              disabled={loading}
              placeholder="acme-corp"
              helpText="URL-friendly identifier. Will be auto-generated from name if not provided."
            />

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-[var(--text-primary)] mb-1"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--action-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)] disabled:opacity-50"
                placeholder="A brief description of your organization"
              />
            </div>

            <Input
              label="Contact Email (optional)"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              disabled={loading}
              placeholder="contact@example.com"
            />
          </div>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}


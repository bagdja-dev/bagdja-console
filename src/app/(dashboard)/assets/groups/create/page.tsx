'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAssetGroup } from '@/lib/assets-api';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import type { ApiError } from '@/types';

export default function CreateAssetGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Reset form when organization changes
  useEffect(() => {
    const handleOrganizationChange = () => {
      setFormData({
        name: '',
        description: '',
      });
      setError(null);
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createAssetGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      // Redirect to groups list
      router.push('/assets/groups');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create asset group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Create Asset Group
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Create a new asset group to organize your assets
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
              label="Group Name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              placeholder="Product Images"
              helpText="A descriptive name for this asset group"
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
                placeholder="A brief description of this asset group"
              />
            </div>
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
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}


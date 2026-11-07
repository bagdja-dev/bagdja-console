'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteOrganization, getOrganizations, updateOrganization } from '@/lib/api';
import {
  clearActiveOrganization,
  getActiveOrganizationId,
  setActiveOrganization as persistActiveOrganization,
} from '@/lib/auth';
import { AssetSelector } from '@/components/AssetSelector';
import type { Organization, ApiError, UpdateOrganizationRequest } from '@/types';
import { Plus, Building, Mail, Calendar, User, Edit, X, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    contactEmail: '',
  });
  const [selectedLogo, setSelectedLogo] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError(null);
        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch organizations');
        console.error('Failed to fetch organizations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleSelectOrganization = (org: Organization) => {
    persistActiveOrganization(org);
    // Dispatch custom event to notify Topbar to refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('organizationChanged', { detail: { organizationId: org.orgId } }));
    }
    router.push('/dashboard');
  };

  const handleEditOrganization = (org: Organization) => {
    setEditingOrganization(org);
    setEditForm({
      name: org.name,
      description: org.description ?? '',
      contactEmail: org.contactEmail ?? '',
    });
    setSelectedLogo(org.logo ?? '');
    setActionError(null);
  };

  const handleCloseModal = () => {
    setEditingOrganization(null);
    setSelectedLogo('');
    setActionError(null);
  };

  const handleSaveOrganization = async () => {
    if (!editingOrganization) return;

    setUpdating(true);
    setActionError(null);
    try {
      const update: UpdateOrganizationRequest = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        contactEmail: editForm.contactEmail.trim() || null,
        logo: selectedLogo.trim() || null,
      };
      const updatedOrg = await updateOrganization(editingOrganization.orgId, update);

      setOrganizations(orgs =>
        orgs.map(org => (org.orgId === editingOrganization.orgId ? updatedOrg : org)),
      );

      if (getActiveOrganizationId() === updatedOrg.orgId) {
        persistActiveOrganization(updatedOrg);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('organizationChanged', {
            detail: { organizationId: updatedOrg.orgId },
          }),
        );
      }

      handleCloseModal();
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message || 'Failed to update organization');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setActionError(null);
    try {
      await deleteOrganization(deleteTarget.orgId);
      setOrganizations(orgs => orgs.filter(org => org.id !== deleteTarget.id));

      if (getActiveOrganizationId() === deleteTarget.orgId) {
        clearActiveOrganization();
        window.dispatchEvent(
          new CustomEvent('organizationChanged', {
            detail: { organizationId: null },
          }),
        );
      }

      setDeleteTarget(null);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message || 'Failed to delete organization');
    } finally {
      setDeleting(false);
    }
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
            My Organizations
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your organizations
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="text-center text-[var(--text-secondary)]">
            Loading organizations...
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
            My Organizations
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your organizations
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
            My Organizations
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your organizations and access
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/organizations/create')}
          className="flex items-center gap-2 rounded-md bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
          <Building className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
            No organizations
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Get started by creating your first organization.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push('/organizations/create')}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </button>
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
                    Organization
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
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Created
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
                {organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)] group">
                          {org.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={org.logo}
                              alt={org.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <Building className="h-5 w-5" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {org.name}
                          </div>
                          {org.orgId && (
                            <div className="text-sm text-[var(--text-secondary)]">
                              {org.orgId}
                            </div>
                          )}
                          {org.description && (
                            <div className="text-xs text-[var(--text-muted)] mt-1 max-w-md truncate">
                              {org.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.contactEmail ? (
                        <div className="flex items-center text-sm text-[var(--text-primary)]">
                          <Mail className="h-4 w-4 mr-2 text-[var(--text-secondary)]" />
                          {org.contactEmail}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.role ? (
                        <div className="flex items-center text-sm text-[var(--text-primary)]">
                          <User className="h-4 w-4 mr-2 text-[var(--text-secondary)]" />
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
                            {org.role.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.createdAt ? (
                        <div className="flex items-center text-sm text-[var(--text-secondary)]">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(org.createdAt)}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleSelectOrganization(org)}
                        className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2 rounded px-2 py-1"
                      >
                        Select
                      </button>
                      {org.role?.slug === 'owner' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditOrganization(org)}
                            className="ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--action-primary)]"
                            aria-label={`Edit ${org.name}`}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          {!org.isSystemOrg && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(org);
                                setActionError(null);
                              }}
                              className="ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-[var(--brand-error)] hover:opacity-80"
                              aria-label={`Delete ${org.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {editingOrganization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Edit Organization
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                disabled={updating}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Organization Name"
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                disabled={updating}
              />
              <div>
                <label
                  htmlFor="organization-description"
                  className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
                >
                  Description
                </label>
                <textarea
                  id="organization-description"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  disabled={updating}
                  className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)] disabled:opacity-50"
                />
              </div>
              <Input
                label="Contact Email"
                type="email"
                value={editForm.contactEmail}
                onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                disabled={updating}
              />
              <AssetSelector
                label="Logo"
                value={selectedLogo}
                onChange={setSelectedLogo}
                disabled={updating}
                filterByGroup="logo"
                helpText="Select an image asset to use as organization logo"
              />

              {actionError && (
                <div
                  className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-3 text-sm text-[var(--brand-error)]"
                  role="alert"
                >
                  {actionError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveOrganization}
                  disabled={updating || !editForm.name.trim()}
                >
                  {updating ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-organization-title"
            className="w-full max-w-lg rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="delete-organization-title"
                className="text-xl font-semibold text-[var(--text-primary)]"
              >
                Delete organization?
              </h2>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                disabled={deleting}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              <strong>{deleteTarget.name}</strong> will be deactivated and removed from your active organizations. Its memberships, apps, wallets, and transaction history will be retained. Active client-app tokens may continue working until they expire.
            </p>
            {actionError && (
              <div
                className="mt-4 rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-3 text-sm text-[var(--brand-error)]"
                role="alert"
              >
                {actionError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteOrganization}
                disabled={deleting}
                className="bg-[var(--brand-error)] text-white hover:opacity-90"
              >
                {deleting ? 'Deleting...' : 'Deactivate organization'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

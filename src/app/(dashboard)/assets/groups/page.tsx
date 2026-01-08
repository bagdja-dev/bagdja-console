'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAssetGroups, deleteAssetGroup, updateAssetGroup } from '@/lib/assets-api';
import type { AssetGroup, ApiError, UpdateAssetGroupRequest } from '@/types';
import { Plus, Edit2, Trash2, Folder, Calendar, Check, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';

export default function AssetGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  // Refresh when organization changes
  useEffect(() => {
    const handleOrganizationChange = () => {
      fetchGroups();
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAssetGroups();
      setGroups(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch asset groups');
      console.error('Failed to fetch asset groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: AssetGroup) => {
    setEditingId(group.id);
    setEditForm({
      name: group.name,
      description: group.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', description: '' });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const updateData: UpdateAssetGroupRequest = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      };

      await updateAssetGroup(id, updateData);
      await fetchGroups();
      setEditingId(null);
      setEditForm({ name: '', description: '' });
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to update asset group');
      console.error('Failed to update asset group:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteAssetGroup(id);
      await fetchGroups();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to delete asset group');
      console.error('Failed to delete asset group:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date?: Date | string) => {
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

  if (loading) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Asset Groups
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your asset groups
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="text-center text-[var(--text-secondary)]">
            Loading groups...
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
            Asset Groups
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your asset groups
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
            Asset Groups
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Organize your assets into groups
          </p>
        </div>
        <Button
          onClick={() => router.push('/assets/groups/create')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
          <Folder className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
            No asset groups
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Get started by creating your first asset group.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => router.push('/assets/groups/create')}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
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
                    Group
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Status
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
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      {editingId === group.id ? (
                        <div className="space-y-2 min-w-[300px]">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Group name"
                            className="text-sm"
                          />
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Description (optional)"
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border-default)] bg-[var(--bg-main)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--action-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
                              <Folder className="h-5 w-5" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-[var(--text-primary)]">
                                {group.name}
                              </div>
                              {group.description && (
                                <div className="text-sm text-[var(--text-secondary)] mt-1 max-w-md">
                                  {group.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {group.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-[var(--text-secondary)]">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(group.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === group.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(group.id)}
                            className="text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded px-2 py-1"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(group)}
                            className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2 rounded px-2 py-1"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(group.id)}
                            disabled={deletingId === group.id}
                            className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}


'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAssets, getAssetGroups } from '@/lib/assets-api';
import type { Asset, AssetGroup, ApiError } from '@/types';
import { Plus, Image as ImageIcon, File, FileText, Download, Calendar, Copy, Check } from 'lucide-react';
import { Button } from '@/ui/button';
import { CustomSelect } from '@/ui/custom-select';

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await getAssetGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to fetch asset groups:', err);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAssets(selectedGroupId || undefined);
      setAssets(result.data);
      setTotal(result.total);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch assets');
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Refresh when organization changes
  useEffect(() => {
    const handleOrganizationChange = () => {
      fetchGroups();
      fetchAssets();
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, [fetchGroups, fetchAssets]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

  const handleCopyUrl = async (url: string, assetId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrlId(assetId);
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedUrlId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedUrlId(assetId);
        setTimeout(() => {
          setCopiedUrlId(null);
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  if (loading && assets.length === 0) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            My Assets
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your organization assets
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="text-center text-[var(--text-secondary)]">
            Loading assets...
          </div>
        </div>
      </>
    );
  }

  if (error && assets.length === 0) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            My Assets
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your organization assets
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
            My Assets
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage your organization assets
          </p>
        </div>
        <Button
          onClick={() => router.push('/assets/create')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New
        </Button>
      </div>

      {/* Filter Section */}
      <div className="mb-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Filter by Group:
          </label>
          <div className="flex-1 max-w-xs">
            <CustomSelect
              value={selectedGroupId}
              onChange={(value) => setSelectedGroupId(value)}
              options={[
                { value: '', label: 'All Groups' },
                ...groups.map((group) => ({
                  value: group.id,
                  label: group.name,
                  description: group.description,
                })),
              ]}
              placeholder="All Groups"
            />
          </div>
          {selectedGroupId && (
            <span className="text-sm text-[var(--text-secondary)]">
              ({total} asset{total !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
          <File className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
            No assets found
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {selectedGroupId
              ? 'No assets in this group. Create a new asset to get started.'
              : 'Get started by creating your first asset.'}
          </p>
          <div className="mt-6">
            <Button
              onClick={() => router.push('/assets/create')}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Asset
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
                    Asset
                  </th>
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
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Size
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
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getFileIcon(asset.mimeType)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {asset.name}
                          </div>
                          {asset.publicUrl && (
                            <a
                              href={asset.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--action-primary)] hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {groups.find(g => g.id === asset.groupId)?.name || asset.group}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {asset.mimeType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {formatFileSize(asset.size)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-[var(--text-secondary)]">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(asset.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {asset.publicUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() => asset.publicUrl && handleCopyUrl(asset.publicUrl, asset.id)}
                              className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2 rounded px-2 py-1 inline-flex items-center gap-1"
                              title="Copy URL"
                            >
                              {copiedUrlId === asset.id ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span className="text-xs">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  <span className="text-xs">Copy URL</span>
                                </>
                              )}
                            </button>
                            <a
                              href={asset.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:ring-offset-2 rounded px-2 py-1 inline-flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              <span className="text-xs">Download</span>
                            </a>
                          </>
                        )}
                      </div>
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


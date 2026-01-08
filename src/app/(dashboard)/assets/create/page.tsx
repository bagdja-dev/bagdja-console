'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAsset, getAssetGroups } from '@/lib/assets-api';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { CustomSelect } from '@/ui/custom-select';
import type { ApiError, AssetGroup } from '@/types';
import { FileText, Image as ImageIcon, File } from 'lucide-react';

export default function CreateAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [formData, setFormData] = useState({
    groupId: '',
    name: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        const data = await getAssetGroups();
        setGroups(data);
        // Set first group as default if available and no group selected
        if (data.length > 0) {
          setFormData(prev => {
            if (!prev.groupId) {
              return { ...prev, groupId: data[0].id };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to fetch asset groups:', err);
        setError('Failed to load asset groups. Please refresh the page.');
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  // Reset form when organization changes
  useEffect(() => {
    const handleOrganizationChange = () => {
      // Reset form when organization changes
      setSelectedFile(null);
      setPreview(null);
      setFormData({
        groupId: '',
        name: '',
      });
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refetch groups for new organization
      const fetchGroups = async () => {
        try {
          setLoadingGroups(true);
          const data = await getAssetGroups();
          setGroups(data);
          // Set first group as default
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, groupId: data[0].id }));
          }
        } catch (err) {
          console.error('Failed to fetch asset groups:', err);
        } finally {
          setLoadingGroups(false);
        }
      };
      fetchGroups();
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }

      // Auto-fill name if empty
      if (!formData.name) {
        setFormData({ ...formData, name: file.name });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // Get organization ID from sessionStorage
    const organizationId = sessionStorage.getItem('activeOrganizationId');
    if (!organizationId) {
      setError('Organization ID not found. Please select an organization first.');
      return;
    }

    setLoading(true);

    if (!formData.groupId) {
      setError('Please select a group');
      return;
    }

    try {
      await createAsset(
        {
          file: selectedFile,
          groupId: formData.groupId,
          name: formData.name || undefined,
        },
        organizationId
      );

      // Redirect to assets list on success
      router.push('/assets');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to upload asset');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return null;
    
    if (selectedFile.type.startsWith('image/')) {
      return <ImageIcon className="h-12 w-12 text-[var(--text-secondary)]" />;
    }
    return <FileText className="h-12 w-12 text-[var(--text-secondary)]" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Create New Asset
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Upload a new asset to your organization
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

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              File <span className="text-[var(--brand-error)]">*</span>
            </label>
            <div className="mt-1">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border-default)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {selectedFile ? (
                    <>
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt="Preview"
                          className="h-16 w-16 object-cover rounded mb-2"
                        />
                      ) : (
                        getFileIcon()
                      )}
                      <p className="mb-1 text-sm text-[var(--text-primary)] font-medium">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </>
                  ) : (
                    <>
                      <File className="h-10 w-10 text-[var(--text-secondary)] mb-2" />
                      <p className="mb-2 text-sm text-[var(--text-primary)]">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Any file type supported
                      </p>
                    </>
                  )}
                </div>
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="mt-2 text-sm text-[var(--brand-error)] hover:underline"
                >
                  Remove file
                </button>
              )}
            </div>
          </div>

          {/* Group Select */}
          <CustomSelect
            label={
              <>
                Group <span className="text-[var(--brand-error)]">*</span>
              </>
            }
            value={formData.groupId}
            onChange={(value) => setFormData({ ...formData, groupId: value })}
            options={groups.map((group) => ({
              value: group.id,
              label: group.name,
              description: group.description,
            }))}
            placeholder="Select a group"
            disabled={loading || loadingGroups}
            loading={loadingGroups}
            emptyText="No groups available. Please create a group first."
          />

          {/* Name Input */}
          <Input
            label="Name (optional)"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={loading}
            placeholder={selectedFile?.name || 'Asset name'}
            helpText="Leave empty to use filename"
          />

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedFile}>
              {loading ? 'Uploading...' : 'Upload Asset'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}


'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createAsset } from '@/lib/assets-api';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import type { ApiError } from '@/types';
import { FileText, Image as ImageIcon, File } from 'lucide-react';

export default function CreateAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    group: 'logo' as 'logo' | 'banner' | 'email' | 'document',
    name: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      await createAsset(
        {
          file: selectedFile,
          group: formData.group,
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Group <span className="text-[var(--brand-error)]">*</span>
            </label>
            <select
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: e.target.value as typeof formData.group })}
              disabled={loading}
              className="w-full px-4 py-2 border rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="logo">Logo</option>
              <option value="banner">Banner</option>
              <option value="email">Email</option>
              <option value="document">Document</option>
            </select>
          </div>

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


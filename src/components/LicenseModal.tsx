'use client';

import { useState, useEffect } from 'react';
import type { License, CreateLicenseRequest, UpdateLicenseRequest, ApiError } from '@/types';
import { LicenseType } from '@/types';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import { X, Code2, AlertCircle } from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLicenseRequest | UpdateLicenseRequest) => Promise<void>;
  license?: License | null;
  appId: string;
}

export default function LicenseModal({ isOpen, onClose, onSubmit, license, appId: _appId }: LicenseModalProps) {
  const [formData, setFormData] = useState<CreateLicenseRequest>({
    type: LicenseType.ORG,
    maxUsers: 1,
    expTime: null,
    price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expTimeInput, setExpTimeInput] = useState<string>('');
  const [noExpiration, setNoExpiration] = useState<boolean>(true);
  const [metadataJson, setMetadataJson] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (license) {
      setFormData({
        type: license.type,
        maxUsers: license.maxUsers,
        expTime: license.expTime,
        price: Number(license.price),
        metadata: license.metadata || {},
      });
      setExpTimeInput(license.expTime?.toString() || '');
      setNoExpiration(license.expTime === null);
      // Format metadata as JSON string
      const metadata = license.metadata || {};
      setMetadataJson(JSON.stringify(metadata, null, 2));
    } else {
      setFormData({
        type: LicenseType.ORG,
        maxUsers: 1,
        expTime: null,
        price: 0,
        metadata: {},
      });
      setExpTimeInput('');
      setNoExpiration(true);
      setMetadataJson('{}');
    }
    setError(null);
    setJsonError(null);
  }, [license, isOpen]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateJson = (jsonString: string): Record<string, any> | null => {
    if (!jsonString.trim()) {
      return {};
    }
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Metadata must be a JSON object');
        return null;
      }
      setJsonError(null);
      return parsed;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  };

  const formatJson = () => {
    const parsed = validateJson(metadataJson);
    if (parsed !== null) {
      setMetadataJson(JSON.stringify(parsed, null, 2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate and parse JSON metadata
      const metadata = validateJson(metadataJson);
      if (metadata === null) {
        setError('Please fix JSON errors in metadata');
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        expTime: noExpiration ? null : (expTimeInput ? parseInt(expTimeInput, 10) : null),
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      await onSubmit(submitData);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to save license');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {license ? 'Edit License' : 'Create License'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="License Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LicenseType })}
              required
              disabled={loading}
            >
              <option value="org">Organization</option>
              <option value="app">App</option>
            </Select>

            <Input
              label="Max Users"
              type="number"
              min="1"
              value={formData.maxUsers}
              onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })}
              required
              disabled={loading}
            />
          </div>

          <div className="border-t border-[var(--border-default)] pt-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Expiration Time
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={noExpiration}
                  onChange={(e) => {
                    setNoExpiration(e.target.checked);
                    if (e.target.checked) {
                      setExpTimeInput('');
                    }
                  }}
                  disabled={loading}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">No expiration</span>
              </label>
              {!noExpiration && (
                <Input
                  label="Expiration Time (days)"
                  type="number"
                  min="1"
                  value={expTimeInput}
                  onChange={(e) => setExpTimeInput(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., 365 for 1 year"
                  helpText="Number of days until license expires"
                />
              )}
            </div>
          </div>

          <Input
            label="Price (BP)"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            required
            disabled={loading}
          />

          <div className="border-t border-[var(--border-default)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Metadata (Optional)</h3>
              <button
                type="button"
                onClick={formatJson}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors disabled:opacity-50"
                title="Format JSON"
              >
                <Code2 className="h-3 w-3" />
                Format
              </button>
            </div>
            <div>
              <textarea
                value={metadataJson}
                onChange={(e) => {
                  setMetadataJson(e.target.value);
                  // Clear error when user starts typing
                  if (jsonError) {
                    validateJson(e.target.value);
                  }
                }}
                onBlur={() => validateJson(metadataJson)}
                disabled={loading}
                rows={6}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-[var(--bg-surface)] text-[var(--text-primary)]
                  border-[var(--border-default)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent
                  placeholder:text-[var(--text-muted)]
                  font-mono text-sm
                  disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50
                  ${jsonError ? 'border-[var(--brand-error)]' : ''}
                `}
                placeholder='{\n  "allowedDomains": ["example.com"],\n  "maxDevices": 5\n}'
                spellCheck={false}
              />
              {jsonError && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-600 text-xs">{jsonError}</p>
                </div>
              )}
              {!jsonError && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Enter valid JSON object. Example: <code className="px-1 py-0.5 bg-[var(--bg-sidebar)] rounded">&#123;&quot;allowedDomains&quot;: [&quot;example.com&quot;], &quot;maxDevices&quot;: 5&#125;</code>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : license ? 'Update License' : 'Create License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


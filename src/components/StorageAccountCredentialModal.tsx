'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { FancySelect, type FancySelectOption } from '@/ui/fancy-select';
import type { StorageAccountCredential } from '@/lib/storage-account-credentials-api';
import { getAllOrganizations, getAppsByOrgSlug } from '@/lib/api';

const GLOBAL_DEFAULT_OPTION: FancySelectOption = {
  value: 'default',
  label: 'Global default',
  description: 'Applies to every organization / app unless a more specific row exists',
};

interface StorageAccountCredentialModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  credential: StorageAccountCredential | null;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

const providerOptions = [
  { value: 'cloudflare_r2', label: 'Cloudflare R2', description: 'Default/primary storage provider' },
  { value: 's3', label: 'S3-compatible', description: 'AWS S3, MinIO, or any other S3-compatible backend' },
];

const statusOptions = [
  { value: 'true', label: 'Active', description: 'Credential active' },
  { value: 'false', label: 'Inactive', description: 'Credential inactive' },
];

// Fields shown per provider — matches exactly what S3CompatibleAdapter reads
// from `credentials` (see bagdja-storage-service). Keep in sync with that file.
const PROVIDER_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  cloudflare_r2: [
    { key: 'accountId', label: 'Cloudflare Account ID', placeholder: 'a1b2c3d4e5f6' },
    { key: 'accessKeyId', label: 'Access Key ID', placeholder: 'R2 access key id' },
    { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: 'R2 secret access key' },
    { key: 'endpoint', label: 'Endpoint', placeholder: 'https://<account_id>.r2.cloudflarestorage.com' },
    { key: 'bucketName', label: 'Bucket Name', placeholder: 'e.g. website-bagdja (<app-slug>-bagdja convention)' },
    { key: 'publicUrlBase', label: 'Public URL Base', placeholder: 'https://pub-xxxxxxxx.r2.dev' },
  ],
  s3: [
    { key: 'accessKeyId', label: 'Access Key ID', placeholder: 'S3 access key id' },
    { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: 'S3 secret access key' },
    { key: 'endpoint', label: 'Endpoint', placeholder: 'https://s3.<region>.amazonaws.com (or MinIO URL)' },
    { key: 'region', label: 'Region', placeholder: 'us-east-1' },
    { key: 'bucketName', label: 'Bucket Name', placeholder: 'e.g. website-bagdja (<app-slug>-bagdja convention)' },
    { key: 'publicUrlBase', label: 'Public URL Base', placeholder: 'https://<bucket>.s3.<region>.amazonaws.com' },
  ],
};

export default function StorageAccountCredentialModal({
  isOpen,
  mode,
  credential,
  onClose,
  onSubmit,
}: StorageAccountCredentialModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provider, setProvider] = useState('cloudflare_r2');
  const [orgId, setOrgId] = useState('default');
  const [appId, setAppId] = useState('default');
  const [credFields, setCredFields] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);

  const [orgOptions, setOrgOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [appOptions, setAppOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Load the org picker once when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setOrgsLoading(true);
    getAllOrganizations()
      .then((orgs) => {
        if (cancelled) return;
        setOrgOptions([
          GLOBAL_DEFAULT_OPTION,
          ...orgs.map((o) => ({ value: o.orgId, label: o.name, description: o.orgId })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setOrgOptions([GLOBAL_DEFAULT_OPTION]);
      })
      .finally(() => {
        if (!cancelled) setOrgsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Reload the app picker whenever the selected org changes — apps are scoped to an org.
  useEffect(() => {
    if (!isOpen) return;
    if (orgId === 'default') {
      setAppOptions([GLOBAL_DEFAULT_OPTION]);
      return;
    }
    let cancelled = false;
    setAppsLoading(true);
    getAppsByOrgSlug(orgId)
      .then((apps) => {
        if (cancelled) return;
        setAppOptions([
          GLOBAL_DEFAULT_OPTION,
          ...apps.map((a) => ({ value: a.appId, label: a.appName, description: a.appId })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setAppOptions([GLOBAL_DEFAULT_OPTION]);
      })
      .finally(() => {
        if (!cancelled) setAppsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, orgId]);

  useEffect(() => {
    if (credential && mode === 'edit') {
      setProvider(credential.provider);
      setOrgId(credential.org_id);
      setAppId(credential.app_id);
      setCredFields(credential.credentials || {});
      setIsActive(credential.is_active);
    } else {
      setProvider('cloudflare_r2');
      setOrgId('default');
      setAppId('default');
      setCredFields({});
      setIsActive(true);
    }
  }, [credential, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await onSubmit({
          provider,
          org_id: orgId,
          app_id: appId,
          credentials: credFields,
          is_active: isActive,
        });
      } else {
        // provider/org_id/app_id sengaja TIDAK dikirim di sini — immutable,
        // sudah ada di URL PATCH, dan UpdateStorageAccountCredentialDto
        // (forbidNonWhitelisted: true) menolak field di luar
        // credentials/is_active.
        await onSubmit({
          credentials: credFields,
          is_active: isActive,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const fields = PROVIDER_FIELDS[provider] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {mode === 'create' ? 'Add Storage Credential' : 'Edit Storage Credential'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FancySelect
            label="Provider"
            value={provider}
            onChange={(val) => {
              setProvider(val);
              setCredFields({});
            }}
            disabled={isSubmitting || mode === 'edit'}
            options={providerOptions}
            placeholder="Select provider"
          />

          <FancySelect
            label="Organization"
            value={orgId}
            onChange={(val) => {
              setOrgId(val);
              setAppId('default');
            }}
            disabled={isSubmitting || mode === 'edit' || orgsLoading}
            loading={orgsLoading}
            searchable
            options={orgOptions}
            placeholder="Search organization or pick Global default"
          />

          <FancySelect
            label="App"
            value={appId}
            onChange={(val) => setAppId(val)}
            disabled={isSubmitting || mode === 'edit' || orgId === 'default' || appsLoading}
            loading={appsLoading}
            searchable
            options={appOptions}
            placeholder={orgId === 'default' ? 'Pick a specific organization first' : 'Search app or pick Global default'}
          />
          <p className="text-xs text-[var(--text-secondary)] -mt-2">
            Resolution order: <span className="font-mono">(org, app)</span> tried first, then{' '}
            <span className="font-mono">(org, default)</span>, then{' '}
            <span className="font-mono">(default, default)</span>.
          </p>

          <div className="pt-3 border-t border-[var(--border-default)] space-y-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Credentials
            </p>
            {fields
              .filter((f) => appId === 'default' || f.key !== 'bucketName')
              .map((f) => (
                <Input
                  key={f.key}
                  label={f.label}
                  id={f.key}
                  value={credFields[f.key] ?? ''}
                  onChange={(e) => setCredFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  disabled={isSubmitting}
                />
              ))}
            {appId !== 'default' && (
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)] mb-1">Bucket Name</p>
                <p className="font-mono text-sm text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded px-3 py-2">
                  {appId}-bagdja
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  Auto-derived from App ID — not editable. The bucket is created automatically if it
                  doesn&apos;t exist yet.
                </p>
              </div>
            )}
          </div>

          <FancySelect
            label="Status"
            value={isActive ? 'true' : 'false'}
            onChange={(val) => setIsActive(val === 'true')}
            disabled={isSubmitting}
            options={statusOptions}
            placeholder="Select status"
          />

          <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

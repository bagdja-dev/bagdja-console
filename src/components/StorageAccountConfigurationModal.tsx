'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { FancySelect, type FancySelectOption } from '@/ui/fancy-select';
import type {
  StorageAccountConfiguration,
  StorageBucketConfiguration,
  StorageConfigurationPayload,
} from '@/lib/storage-account-credentials-api';
import { getAllOrganizations, getAppsByOrgSlug } from '@/lib/api';

const GLOBAL_DEFAULT_OPTION: FancySelectOption = {
  value: 'default',
  label: 'Global default',
  description: 'Applies to every organization / app unless a more specific configuration exists',
};

const providerOptions = [
  { value: 'cloudflare_r2', label: 'Cloudflare R2', description: 'Cloudflare R2 storage' },
  { value: 's3', label: 'S3-compatible', description: 'AWS S3, MinIO, or another S3-compatible provider' },
];

const statusOptions = [
  { value: 'true', label: 'Active', description: 'Configuration active' },
  { value: 'false', label: 'Inactive', description: 'Configuration inactive' },
];

type Visibility = 'public' | 'private';
type BucketDraft = StorageBucketConfiguration;

function emptyBucket(provider = 'cloudflare_r2'): BucketDraft {
  return {
    provider,
    accessKeyId: '',
    secretAccessKey: '',
    access_key_configured: false,
    secret_access_key_configured: false,
    endpoint: '',
    bucketName: '',
    region: provider === 's3' ? 'us-east-1' : '',
    accountId: '',
    publicUrlBase: '',
  };
}

function readBucket(bucket: StorageBucketConfiguration | null | undefined): BucketDraft {
  return bucket ? { ...emptyBucket(bucket.provider), ...bucket } : emptyBucket();
}

interface StorageAccountConfigurationModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  configuration: StorageAccountConfiguration | null;
  onClose: () => void;
  onSubmit: (payload: StorageConfigurationPayload) => Promise<void>;
}

export default function StorageAccountConfigurationModal({
  isOpen,
  mode,
  configuration,
  onClose,
  onSubmit,
}: StorageAccountConfigurationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Visibility>('public');
  const [orgId, setOrgId] = useState('default');
  const [appId, setAppId] = useState('default');
  const [buckets, setBuckets] = useState<Record<Visibility, BucketDraft>>({
    public: emptyBucket(),
    private: emptyBucket(),
  });
  const [isActive, setIsActive] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [orgOptions, setOrgOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [appOptions, setAppOptions] = useState<FancySelectOption[]>([GLOBAL_DEFAULT_OPTION]);
  const [appsLoading, setAppsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setOrgsLoading(true);
    getAllOrganizations()
      .then((orgs) => {
        if (!cancelled) {
          setOrgOptions([
            GLOBAL_DEFAULT_OPTION,
            ...orgs.map((org) => ({ value: org.orgId, label: org.name, description: org.orgId })),
          ]);
        }
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

  useEffect(() => {
    if (!isOpen || orgId === 'default') {
      setAppOptions([GLOBAL_DEFAULT_OPTION]);
      return;
    }
    let cancelled = false;
    setAppsLoading(true);
    getAppsByOrgSlug(orgId)
      .then((apps) => {
        if (!cancelled) {
          setAppOptions([
            GLOBAL_DEFAULT_OPTION,
            ...apps.map((app) => ({ value: app.appId, label: app.appName, description: app.appId })),
          ]);
        }
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
    if (configuration && mode === 'edit') {
      setOrgId(configuration.org_id);
      setAppId(configuration.app_id);
      setBuckets({
        public: readBucket(configuration.buckets.public),
        private: readBucket(configuration.buckets.private),
      });
      setIsActive(configuration.is_active);
    } else {
      setOrgId('default');
      setAppId('default');
      setBuckets({ public: emptyBucket(), private: emptyBucket() });
      setIsActive(true);
    }
    setActiveTab('public');
    setSubmitError('');
  }, [configuration, mode, isOpen]);

  const updateBucket = (visibility: Visibility, field: keyof BucketDraft, value: string) => {
    setBuckets((current) => ({
      ...current,
      [visibility]: field === 'provider'
        ? {
            ...current[visibility],
            provider: value,
            accessKeyId: '',
            secretAccessKey: '',
            access_key_configured: false,
            secret_access_key_configured: false,
          }
        : { ...current[visibility], [field]: value },
    }));
  };

  const validateBucket = (visibility: Visibility, bucket: BucketDraft): string | null => {
    if (!bucket.accessKeyId?.trim() && !bucket.access_key_configured) {
      return `${visibility}: access key id is required.`;
    }
    if (!bucket.secretAccessKey?.trim() && !bucket.secret_access_key_configured) {
      return `${visibility}: secret access key is required.`;
    }
    for (const field of ['endpoint', 'bucketName'] as const) {
      if (!bucket[field]?.trim()) return `${visibility}: ${field} is required.`;
    }
    try {
      const endpoint = new URL(bucket.endpoint.trim());
      if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') throw new Error('Invalid protocol');
    } catch {
      return `${visibility}: endpoint must be a valid HTTP or HTTPS URL.`;
    }
    if (visibility === 'public') {
      try {
        const publicUrl = new URL(bucket.publicUrlBase?.trim() ?? '');
        if (publicUrl.protocol !== 'http:' && publicUrl.protocol !== 'https:') throw new Error('Invalid protocol');
      } catch {
        return 'Public: URL base must be a valid HTTP or HTTPS URL.';
      }
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    for (const visibility of ['public', 'private'] as const) {
      const error = validateBucket(visibility, buckets[visibility]);
      if (error) {
        setActiveTab(visibility);
        setSubmitError(error);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: StorageConfigurationPayload = {
        buckets: {
          public: {
            provider: buckets.public.provider,
            ...(buckets.public.accessKeyId?.trim() ? { accessKeyId: buckets.public.accessKeyId.trim() } : {}),
            ...(buckets.public.secretAccessKey?.trim() ? { secretAccessKey: buckets.public.secretAccessKey } : {}),
            endpoint: buckets.public.endpoint.trim(),
            bucketName: buckets.public.bucketName.trim(),
            region: buckets.public.region,
            accountId: buckets.public.accountId,
            publicUrlBase: buckets.public.publicUrlBase?.trim(),
          },
          private: {
            provider: buckets.private.provider,
            ...(buckets.private.accessKeyId?.trim() ? { accessKeyId: buckets.private.accessKeyId.trim() } : {}),
            ...(buckets.private.secretAccessKey?.trim() ? { secretAccessKey: buckets.private.secretAccessKey } : {}),
            endpoint: buckets.private.endpoint.trim(),
            bucketName: buckets.private.bucketName.trim(),
            region: buckets.private.region,
            accountId: buckets.private.accountId,
            publicUrlBase: undefined,
          },
        },
        is_active: isActive,
      };
      if (mode === 'create') {
        payload.org_id = orgId;
        payload.app_id = appId;
      }
      await onSubmit(payload);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save storage configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const bucket = buckets[activeTab];
  const isCloudflare = bucket.provider === 'cloudflare_r2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {mode === 'create' ? 'Add Storage Configuration' : 'Edit Storage Configuration'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors" disabled={isSubmitting} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FancySelect
            label="Organization"
            value={orgId}
            onChange={(value) => {
              setOrgId(value);
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
            onChange={setAppId}
            disabled={isSubmitting || mode === 'edit' || orgId === 'default' || appsLoading}
            loading={appsLoading}
            searchable
            options={appOptions}
            placeholder={orgId === 'default' ? 'Pick a specific organization first' : 'Search app or pick Global default'}
          />
          <p className="text-xs text-[var(--text-secondary)] -mt-2">
            Resolution order: <span className="font-mono">(org, app)</span>, then <span className="font-mono">(org, default)</span>, then <span className="font-mono">(default, default)</span>.
          </p>

          <div className="inline-flex rounded-md border border-[var(--border-default)] p-1" role="tablist" aria-label="Storage visibility">
            {(['public', 'private'] as const).map((visibility) => (
              <button
                key={visibility}
                type="button"
                role="tab"
                aria-selected={activeTab === visibility}
                onClick={() => setActiveTab(visibility)}
                className={`px-4 py-2 text-sm rounded transition-colors ${activeTab === visibility ? 'bg-[var(--action-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                {visibility === 'public' ? 'Public' : 'Private'}
              </button>
            ))}
          </div>

          <div className="pt-2 space-y-3">
            <FancySelect
              label={`${activeTab === 'public' ? 'Public' : 'Private'} Provider`}
              value={bucket.provider}
              onChange={(provider) => updateBucket(activeTab, 'provider', provider)}
              disabled={isSubmitting}
              options={providerOptions}
              placeholder="Select provider"
            />
            {isCloudflare && (
              <Input
                label="Cloudflare Account ID"
                value={bucket.accountId ?? ''}
                onChange={(event) => updateBucket(activeTab, 'accountId', event.target.value)}
                placeholder="a1b2c3d4e5f6"
                disabled={isSubmitting}
              />
            )}
            <Input
              label="Access Key ID"
              value={bucket.accessKeyId ?? ''}
              onChange={(event) => updateBucket(activeTab, 'accessKeyId', event.target.value)}
              placeholder="Provider access key id"
              helpText={bucket.access_key_configured ? 'Configured. Leave blank to keep the current key, or enter a replacement.' : 'Required for this bucket.'}
              disabled={isSubmitting}
            />
            <Input
              label="Secret Access Key"
              type="password"
              value={bucket.secretAccessKey ?? ''}
              onChange={(event) => updateBucket(activeTab, 'secretAccessKey', event.target.value)}
              placeholder={bucket.secret_access_key_configured ? 'Saved securely; enter only to replace' : 'Provider secret access key'}
              helpText={bucket.secret_access_key_configured ? 'Configured. Leave blank to keep the current secret.' : 'Required for this bucket.'}
              disabled={isSubmitting}
            />
            <Input
              label="Endpoint"
              value={bucket.endpoint}
              onChange={(event) => updateBucket(activeTab, 'endpoint', event.target.value)}
              placeholder={isCloudflare ? 'https://<account_id>.r2.cloudflarestorage.com' : 'https://s3.<region>.amazonaws.com'}
              required
              disabled={isSubmitting}
            />
            {!isCloudflare && (
              <Input
                label="Region"
                value={bucket.region ?? ''}
                onChange={(event) => updateBucket(activeTab, 'region', event.target.value)}
                placeholder="us-east-1"
                disabled={isSubmitting}
              />
            )}
            <Input
              label={`${activeTab === 'public' ? 'Public' : 'Private'} Bucket Name`}
              value={bucket.bucketName}
              onChange={(event) => updateBucket(activeTab, 'bucketName', event.target.value)}
              placeholder={activeTab === 'public' ? 'website-assets' : 'website-private'}
              required
              disabled={isSubmitting}
            />
            {activeTab === 'public' ? (
              <Input
                label="Public URL Base"
                type="url"
                value={bucket.publicUrlBase ?? ''}
                onChange={(event) => updateBucket(activeTab, 'publicUrlBase', event.target.value)}
                placeholder="https://cdn.example.com"
                required
                disabled={isSubmitting}
              />
            ) : (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-[var(--text-secondary)]">
                Keep public access disabled for this bucket in its provider. Private files are served through short-lived signed URLs.
              </div>
            )}
            {activeTab === 'public' && (
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-hover)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                Configure public access and the custom domain for this bucket in Cloudflare or the selected provider. Saving the credentials does not change provider-side access policy.
              </div>
            )}
          </div>

          <FancySelect
            label="Configuration Status"
            value={isActive ? 'true' : 'false'}
            onChange={(value) => setIsActive(value === 'true')}
            disabled={isSubmitting}
            options={statusOptions}
          />

          {submitError && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600" role="alert">
              {submitError}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
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

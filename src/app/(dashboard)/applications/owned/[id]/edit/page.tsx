'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { getClientApps, updateClientApp } from '@/lib/api';
import type { ClientApp, ApiError } from '@/types';
import AlertModal, { AlertType } from '@/components/AlertModal';
import { LoginBrandingPreview } from '@/components/LoginBrandingPreview';

const HTTPS_URL = /^https:\/\/\S+$/;
const BRANDING_URL = /^https:\/\/\S*\{brand\}\S*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClassName =
  'w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent';

interface EditForm {
  appName: string;
  description: string;
  contactEmail: string;
  logo: string;
  loginBackgroundUrl: string;
  brandingUrl: string;
}

function toForm(app: ClientApp): EditForm {
  return {
    appName: app.appName ?? '',
    description: app.description ?? '',
    contactEmail: app.contactEmail ?? '',
    logo: app.logo ?? '',
    loginBackgroundUrl: app.loginBackgroundUrl ?? '',
    brandingUrl: app.brandingUrl ?? '',
  };
}

/**
 * Edit info client app (28 Okt 2026) — nama, deskripsi, email kontak, dan
 * tampilan halaman login.bagdja.com (logo, background, Branding URL per
 * brand). Diakses dari ikon edit di header halaman detail app. Hanya owner
 * organisasi yang bisa menyimpan (divalidasi bagdja-auth).
 */
export default function EditClientAppPage() {
  const params = useParams();
  const appId = params?.id as string;

  const [app, setApp] = useState<ClientApp | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: AlertType;
    title?: string;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const showAlert = (message: string, type: AlertType = 'info', title?: string) => {
    setAlertConfig({ isOpen: true, message, type, title });
  };

  useEffect(() => {
    const fetchApp = async () => {
      try {
        setLoading(true);
        setError(null);

        const activeOrgId = typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null;
        if (!activeOrgId) {
          setError('Please select an organization first');
          return;
        }

        const apps = await getClientApps();
        const foundApp = apps.find((a) => a.id === appId);
        if (!foundApp) {
          setError('App not found');
          return;
        }
        setApp(foundApp);
        setForm(toForm(foundApp));
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch app');
        console.error('Failed to fetch app:', err);
      } finally {
        setLoading(false);
      }
    };

    if (appId) {
      fetchApp();
    }
  }, [appId]);

  const updateField = (field: keyof EditForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (error || !app || !form) {
    return (
      <div className="space-y-4">
        <Link
          href={`/applications/owned/${appId}`}
          className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to App
        </Link>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <p className="text-[var(--text-danger)]">{error || 'App not found'}</p>
        </div>
      </div>
    );
  }

  const trimmed = {
    appName: form.appName.trim(),
    contactEmail: form.contactEmail.trim(),
    logo: form.logo.trim(),
    loginBackgroundUrl: form.loginBackgroundUrl.trim(),
    brandingUrl: form.brandingUrl.trim(),
  };
  const errors = {
    appName: trimmed.appName ? null : 'App name is required.',
    contactEmail: trimmed.contactEmail && !EMAIL.test(trimmed.contactEmail) ? 'Must be a valid email.' : null,
    logo: trimmed.logo && !HTTPS_URL.test(trimmed.logo) ? 'Must be an https URL.' : null,
    loginBackgroundUrl:
      trimmed.loginBackgroundUrl && !HTTPS_URL.test(trimmed.loginBackgroundUrl) ? 'Must be an https URL.' : null,
    brandingUrl:
      trimmed.brandingUrl && !BRANDING_URL.test(trimmed.brandingUrl)
        ? 'Must be an https URL containing "{brand}".'
        : null,
  };
  const hasError = Object.values(errors).some(Boolean);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (hasError) return;
    try {
      setSaving(true);
      const updatedApp = await updateClientApp(app.id, {
        appName: trimmed.appName,
        description: form.description.trim() || null,
        contactEmail: trimmed.contactEmail || null,
        logo: trimmed.logo || null,
        loginBackgroundUrl: trimmed.loginBackgroundUrl || null,
        brandingUrl: trimmed.brandingUrl || null,
      });
      setApp(updatedApp);
      setForm(toForm(updatedApp));
      showAlert('App updated successfully.', 'success');
    } catch (err) {
      const apiError = err as ApiError;
      showAlert(apiError.message || 'Failed to update app', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full space-y-6">
      <div className="flex-shrink-0">
        <Link
          href={`/applications/owned/${app.id}`}
          className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {app.appName}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit App</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          App ID <span className="font-mono text-[var(--text-primary)]">{app.appId}</span> cannot be changed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General */}
        <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-6 space-y-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">General</h2>

          <div className="space-y-2">
            <label htmlFor="appName" className="text-sm font-medium text-[var(--text-primary)]">
              App Name
            </label>
            <input
              id="appName"
              value={form.appName}
              onChange={(e) => updateField('appName', e.target.value)}
              maxLength={255}
              className={inputClassName}
            />
            {errors.appName ? (
              <p className="text-xs text-[var(--text-danger)]">{errors.appName}</p>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                Also shown on login.bagdja.com as &quot;Untuk melanjutkan ke …&quot;.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-[var(--text-primary)]">
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              maxLength={1000}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contactEmail" className="text-sm font-medium text-[var(--text-primary)]">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="admin@example.com"
              className={inputClassName}
            />
            {errors.contactEmail && <p className="text-xs text-[var(--text-danger)]">{errors.contactEmail}</p>}
          </div>
        </section>

        {/* Login appearance */}
        <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Login Appearance</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Logo and background shown on login.bagdja.com when users sign in to this app. The &quot;Sign in with
              Bagdja&quot; title, card and form always keep the Bagdja identity. Leave empty to use the Bagdja default.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="logo" className="text-sm font-medium text-[var(--text-primary)]">
                  Logo URL
                </label>
                <input
                  id="logo"
                  type="url"
                  value={form.logo}
                  onChange={(e) => updateField('logo', e.target.value)}
                  placeholder="https://cdn.example.com/logo.png"
                  className={inputClassName}
                />
                {errors.logo ? (
                  <p className="text-xs text-[var(--text-danger)]">{errors.logo}</p>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">Also used as the app logo in this console.</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="loginBackgroundUrl" className="text-sm font-medium text-[var(--text-primary)]">
                  Background URL
                </label>
                <input
                  id="loginBackgroundUrl"
                  type="url"
                  value={form.loginBackgroundUrl}
                  onChange={(e) => updateField('loginBackgroundUrl', e.target.value)}
                  placeholder="https://cdn.example.com/login-bg.jpg"
                  className={inputClassName}
                />
                {errors.loginBackgroundUrl ? (
                  <p className="text-xs text-[var(--text-danger)]">{errors.loginBackgroundUrl}</p>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Landscape, at least 1920×1080 recommended. A dark overlay is always applied so the login card stays
                    readable.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="brandingUrl" className="text-sm font-medium text-[var(--text-primary)]">
                  Per-brand Branding URL (optional)
                </label>
                <input
                  id="brandingUrl"
                  type="url"
                  value={form.brandingUrl}
                  onChange={(e) => updateField('brandingUrl', e.target.value)}
                  placeholder="https://api.example.com/public/platforms/{brand}/login-branding"
                  className={`${inputClassName} font-mono text-sm`}
                />
                {errors.brandingUrl ? (
                  <p className="text-xs text-[var(--text-danger)]">{errors.brandingUrl}</p>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">
                    For multi-tenant apps. When authorize carries <code>&amp;brand=slug</code>, login.bagdja.com calls
                    this URL (<code>{'{brand}'}</code> replaced by the slug) and uses the returned JSON{' '}
                    <code>{'{ name, logoUrl, backgroundUrl }'}</code>. On failure it falls back to the logo/background
                    above.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">Preview</p>
              <LoginBrandingPreview
                appName={trimmed.appName}
                logoUrl={trimmed.logo && !errors.logo ? trimmed.logo : null}
                backgroundUrl={
                  trimmed.loginBackgroundUrl && !errors.loginBackgroundUrl ? trimmed.loginBackgroundUrl : null
                }
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Link
            href={`/applications/owned/${app.id}`}
            className="flex items-center justify-center px-6 py-3 border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg hover:bg-white/5 transition-all font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || hasError}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        message={alertConfig.message}
        type={alertConfig.type}
        title={alertConfig.title}
        autoClose={alertConfig.type === 'success' || alertConfig.type === 'info' ? 3000 : undefined}
      />
    </div>
  );
}

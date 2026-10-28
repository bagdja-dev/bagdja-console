"use client";

import { useEffect, useState } from "react";
import { Check, Image as ImageIcon } from "lucide-react";
import { updateLoginBranding } from "@/lib/api";
import type { ClientApp } from "@/types";
import type { AlertType } from "@/components/AlertModal";


interface LoginBrandingSettingsProps {
  app: ClientApp;
  onSaved: (app: ClientApp) => void;
  showAlert: (message: string, type?: AlertType) => void;
}

const HTTPS_URL = /^https:\/\/\S+$/;
const BRANDING_URL = /^https:\/\/\S*\{brand\}\S*$/;

const inputClassName =
  "w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent";

/**
 * Pengaturan tampilan login.bagdja.com untuk sebuah client app (28 Okt 2026).
 * Lapis 1: logo + background default per client_id. Lapis 2: `brandingUrl`
 * (template dengan `{brand}`) dipanggil login.bagdja.com saat authorize
 * membawa `&brand=<slug>`, untuk app multi-tenant seperti Bookpedia.
 * Bingkai Bagdja (judul, kartu, form) sengaja tidak bisa diubah.
 */
export function LoginBrandingSettings({ app, onSaved, showAlert }: LoginBrandingSettingsProps) {
  const [logo, setLogo] = useState(app.logo ?? "");
  const [backgroundUrl, setBackgroundUrl] = useState(app.loginBackgroundUrl ?? "");
  const [brandingUrl, setBrandingUrl] = useState(app.brandingUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLogo(app.logo ?? "");
    setBackgroundUrl(app.loginBackgroundUrl ?? "");
    setBrandingUrl(app.brandingUrl ?? "");
  }, [app.id, app.logo, app.loginBackgroundUrl, app.brandingUrl]);

  const logoError = logo.trim() && !HTTPS_URL.test(logo.trim()) ? "Must be an https URL." : null;
  const backgroundError =
    backgroundUrl.trim() && !HTTPS_URL.test(backgroundUrl.trim()) ? "Must be an https URL." : null;
  const brandingError =
    brandingUrl.trim() && !BRANDING_URL.test(brandingUrl.trim())
      ? 'Must be an https URL containing "{brand}".'
      : null;
  const hasError = Boolean(logoError || backgroundError || brandingError);

  const previewLogo = !logoError && logo.trim() ? logo.trim() : "/logo.png";
  const previewBackground =
    !backgroundError && backgroundUrl.trim() ? backgroundUrl.trim() : "/ilustration.png";

  const handleSave = async () => {
    if (hasError) return;
    try {
      setSaving(true);
      const updatedApp = await updateLoginBranding(app.id, {
        logo: logo.trim() || null,
        loginBackgroundUrl: backgroundUrl.trim() || null,
        brandingUrl: brandingUrl.trim() || null,
      });
      onSaved(updatedApp);
      showAlert("Login appearance saved successfully.", "success");
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : "Failed to save login appearance", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Login Appearance</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Logo and background shown on login.bagdja.com when users sign in to this app. The
          &quot;Sign in with Bagdja&quot; title, card and form always keep the Bagdja identity.
          Leave empty to use the Bagdja default.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="login-branding-logo" className="text-sm font-medium text-[var(--text-primary)]">
              Logo URL
            </label>
            <input
              id="login-branding-logo"
              type="url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className={inputClassName}
            />
            {logoError && <p className="text-xs text-[var(--text-danger)]">{logoError}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="login-branding-background" className="text-sm font-medium text-[var(--text-primary)]">
              Background URL
            </label>
            <input
              id="login-branding-background"
              type="url"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="https://cdn.example.com/login-bg.jpg"
              className={inputClassName}
            />
            {backgroundError ? (
              <p className="text-xs text-[var(--text-danger)]">{backgroundError}</p>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                Landscape, at least 1920×1080 recommended. A dark overlay is always applied so the login card stays readable.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="login-branding-url" className="text-sm font-medium text-[var(--text-primary)]">
              Per-brand Branding URL (optional)
            </label>
            <input
              id="login-branding-url"
              type="url"
              value={brandingUrl}
              onChange={(e) => setBrandingUrl(e.target.value)}
              placeholder="https://api.example.com/public/platforms/{brand}/login-branding"
              className={`${inputClassName} font-mono text-sm`}
            />
            {brandingError ? (
              <p className="text-xs text-[var(--text-danger)]">{brandingError}</p>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                For multi-tenant apps. When authorize carries <code>&amp;brand=slug</code>, login.bagdja.com
                calls this URL (<code>{"{brand}"}</code> replaced by the slug) and uses the returned JSON{" "}
                <code>{"{ name, logoUrl, backgroundUrl }"}</code>. On failure it falls back to the logo/background above.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">Preview</p>
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-lg border border-[var(--border-default)] min-h-[260px] p-6"
            style={{
              backgroundImage: `url("${encodeURI(previewBackground)}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative w-full max-w-[240px] rounded-lg bg-white shadow-lg px-5 py-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL eksternal bebas, next/image butuh domain terdaftar */}
              <img src={previewLogo} alt="Logo" className="mx-auto h-12 w-12 object-contain" />
              <p className="mt-3 text-sm font-semibold text-gray-900">Masuk dengan Bagdja</p>
              <p className="text-xs text-gray-500">Untuk melanjutkan ke {app.appName}</p>
              <div className="mt-4 space-y-2">
                <div className="h-7 rounded border border-gray-200" />
                <div className="h-7 rounded border border-gray-200" />
              </div>
            </div>
          </div>
          <p className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <ImageIcon className="h-3 w-3" /> Image not showing = the URL is not publicly reachable.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[var(--border-default)]">
        <button
          onClick={handleSave}
          disabled={saving || hasError}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
    </div>
  );
}

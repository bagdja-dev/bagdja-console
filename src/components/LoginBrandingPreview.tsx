"use client";

import { Image as ImageIcon } from "lucide-react";

interface LoginBrandingPreviewProps {
  appName: string;
  /** URL logo valid (https) atau null → logo Bagdja. */
  logoUrl: string | null;
  /** URL background valid (https) atau null → ilustrasi Bagdja. */
  backgroundUrl: string | null;
}

/**
 * Preview mini kartu login.bagdja.com (28 Okt 2026) — meniru tata letak
 * halaman login asli: background + overlay gelap, kartu putih, logo app,
 * judul "Masuk dengan Bagdja" yang tidak bisa diubah (co-branding).
 */
export function LoginBrandingPreview({ appName, logoUrl, backgroundUrl }: LoginBrandingPreviewProps) {
  const previewBackground = backgroundUrl ?? "/ilustration.png";

  return (
    <div className="space-y-2">
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-lg border border-[var(--border-default)] min-h-[280px] p-6"
        style={{
          backgroundImage: `url("${encodeURI(previewBackground)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative w-full max-w-[260px] rounded-lg bg-white shadow-lg px-5 py-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL eksternal bebas, next/image butuh domain terdaftar */}
          <img src={logoUrl ?? "/logo.png"} alt="Logo" className="mx-auto h-12 w-12 object-contain" />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-900">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- aset lokal kecil
              <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
            )}
            Masuk dengan Bagdja
          </p>
          <p className="text-xs text-gray-500 truncate">Untuk melanjutkan ke {appName || "…"}</p>
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
  );
}

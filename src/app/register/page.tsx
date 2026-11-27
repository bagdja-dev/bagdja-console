'use client';

import { useEffect } from 'react';

/**
 * Registrasi lewat SSO bagdja-login (core-service-flag-removal-plan.md P5-D2).
 *
 * Console tidak lagi memanggil `POST /auth/register` sendiri, karena endpoint
 * itu butuh token client app (secret yang dulu ikut bundle browser). Halaman
 * ini hanya meneruskan ke halaman register bagdja-login; setelah terdaftar,
 * user kembali ke `/login` Console untuk masuk lewat OAuth.
 */
function buildRegisterUrl(): string {
  const loginBase = process.env.NEXT_PUBLIC_LOGIN_URL || 'http://localhost:3000';
  const url = new URL('/register', loginBase);
  url.searchParams.set('redirect_url', `${window.location.origin}/login`);
  return url.toString();
}

export default function RegisterPage() {
  useEffect(() => {
    window.location.replace(buildRegisterUrl());
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--action-primary)]"></div>
        <p className="mt-4 text-[var(--text-secondary)]">Membuka halaman pendaftaran Bagdja…</p>
        <button
          type="button"
          onClick={() => window.location.replace(buildRegisterUrl())}
          className="mt-2 text-sm text-[var(--action-primary)] hover:underline"
        >
          Klik di sini bila tidak diarahkan otomatis
        </button>
      </div>
    </div>
  );
}

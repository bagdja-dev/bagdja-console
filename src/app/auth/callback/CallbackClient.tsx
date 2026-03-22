'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/auth';

export function CallbackClient({
  token,
  redirectUrl,
}: {
  token?: string;
  redirectUrl?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No token received. Please try logging in again.');
      return;
    }

    try {
      setAccessToken(token);

      if (redirectUrl) {
        try {
          const url = new URL(redirectUrl);
          const hostname = url.hostname.toLowerCase();
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
          const isSameOrigin = url.origin === currentOrigin;
          const isBagdjaDomain = hostname.endsWith('.bagdja.com') || hostname === 'bagdja.com';
          const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('127.0.0.1');

          if (isSameOrigin) {
            const path = url.pathname + url.search;
            router.replace(path);
            return;
          }

          if (isBagdjaDomain || isLocalhost) {
            window.location.replace(redirectUrl);
            return;
          }
        } catch {
          // Ignore invalid URL, fall through
        }
      }

      router.replace('/dashboard');
    } catch (err) {
      console.error('Auth callback error:', err);
      setError('Failed to process authentication. Please try again.');
    }
  }, [token, redirectUrl, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]">
            {error}
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full rounded-lg bg-[var(--action-primary)] px-4 py-2 text-white hover:bg-[var(--action-primary-hover)]"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
      <div className="text-center">
        <div className="mb-4 text-[var(--text-secondary)]">Completing authentication...</div>
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
      </div>
    </div>
  );
}


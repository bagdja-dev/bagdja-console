'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/auth';
import { decryptState } from '@/lib/oauth';

export function CallbackClient({
  code,
  state,
  token,
  redirectUrl,
  isOAuthFlow = false,
}: {
  code?: string;
  state?: string;
  token?: string;
  redirectUrl?: string;
  isOAuthFlow?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performCallback = async () => {
      try {
        // OAuth 2.0 flow
        if (isOAuthFlow && code && state) {
          console.debug('OAuth callback flow', { code, state });
          
          // Get code_verifier from sessionStorage (stored during login initiation)
          const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
          const SESSION_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_SESSION_ENCRYPTION_KEY;

          if (!codeVerifier) {
            setError('Missing code_verifier. Session may have expired.');
            return;
          }

          if (!SESSION_ENCRYPTION_KEY) {
            console.warn('SESSION_ENCRYPTION_KEY not configured, using fixed key fallback');
          }

          // Decrypt state to get original redirect path
          let redirectPath = '/dashboard';
          if (SESSION_ENCRYPTION_KEY) {
            const statePayload = await decryptState(state, SESSION_ENCRYPTION_KEY);
            if (statePayload) {
              redirectPath = statePayload.path || '/dashboard';
            } else {
              setError('State parameter validation failed. Please try logging in again.');
              return;
            }
          }

          // Exchange authorization code for access token
          // Call our backend API route which will set httpOnly cookie
          const tokenResponse = await fetch('/api/auth/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              state,
              code_verifier: codeVerifier,
            }),
            credentials: 'include', // Include cookies in request
          });

          if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            setError(error.error || 'Token exchange failed');
            return;
          }

          const result = await tokenResponse.json();
          
          if (result.access_token) {
            setAccessToken(result.access_token);
          }
          
          // Clear sessionStorage
          sessionStorage.removeItem('oauth_code_verifier');
          sessionStorage.removeItem('oauth_state');

          // Redirect to the path from state
          router.replace(result.redirectPath || redirectPath);
          return;
        }

        // Legacy token-in-URL flow (backward compatibility, deprecated)
        if (token) {
          console.debug('Legacy token flow');
          
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
          return;
        }

        // Neither OAuth nor legacy flow worked
        setError('No authentication data received. Please try logging in again.');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Failed to process authentication. Please try again.');
      }
    };

    performCallback();
  }, [code, state, token, redirectUrl, isOAuthFlow, router]);

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

        {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
          <div className="mt-4 p-3 text-left text-xs bg-white/90 border border-gray-200 rounded-lg max-w-md mx-auto break-words">
            <div className="font-semibold mb-2">Debug (dev only)</div>
            <div className="mb-1"><strong>isOAuthFlow:</strong> {isOAuthFlow ? 'yes' : 'no'}</div>
            <div className="mb-1"><strong>code:</strong> {code ? `${code.substring(0, 20)}...` : '—'}</div>
            <div className="mb-1"><strong>state:</strong> {state ? `${state.substring(0, 20)}...` : '—'}</div>
            <div className="mb-1"><strong>token:</strong> {token ? `${token.substring(0, 20)}...` : '—'}</div>
            <div className="mb-2"><strong>redirectUrl:</strong> {redirectUrl || '—'}</div>
          </div>
        )}
      </div>
    </div>
  );
}




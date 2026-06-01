'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/ui/button';
import { generateCodeVerifier, generateCodeChallenge, generateState, generateEncryptionKey } from '@/lib/oauth';

function LoginContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get redirect path from query params (e.g., from middleware redirect)
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // Get bagdja-login URL from environment variable
  const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL || 'http://localhost:3000';
  const SESSION_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_SESSION_ENCRYPTION_KEY;
  const CLIENT_ID =
    process.env.NEXT_PUBLIC_CLIENT_ID ||
    process.env.NEXT_PUBLIC_CLIENT_APP_ID ||
    'user-console';
  const REDIRECT_URI =
    process.env.NEXT_PUBLIC_REDIRECT_URI ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'http://localhost:3000/auth/callback');

  /**
   * Initiate OAuth authorization code flow with PKCE
   */
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate PKCE code verifier and challenge
      const codeVerifier = await generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Generate encrypted state with original redirect path
      // Use a fixed encryption key for now (in production, fetch from config)
      let encryptionKey = SESSION_ENCRYPTION_KEY;
      if (!encryptionKey) {
        // Fallback: generate a key, but this won't work across requests
        // In production, use a server-side key from environment
        console.warn('SESSION_ENCRYPTION_KEY not set, using generated key (not recommended for production)');
        encryptionKey = generateEncryptionKey();
      }

      const state = await generateState(redirectPath, encryptionKey);

      // Store code_verifier in sessionStorage for later use in callback
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);

      // Build OAuth authorization URL
      const authUrl = new URL('/oauth/authorize', LOGIN_URL);
      authUrl.searchParams.set('client_id', CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('scope', 'openid profile email');
      // #region debug-point D:console-auth-url
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'D', location: 'bagdja-console/src/app/login/page.tsx:handleLogin', msg: '[DEBUG] console built oauth authorize url', data: { loginUrl: LOGIN_URL, clientId: CLIENT_ID, redirectUri: REDIRECT_URI, redirectPath, hasEncryptionKey: !!SESSION_ENCRYPTION_KEY, stateLength: state.length, codeChallengeLength: codeChallenge.length }, ts: Date.now() }) }).catch(() => {});
      // #endregion

      // Redirect to OAuth authorization endpoint
      window.location.href = authUrl.toString();
    } catch (err) {
      console.error('Login initiation error:', err);
      setError('Failed to initiate login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const forgotPasswordUrl = new URL('/forgot-password', LOGIN_URL);
    forgotPasswordUrl.searchParams.set('redirect_url', REDIRECT_URI);
    window.location.href = forgotPasswordUrl.toString();
  };

  const handleToLoginPage = () => {
    const loginUrl = new URL('/login', LOGIN_URL);
    loginUrl.searchParams.set('redirect_url', REDIRECT_URI);
    window.location.href = loginUrl.toString();
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] relative overflow-hidden">
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)] via-[var(--bg-sidebar)] to-[var(--bg-surface)] opacity-50"></div>
      
      {/* Left Column - Illustration Background (60%) */}
      <div 
        className="hidden lg:flex lg:w-[100%] relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/ilustration.png)',
        }}
      >
        {/* Dark Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/80 via-[var(--bg-main)]/60 to-[var(--bg-main)]/80"></div>
        
        {/* Additional gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)]/90 via-transparent to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="w-full max-w-2xl space-y-10">
            {/* Text Content */}
            <div className="text-center space-y-5 animate-fade-in-up">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <Image
                  src="/logo.png"
                  alt="Bagdja Logo"
                  width={120}
                  height={120}
                  className="drop-shadow-lg"
                  priority
                />
              </div>
              <h1 className="text-5xl font-bold text-[var(--text-primary)] leading-tight drop-shadow-lg">
                Welcome Back
              </h1>
              <p className="text-xl text-[var(--text-secondary)] leading-relaxed drop-shadow-md">
                Sign in to access your Bagdja Console and manage your applications
              </p>
            </div>
          </div>
          <div className="space-y-4 pt-10">
                  <Button
                    type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span className="flex items-center justify-center gap-2 ">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign in Now
                  </span>
                </>
              )}
                  </Button>
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)]"
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={handleToLoginPage}
                      className="text-[var(--action-primary)] hover:text-[var(--action-primary-hover)]"
                    >
                      Go to Login Page
                    </button>
                  </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
          <div className="text-center">
            <div className="mb-4 text-[var(--text-secondary)]">Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

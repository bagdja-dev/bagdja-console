'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login, getGoogleLoginUrl } from '@/lib/api';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import type { ApiError } from '@/types';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for success messages from query params
    const registered = searchParams.get('registered');
    const verified = searchParams.get('verified');
    
    if (registered === 'true') {
      setSuccess('Registration successful! Please check your email to verify your account.');
    } else if (verified === 'true') {
      setSuccess('Email verified successfully! You can now log in.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      router.push('/dashboard');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      {/* Left Column - Illustration (60%) */}
      <div className="hidden lg:flex lg:w-[60%] items-center justify-center bg-[var(--bg-surface)] p-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Illustration SVG */}
          <div className="flex justify-center">
            <svg
              className="w-full h-auto max-w-md"
              viewBox="0 0 600 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background Circle */}
              <circle cx="300" cy="250" r="200" fill="var(--bg-sidebar)" opacity="0.3" />
              
              {/* Main Illustration - Lock/Shield */}
              <g transform="translate(200, 150)">
                {/* Shield/Lock Shape */}
                <path
                  d="M100 50 L100 120 C100 140 120 160 140 160 L160 160 C180 160 200 140 200 120 L200 50 C200 30 180 10 160 10 L140 10 C120 10 100 30 100 50 Z"
                  fill="var(--action-primary)"
                  opacity="0.8"
                />
                {/* Lock Body */}
                <rect x="120" y="80" width="60" height="50" rx="5" fill="var(--action-primary)" />
                {/* Lock Keyhole */}
                <circle cx="150" cy="105" r="8" fill="var(--bg-main)" />
                <rect x="145" y="105" width="10" height="15" fill="var(--bg-main)" />
              </g>
              
              {/* Decorative Elements */}
              <circle cx="150" cy="150" r="30" fill="var(--brand-info)" opacity="0.2" />
              <circle cx="450" cy="350" r="40" fill="var(--brand-success)" opacity="0.2" />
              <circle cx="100" cy="400" r="25" fill="var(--brand-warning)" opacity="0.2" />
            </svg>
          </div>
          
          {/* Text Content */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">
              Welcome Back
            </h1>
            <p className="text-lg text-[var(--text-secondary)]">
              Sign in to access your Bagdja Console and manage your applications
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Form (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Or{' '}
              <Link
                href="/register"
                className="font-medium text-[var(--action-primary)] hover:text-[var(--action-primary-hover)]"
              >
                create a new account
              </Link>
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {success && (
              <div
                className="rounded-md bg-[var(--brand-success)]/20 border border-[var(--brand-success)]/30 p-4 text-sm text-[var(--brand-success)]"
                role="alert"
              >
                {success}
              </div>
            )}
            {error && (
              <div
                className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]"
                role="alert"
              >
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <Input
                label="Username or Email"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-default)]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[var(--bg-main)] text-[var(--text-muted)]">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const googleUrl = getGoogleLoginUrl();
                  window.location.href = googleUrl;
                }}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </Button>
            </div>
          </form>
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


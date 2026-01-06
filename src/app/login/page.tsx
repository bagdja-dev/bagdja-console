'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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
    <div className="flex min-h-screen bg-[var(--bg-main)] relative overflow-hidden">
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)] via-[var(--bg-sidebar)] to-[var(--bg-surface)] opacity-50"></div>
      
      {/* Left Column - Illustration Background (60%) */}
      <div 
        className="hidden lg:flex lg:w-[60%] relative bg-cover bg-center bg-no-repeat"
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
        </div>
      </div>

      {/* Right Column - Form (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Form Container with Glassmorphism */}
          <div className="bg-[var(--bg-surface)]/80 backdrop-blur-xl rounded-2xl border border-[var(--border-default)]/50 p-8 shadow-2xl">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                  Sign in to your account
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Or{' '}
                  <Link
                    href="/register"
                    className="font-medium text-[var(--action-primary)] hover:text-[var(--action-primary-hover)] transition-colors duration-200 underline-offset-4 hover:underline"
                  >
                    create a new account
                  </Link>
                </p>
              </div>
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                {success && (
                  <div
                    className="rounded-lg bg-[var(--brand-success)]/20 border border-[var(--brand-success)]/30 p-4 text-sm text-[var(--brand-success)] animate-fade-in shadow-lg"
                    role="alert"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{success}</span>
                    </div>
                  </div>
                )}
                {error && (
                  <div
                    className="rounded-lg bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)] animate-fade-in shadow-lg"
                    role="alert"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-5">
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

                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign in'
                    )}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border-default)]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-[var(--bg-surface)] text-[var(--text-muted)]">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full hover:bg-[var(--bg-sidebar)] transition-all duration-300 transform hover:scale-[1.02]"
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


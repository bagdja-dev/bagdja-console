'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/ui/button';

function LoginContent() {
  const searchParams = useSearchParams();

  // Get redirect_url from query params if exists
  const redirectUrl = searchParams.get('redirect_url');

  // Get bagdja-login URL from environment variable
  const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL || 'http://localhost:3000';

  // Build login URL with redirect_url
  const buildLoginUrl = () => {
    const loginUrl = new URL(LOGIN_URL);
    
    // Build callback URL with original redirect_url if exists
    const callbackUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'http://localhost:3001/auth/callback';
    
    const callbackUrlWithRedirect = new URL(callbackUrl);
    
    // If there's an original redirect_url, pass it to callback
    if (redirectUrl) {
      callbackUrlWithRedirect.searchParams.set('redirect_url', redirectUrl);
    }
    
    // Also check for 'redirect' param (from middleware)
    const redirect = searchParams.get('redirect');
    if (redirect) {
      callbackUrlWithRedirect.searchParams.set('redirect_url', redirect);
    }

    loginUrl.searchParams.set('redirect_url', callbackUrlWithRedirect.toString());

    // Preserve any other query params (like lang)
    searchParams.forEach((value, key) => {
      if (key !== 'redirect_url' && key !== 'redirect') {
        loginUrl.searchParams.set(key, value);
      }
    });

    return loginUrl.toString();
  };

  const handleLogin = () => {
    const loginUrl = buildLoginUrl();
    window.location.href = loginUrl;
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
              className="w-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <span className="flex items-center justify-center gap-2 ">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                Sign in Now
              </span>
                  </Button>
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

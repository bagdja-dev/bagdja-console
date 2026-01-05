'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAccessToken } from '@/lib/auth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      try {
        // Store the token
        setAccessToken(token);
        // Redirect to dashboard
        router.replace('/dashboard');
      } catch (err) {
        console.error('Auth callback error:', err);
        // Use setTimeout to avoid calling setState synchronously in effect
        setTimeout(() => {
          setError('Failed to process authentication. Please try again.');
        }, 0);
      }
    } else {
      // Use setTimeout to avoid calling setState synchronously in effect
      setTimeout(() => {
        setError('No token received. Please try logging in again.');
      }, 0);
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 text-gray-600">Completing authentication...</div>
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 text-gray-600">Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}


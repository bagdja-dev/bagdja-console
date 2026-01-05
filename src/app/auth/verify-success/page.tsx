'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function VerifySuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const email = searchParams.get('email');

  useEffect(() => {
    // Auto redirect to login after 5 seconds if no error
    if (!error) {
      const timer = setTimeout(() => {
        router.push('/login?verified=true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            <h2 className="mb-2 text-lg font-semibold">Verification Failed</h2>
            <p>{error}</p>
          </div>
          <div className="space-y-2">
            <Link
              href="/login"
              className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Go to Login
            </Link>
            <Link
              href="/register"
              className="block w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            >
              Register Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Email Verified Successfully!
          </h2>
          {email && (
            <p className="mt-2 text-sm text-gray-600">
              Your email <strong>{email}</strong> has been verified.
            </p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            You can now log in to your account.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/login?verified=true"
            className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Login
          </Link>
          <p className="text-xs text-gray-500">
            Redirecting to login page in 5 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifySuccessPage() {
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
      <VerifySuccessContent />
    </Suspense>
  );
}


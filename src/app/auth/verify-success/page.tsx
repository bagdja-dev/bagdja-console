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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]">
            <h2 className="mb-2 text-lg font-semibold">Verification Failed</h2>
            <p>{error}</p>
          </div>
          <div className="space-y-2">
            <Link
              href="/login"
              className="block w-full rounded-lg bg-[var(--action-primary)] px-4 py-2 text-white hover:bg-[var(--action-primary-hover)]"
            >
              Go to Login
            </Link>
            <Link
              href="/register"
              className="block w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)]"
            >
              Register Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-success)]/20">
          <svg
            className="h-8 w-8 text-[var(--brand-success)]"
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Email Verified Successfully!
          </h2>
          {email && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Your email <strong>{email}</strong> has been verified.
            </p>
          )}
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            You can now log in to your account.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/login?verified=true"
            className="block w-full rounded-lg bg-[var(--action-primary)] px-4 py-2 text-white hover:bg-[var(--action-primary-hover)]"
          >
            Go to Login
          </Link>
          <p className="text-xs text-[var(--text-muted)]">
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
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
          <div className="text-center">
            <div className="mb-4 text-[var(--text-secondary)]">Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <VerifySuccessContent />
    </Suspense>
  );
}


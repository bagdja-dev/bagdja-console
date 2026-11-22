'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { refreshClientToken } from '@/lib/api';

/** Public pages that call no API: render immediately (and server-side) while the token loads in the background. */
const NON_BLOCKING_PATHS = new Set(['/']);

/**
 * Client Token Provider
 * Ensures client app token (x-api-token) is initialized when the app starts
 * This token is required for all API calls to the auth service
 */
export function ClientTokenProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize client token on mount
    const initializeClientToken = async () => {
      try {
        await refreshClientToken();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize client token:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize client token');
        // Don't block the app, but log the error
        setIsInitialized(true); // Still set to true to render children
      }
    };

    initializeClientToken();
  }, []);

  // Show loading state while initializing
  if (!isInitialized && !NON_BLOCKING_PATHS.has(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--action-primary)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed (but still render children)
  if (error) {
    console.warn('Client token initialization warning:', error);
  }

  return <>{children}</>;
}


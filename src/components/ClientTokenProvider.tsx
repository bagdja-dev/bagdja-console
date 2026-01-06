'use client';

import { useEffect, useState } from 'react';
import { refreshClientToken } from '@/lib/api';

/**
 * Client Token Provider
 * Ensures client app token (x-api-token) is initialized when the app starts
 * This token is required for all API calls to the auth service
 */
export function ClientTokenProvider({ children }: { children: React.ReactNode }) {
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
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
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


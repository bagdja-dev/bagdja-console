/**
 * Authentication token helpers
 * Handles token storage and retrieval
 * Stores in both sessionStorage (for client-side) and cookie (for middleware)
 */

const ACCESS_TOKEN_KEY = 'bagdja_access_token';
const COOKIE_NAME = 'bagdja_access_token';

/**
 * Store access token in memory (sessionStorage) and cookie
 */
export function setAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    // Store in sessionStorage for client-side access
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    
    // Also set cookie for middleware to check
    // Cookie expires when browser closes (session cookie)
    document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Lax; Secure=${window.location.protocol === 'https:'}`;
  }
}

/**
 * Get access token from storage
 */
export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return null;
}

/**
 * Remove access token from storage and cookie
 */
export function removeAccessToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    // Remove cookie by setting it to expire
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}


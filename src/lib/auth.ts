/**
 * Authentication token helpers
 * Handles token storage and retrieval
 * Stores in both sessionStorage (for client-side) and cookie (for middleware)
 */

const ACCESS_TOKEN_KEY = 'bagdja_access_token';
const COOKIE_NAME = 'bagdja_access_token';
const CLIENT_TOKEN_KEY = 'bagdja_client_token';
const CLIENT_TOKEN_EXPIRY_KEY = 'bagdja_client_token_expiry';

/**
 * Store access token in memory (sessionStorage) and cookie
 */
export function setAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    // Store in sessionStorage for client-side access
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    
    // Also set cookie for middleware to check
    // Cookie expires when browser closes (session cookie)
    const cookieParts = [`${COOKIE_NAME}=${encodeURIComponent(token)}`, 'path=/', 'SameSite=Lax'];
    if (window.location.protocol === 'https:') {
      cookieParts.push('Secure');
    }
    document.cookie = cookieParts.join('; ');
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

/**
 * Store client app token (x-api-token) in sessionStorage
 * Also stores expiry time to check if token needs refresh
 */
export function setClientToken(token: string, expiresIn: number): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CLIENT_TOKEN_KEY, token);
    // Store expiry time (current time + expiresIn seconds)
    const expiryTime = Date.now() + expiresIn * 1000;
    sessionStorage.setItem(CLIENT_TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
}

/**
 * Get client app token from storage
 */
export function getClientToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(CLIENT_TOKEN_KEY);
  }
  return null;
}

/**
 * Check if client token is expired or will expire soon (within 5 minutes)
 */
export function isClientTokenExpired(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  
  const expiryTimeStr = sessionStorage.getItem(CLIENT_TOKEN_EXPIRY_KEY);
  if (!expiryTimeStr) {
    return true;
  }
  
  const expiryTime = parseInt(expiryTimeStr, 10);
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  
  return now >= (expiryTime - bufferTime);
}

/**
 * Remove client app token from storage
 */
export function removeClientToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CLIENT_TOKEN_KEY);
    sessionStorage.removeItem(CLIENT_TOKEN_EXPIRY_KEY);
  }
}

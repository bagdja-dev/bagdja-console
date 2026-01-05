/**
 * Auth Service API Client
 * Handles all API calls to the external Auth Service
 */

import { getAccessToken, removeAccessToken, setAccessToken } from './auth';
import type { AuthResponse, LoginRequest, RegisterRequest, User, ApiError } from '@/types';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

/**
 * Validate if a string is a valid URL with http/https protocol
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }
  
  try {
    const urlObj = new URL(url.trim());
    return (
      (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
      Boolean(urlObj.hostname) &&
      urlObj.hostname.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Get frontend URL for redirects
 * Priority: NEXT_PUBLIC_FRONTEND_URL > window.location.origin
 */
export function getFrontendUrl(): string | undefined {
  // Try environment variable first
  if (process.env.NEXT_PUBLIC_FRONTEND_URL) {
    const envUrl = process.env.NEXT_PUBLIC_FRONTEND_URL.trim();
    if (isValidUrl(envUrl)) {
      return envUrl;
    }
  }
  
  // Fallback to window.location.origin if available
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.trim();
    // Validate that origin is a valid URL
    if (isValidUrl(origin)) {
      return origin;
    }
  }
  
  return undefined;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const url = `${AUTH_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = {
      message: 'An error occurred',
      statusCode: response.status,
    };

    try {
      const data = await response.json();
      error.message = data.message || data.error || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }

      // Clear token on 401
    if (response.status === 401) {
      removeAccessToken();
      // Also clear cookie
      if (typeof window !== 'undefined') {
        document.cookie = 'bagdja_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }

    throw error;
  }

  return response.json();
}

/**
 * Login user
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  // Store access token
  if (response.access_token) {
    setAccessToken(response.access_token);
  }

  return response;
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  // Remove redirectUri if it's empty or invalid
  const cleanData: RegisterRequest = {
    email: data.email,
    username: data.username,
    password: data.password,
  };
  
  // Only include redirectUri if it's a valid non-empty string
  if (data.redirectUri && typeof data.redirectUri === 'string' && data.redirectUri.trim().length > 0) {
    cleanData.redirectUri = data.redirectUri;
  }
  
  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(cleanData),
  });

  // Store access token
  if (response.access_token) {
    setAccessToken(response.access_token);
  }

  return response;
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<User> {
  return apiRequest<User>('/auth/me');
}

/**
 * Get Google OAuth login URL
 */
export function getGoogleLoginUrl(): string {
  const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';
  const redirectUri = encodeURIComponent(
    typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : 'http://localhost:3000/auth/callback'
  );
  return `${AUTH_API_BASE}/auth/google?redirect_uri=${redirectUri}`;
}

/**
 * Logout user
 */
export function logout(): void {
  removeAccessToken();
  // Redirect handled by component
}


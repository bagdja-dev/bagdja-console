/**
 * Auth Service API Client
 * Handles all API calls to the external Auth Service
 */

import { 
  getAccessToken, 
  removeAccessToken, 
  setAccessToken,
  getClientToken,
  setClientToken,
  removeClientToken,
  isClientTokenExpired,
} from './auth';
import type { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  ApiError,
  ClientTokenRequest,
  ClientTokenResponse,
} from '@/types';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

// Client app credentials from environment variables
// Fallback to hardcoded values for development (should be set in .env.local)
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || 'a9F3kL2P8QwZx7C0M5eB1R4H6TnUJDYVSm';

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
 * Get or refresh client app token (x-api-token)
 * This token is required for all API calls
 */
async function ensureClientToken(): Promise<string> {
  // Check if we have a valid (non-expired) token
  let clientToken = getClientToken();
  
  if (!clientToken || isClientTokenExpired()) {
    // Need to get a new token
    clientToken = await getClientTokenFromServer();
  }
  
  return clientToken;
}

/**
 * Get client token from server
 */
async function getClientTokenFromServer(): Promise<string> {
  const url = `${AUTH_API_BASE}/auth/client`;
  
  const requestBody: ClientTokenRequest = {
    app_id: CLIENT_APP_ID,
    app_secret: CLIENT_APP_SECRET,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error: ApiError = {
      message: 'Failed to obtain client app token',
      statusCode: response.status,
    };

    try {
      const data = await response.json();
      error.message = data.message || data.error || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }

    throw error;
  }

  const data: ClientTokenResponse = await response.json();
  
  // Store the token
  setClientToken(data['x-api-token'], data.expires_in);
  
  return data['x-api-token'];
}

/**
 * Refresh client app token
 */
export async function refreshClientToken(): Promise<string> {
  removeClientToken();
  return getClientTokenFromServer();
}

/**
 * Make authenticated API request
 * Automatically includes x-api-token header for client app authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure we have a valid client token (x-api-token)
  const clientToken = await ensureClientToken();
  
  // Get user access token (if authenticated)
  const userToken = getAccessToken();
  
  const url = `${AUTH_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-token': clientToken, // Always include client app token
    ...(options.headers as Record<string, string>),
  };

  // Add user token if available (for authenticated endpoints)
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
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

    // Clear user token on 401
    if (response.status === 401) {
      removeAccessToken();
      // Also clear cookie
      if (typeof window !== 'undefined') {
        document.cookie = 'bagdja_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      // If client token is invalid, try to refresh it once
      if (error.message.includes('x-api-token') || error.message.includes('X-API-Token')) {
        try {
          await refreshClientToken();
          // Retry the request once
          return apiRequest<T>(endpoint, options);
        } catch {
          // If refresh fails, throw original error
          throw error;
        }
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


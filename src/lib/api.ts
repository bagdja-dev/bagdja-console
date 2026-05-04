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
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  ClientApp,
  CreateClientAppRequest,
  AppUser,
  Notification,
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
  const response = await apiRequest<{ user: User; clientApp?: { id: string; appId: string; appName: string } }>('/auth/me');
  // Extract user from response (auth service returns { user, clientApp })
  return response.user;
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
 * Get user's organizations
 */
export async function getOrganizations(): Promise<Organization[]> {
  return apiRequest<Organization[]>('/auth/organizations');
}

/**
 * Create a new organization
 */
export async function createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
  return apiRequest<Organization>('/auth/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an organization
 */
export async function updateOrganization(
  organizationId: string,
  data: UpdateOrganizationRequest
): Promise<Organization> {
  return apiRequest<Organization>(`/auth/organizations/${organizationId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get active organization ID from sessionStorage
 */
function getActiveOrganizationId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem('activeOrganizationId');
}

/**
 * Get user's client apps (owned apps)
 */
export async function getUserById(userId: string): Promise<User> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${AUTH_API_BASE}/auth/users/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch user' }));
    throw {
      message: error.message || 'Failed to fetch user',
      statusCode: response.status,
    } as ApiError;
  }

  return response.json();
}

/**
 * Find user by username or email
 */
export async function findUserByUsernameOrEmail(identifier: string): Promise<User> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${AUTH_API_BASE}/auth/users/search/${encodeURIComponent(identifier)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to find user' }));
    throw {
      message: error.message || 'Failed to find user',
      statusCode: response.status,
    } as ApiError;
  }

  return response.json();
}

export async function getClientApps(): Promise<ClientApp[]> {
  const organizationId = getActiveOrganizationId();
  if (!organizationId) {
    throw new Error('No active organization selected');
  }
  return apiRequest<ClientApp[]>(`/auth/client-apps?organizationId=${encodeURIComponent(organizationId)}`);
}

/**
 * Create a new client app
 */
export async function createClientApp(data: CreateClientAppRequest): Promise<ClientApp> {
  const organizationId = getActiveOrganizationId();
  if (!organizationId) {
    throw new Error('No active organization selected');
  }
  return apiRequest<ClientApp>(`/auth/client-apps?organizationId=${encodeURIComponent(organizationId)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Regenerate app secret for a client app
 */
export async function regenerateAppSecret(clientAppId: string): Promise<{ app_secret: string }> {
  return apiRequest<{ app_secret: string }>(`/auth/client-apps/${clientAppId}/regenerate-secret`, {
    method: 'POST',
  });
}

/**
 * Get all users who have transacted with a specific app
 */
export async function getAppUsers(appId: string): Promise<AppUser[]> {
  return apiRequest<AppUser[]>(`/auth/client-apps/${appId}/users`);
}

/**
 * Get public app details by app ID (for subscribed apps)
 */
export async function getPublicAppDetails(appId: string): Promise<ClientApp> {
  return apiRequest<ClientApp>(`/auth/client-apps/public/${appId}`);
}

/**
 * Logout user
 */
export function logout(): void {
  removeAccessToken();
  // Clear active organization from sessionStorage
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('activeOrganizationId');
  }
  // Redirect handled by component
}

// --- Infrastructure / Event Service API ---

const EVENT_API_BASE = process.env.NEXT_PUBLIC_EVENT_API || 'http://localhost:4085';

/**
 * Get all registered applications in the event hub
 */
export async function getInfraApps(): Promise<any[]> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const response = await fetch(`${EVENT_API_BASE}/registry/apps`, {
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch infra apps');
  return response.json();
}

/**
 * Get all event contracts in the event hub
 */
export async function getInfraContracts(): Promise<any[]> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const response = await fetch(`${EVENT_API_BASE}/registry/contracts`, {
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch infra contracts');
  return response.json();
}

/**
 * Register a new app in the event hub registry
 */
export async function registerAppInHub(data: {
  orgId: string;
  orgSlug: string;
  appId: string;
  appSlug: string;
  publicKey?: string;
}): Promise<any> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const response = await fetch(`${EVENT_API_BASE}/registry/apps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to register app in hub' }));
    throw new Error(error.message || 'Failed to register app in hub');
  }
  return response.json();
}

/**
 * Create an event contract for an app
 */
export async function createEventContract(appId: string, data: {
  eventName: string;
  schema: any;
  isPublic?: boolean;
}): Promise<any> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const response = await fetch(`${EVENT_API_BASE}/registry/apps/${appId}/contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create event contract' }));
    throw new Error(error.message || 'Failed to create event contract');
  }
  return response.json();
}

/**
 * Get event contracts for a specific app
 */
export async function getAppContracts(appId: string): Promise<any[]> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const response = await fetch(`${EVENT_API_BASE}/registry/contracts?appId=${appId}`, {
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });

  if (!response.ok) throw new Error('Failed to fetch app contracts');
  return response.json();
}

/**
 * Update an existing event contract
 */
export async function updateEventContract(contractId: string, data: {
  eventName?: string;
  schema?: any;
  isPublic?: boolean;
  isActive?: boolean;
}): Promise<any> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const response = await fetch(`${EVENT_API_BASE}/registry/contracts/${contractId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update event contract' }));
    throw new Error(error.message || 'Failed to update event contract');
  }
  return response.json();
}

/**
 * Delete an event contract
 */
export async function deleteEventContract(contractId: string): Promise<any> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const response = await fetch(`${EVENT_API_BASE}/registry/contracts/${contractId}`, {
    method: 'DELETE',
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete event contract' }));
    throw new Error(error.message || 'Failed to delete event contract');
  }
  return response.json();
}



/**
 * Get event logs for the current app
 */
export async function getEventLogs(appId?: string): Promise<any[]> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const url = appId 
    ? `${EVENT_API_BASE}/broadcast/logs?appId=${appId}`
    : `${EVENT_API_BASE}/broadcast/logs`;

  const response = await fetch(url, {
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch event logs');
  return response.json();
}

/**
 * Get available events for subscription
 */
export async function getAvailableEvents(): Promise<any[]> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const response = await fetch(`${EVENT_API_BASE}/subscriptions/available-events`, {
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch available events');
  return response.json();
}

/**
 * Subscribe to an event
 */
export async function subscribeToEvent(contractId: string, webhookUrl?: string): Promise<any> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const response = await fetch(`${EVENT_API_BASE}/subscriptions/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
    body: JSON.stringify({ contractId, webhookUrl }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to subscribe' }));
    throw new Error(error.message || 'Failed to subscribe');
  }
  return response.json();
}

/**
 * Get pending subscription requests for events owned by the current app
 */
export async function getSubscriptionRequests(appId?: string): Promise<any[]> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const url = appId 
    ? `${EVENT_API_BASE}/subscriptions/requests?appId=${appId}`
    : `${EVENT_API_BASE}/subscriptions/requests`;

  const response = await fetch(url, {
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch subscription requests');
  return response.json();
}

/**
 * Get current app's subscriptions
 */
export async function getMyAppSubscriptions(appId?: string): Promise<any[]> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const url = appId 
    ? `${EVENT_API_BASE}/subscriptions/my-subscriptions?appId=${appId}`
    : `${EVENT_API_BASE}/subscriptions/my-subscriptions`;

  const response = await fetch(url, {
    headers: {
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch my subscriptions');
  return response.json();
}

/**
 * Update an existing subscription
 */
export async function updateMySubscription(subscriptionId: string, webhookUrl?: string): Promise<any> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const response = await fetch(`${EVENT_API_BASE}/subscriptions/my-subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
    body: JSON.stringify({ webhookUrl }),
  });
  
  if (!response.ok) throw new Error('Failed to update subscription');
  return response.json();
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(subscriptionId: string, status: string): Promise<any> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const response = await fetch(`${EVENT_API_BASE}/subscriptions/${subscriptionId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clientToken,
      'Authorization': userToken ? `Bearer ${userToken}` : '',
    },
    body: JSON.stringify({ status }),
  });
  
  if (!response.ok) throw new Error('Failed to update subscription status');
  return response.json();
}

/**
 * Get current user notifications
 */
export async function getNotifications(params?: { limit?: number; offset?: number }): Promise<Notification[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
  const qs = searchParams.toString();
  return apiRequest<Notification[]>(`/auth/notifications${qs ? `?${qs}` : ''}`);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/auth/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

/**
 * Delete notification
 */
export async function deleteNotification(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/auth/notifications/${id}`, {
    method: 'DELETE',
  });
}



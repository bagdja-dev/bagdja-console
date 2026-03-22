/**
 * Plans API Client
 * Handles all API calls related to subscription plans
 */

import { 
  getAccessToken, 
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type { 
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  ApiError,
} from '@/types';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

// Client app credentials from environment variables
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || 'a9F3kL2P8QwZx7C0M5eB1R4H6TnUJDYVSm';

/**
 * Get or refresh client app token (x-api-token)
 */
async function ensureClientToken(): Promise<string> {
  const clientToken = getClientToken();
  
  if (!clientToken || isClientTokenExpired()) {
    const url = `${AUTH_API_BASE}/auth/client`;
    
    const requestBody = {
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

    const data = await response.json();
    setClientToken(data['x-api-token'], data.expires_in);
    
    return data['x-api-token'];
  }
  
  return clientToken;
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();
  
  const url = `${AUTH_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-token': clientToken,
    ...(options.headers as Record<string, string>),
  };

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

    if (response.status === 401) {
      removeAccessToken();
      if (typeof window !== 'undefined') {
        document.cookie = 'bagdja_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }

    throw error;
  }

  return response.json();
}

/**
 * Get all plans for an app
 */
export async function getPlans(appId: string): Promise<Plan[]> {
  return apiRequest<Plan[]>(`/plans?appId=${appId}`);
}

/**
 * Get a plan by ID
 */
export async function getPlan(id: string): Promise<Plan> {
  return apiRequest<Plan>(`/plans/${id}`);
}

/**
 * Create a new plan
 */
export async function createPlan(
  appId: string,
  data: CreatePlanRequest
): Promise<Plan> {
  return apiRequest<Plan>(`/plans?appId=${appId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a plan
 */
export async function updatePlan(
  id: string,
  data: UpdatePlanRequest
): Promise<Plan> {
  return apiRequest<Plan>(`/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a plan
 */
export async function deletePlan(id: string): Promise<void> {
  return apiRequest<void>(`/plans/${id}`, {
    method: 'DELETE',
  });
}


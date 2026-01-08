/**
 * Assets Service API Client
 * Handles all API calls to the external Assets Service
 */

import { 
  getAccessToken, 
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type { 
  Asset, 
  CreateAssetRequest, 
  ApiError,
  AssetGroup,
  CreateAssetGroupRequest,
  UpdateAssetGroupRequest,
} from '@/types';

function getAssetsApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_ASSETS_API;
  if (!apiBase) {
    throw new Error('NEXT_PUBLIC_ASSETS_API environment variable is required. Please set it in your .env.local file.');
  }
  return apiBase;
}

// Client app credentials from environment variables
// Fallback to hardcoded values for development (should be set in .env.local)
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || 'a9F3kL2P8QwZx7C0M5eB1R4H6TnUJDYVSm';

/**
 * Get or refresh client app token (x-api-token)
 * This token is required for all API calls
 */
async function ensureClientToken(): Promise<string> {
  // Check if we have a valid (non-expired) token
  const clientToken = getClientToken();
  
  if (!clientToken || isClientTokenExpired()) {
    // Need to get a new token from auth service
    const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';
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
    
    // Store the token
    setClientToken(data['x-api-token'], data.expires_in);
    
    return data['x-api-token'];
  }
  
  return clientToken;
}

/**
 * Create/Upload a new asset
 */
export async function createAsset(data: CreateAssetRequest, organizationId: string): Promise<Asset> {
  // Ensure we have a valid client token
  const clientToken = await ensureClientToken();
  
  // Get user access token
  const userToken = getAccessToken();
  
  if (!userToken) {
    throw new Error('User not authenticated');
  }

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  // Create FormData for multipart/form-data
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('groupId', data.groupId);
  if (data.name) {
    formData.append('name', data.name);
  }

  const url = `${getAssetsApiBase()}/assets`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': clientToken,
      'Authorization': `Bearer ${userToken}`,
      'x-organization-id': organizationId,
      // Don't set Content-Type header, let browser set it with boundary for multipart/form-data
    },
    body: formData,
  });

  if (!response.ok) {
    const error: ApiError = {
      message: 'Failed to upload asset',
      statusCode: response.status,
    };

    try {
      const errorData = await response.json();
      error.message = errorData.message || errorData.error || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }

    // Clear user token on 401
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
 * Make authenticated API request to Assets Service
 * Automatically includes x-api-token, user token, and organization ID
 */
async function assetsApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  organizationId?: string,
): Promise<T> {
  // Ensure we have a valid client token
  const clientToken = await ensureClientToken();
  
  // Get user access token
  const userToken = getAccessToken();
  
  if (!userToken) {
    throw new Error('User not authenticated');
  }

  // Get organization ID from sessionStorage if not provided
  const orgId = organizationId || (typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null);
  
  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const url = `${getAssetsApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': clientToken,
    'Authorization': `Bearer ${userToken}`,
    'x-organization-id': orgId,
    // Note: Cache-Control, Pragma, Expires are handled by browser automatically
    // and are now allowed in CORS config, so we don't need to set them explicitly
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: options.cache || 'no-store', // Prevent caching by default, but allow override
  });

  if (!response.ok) {
    const error: ApiError = {
      message: 'An error occurred',
      statusCode: response.status,
    };

    try {
      const errorData = await response.json();
      error.message = errorData.message || errorData.error || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }

    // Clear user token on 401
    if (response.status === 401) {
      removeAccessToken();
      if (typeof window !== 'undefined') {
        document.cookie = 'bagdja_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }

    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Get all assets
 */
export async function getAssets(
  groupId?: string,
  limit?: number,
  offset?: number,
  organizationId?: string,
): Promise<{ data: Asset[]; total: number }> {
  const params = new URLSearchParams();
  if (groupId) params.append('groupId', groupId);
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/assets?${queryString}` : '/assets';
  
  return assetsApiRequest<{ data: Asset[]; total: number }>(endpoint, {
    method: 'GET',
  }, organizationId);
}

/**
 * Get all asset groups
 */
export async function getAssetGroups(includeInactive = false, organizationId?: string): Promise<AssetGroup[]> {
  // Add cache-busting timestamp to prevent caching
  const timestamp = Date.now();
  const queryParam = includeInactive 
    ? `?includeInactive=true&_t=${timestamp}` 
    : `?_t=${timestamp}`;
  return assetsApiRequest<AssetGroup[]>(`/asset-groups${queryParam}`, {
    method: 'GET',
    cache: 'no-store', // Prevent caching
  }, organizationId);
}

/**
 * Get asset group by ID
 */
export async function getAssetGroup(id: string, organizationId?: string): Promise<AssetGroup> {
  return assetsApiRequest<AssetGroup>(`/asset-groups/${id}`, {
    method: 'GET',
  }, organizationId);
}

/**
 * Create a new asset group
 */
export async function createAssetGroup(
  data: CreateAssetGroupRequest,
  organizationId?: string,
): Promise<AssetGroup> {
  return assetsApiRequest<AssetGroup>('/asset-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  }, organizationId);
}

/**
 * Update an asset group
 */
export async function updateAssetGroup(
  id: string,
  data: UpdateAssetGroupRequest,
  organizationId?: string,
): Promise<AssetGroup> {
  return assetsApiRequest<AssetGroup>(`/asset-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, organizationId);
}

/**
 * Delete an asset group (soft delete)
 */
export async function deleteAssetGroup(
  id: string,
  organizationId?: string,
): Promise<void> {
  return assetsApiRequest<void>(`/asset-groups/${id}`, {
    method: 'DELETE',
  }, organizationId);
}


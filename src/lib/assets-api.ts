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
import type { Asset, CreateAssetRequest, ApiError } from '@/types';

const ASSETS_API_BASE = process.env.NEXT_PUBLIC_ASSETS_API || 'http://localhost:8081';

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
  formData.append('group', data.group);
  if (data.name) {
    formData.append('name', data.name);
  }

  const url = `${ASSETS_API_BASE}/assets`;

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


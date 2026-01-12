/**
 * Pieces API Client
 * Handles all API calls related to Piece distribution
 */

import { 
  getAccessToken, 
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type { 
  ApiError,
} from '@/types';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

// Client app credentials from environment variables
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || 'a9F3kL2P8QwZx7C0M5eB1R4H6TnUJDYVSm';

export interface DistributePieceRequest {
  fromPieceId: string;
  toUserId: string;
  toOwnerType: 'ORGANIZATION' | 'APP';
  toOwnerId: string;
  amount: number;
  referenceId: string;
  description?: string;
}

export interface DistributePieceResponse {
  transactionId: string;
  pieceId: string;
  newBalance: number;
  amount: number;
  status: string;
}

/**
 * Ensure we have a valid client token
 */
async function ensureClientToken(): Promise<string> {
  let token = getClientToken();
  
  if (!token || isClientTokenExpired()) {
    const response = await fetch(`${AUTH_API_BASE}/auth/client-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: CLIENT_APP_ID,
        app_secret: CLIENT_APP_SECRET,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to get client token' }));
      throw new Error(error.message || 'Failed to get client token');
    }

    const data = await response.json();
    token = data['x-api-token'] || null;
    if (token) {
      setClientToken(token, data.expires_in || 3600);
    }
  }

  if (!token) {
    throw new Error('Failed to get client token');
  }

  return token;
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
    }

    throw error;
  }

  return response.json();
}

/**
 * Get balance for current user
 */
export async function getBalance(): Promise<{
  global?: { id: string; level: string; balance: number; currency: string; updatedAt: Date };
  organizations: Array<{ id: string; level: string; balance: number; currency: string; organizationId?: string; organizationName?: string; updatedAt: Date }>;
  apps: Array<{ id: string; level: string; balance: number; currency: string; appId?: string; appName?: string; updatedAt: Date }>;
}> {
  return apiRequest<{
    global?: { id: string; level: string; balance: number; currency: string; updatedAt: Date };
    organizations: Array<{ id: string; level: string; balance: number; currency: string; organizationId?: string; organizationName?: string; updatedAt: Date }>;
    apps: Array<{ id: string; level: string; balance: number; currency: string; appId?: string; appName?: string; updatedAt: Date }>;
  }>('/pieces/balance');
}

/**
 * Distribute Piece to a user
 */
export async function distributePiece(data: DistributePieceRequest): Promise<DistributePieceResponse> {
  return apiRequest<DistributePieceResponse>('/pieces/distribute', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


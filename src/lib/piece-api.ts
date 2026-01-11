/**
 * Piece API Client
 * Handles all API calls to the Piece Service
 */

import { getAccessToken, removeAccessToken } from './auth';
import { refreshClientToken } from './api';
import type { ApiError } from '@/types';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

export interface BalanceItem {
  id: string;
  level: 'global' | 'organizational' | 'app';
  balance: number;
  currency: string;
  organizationId?: string;
  organizationName?: string;
  appId?: string;
  appName?: string;
  updatedAt: Date;
}

export interface BalanceResponse {
  global?: BalanceItem;
  organizations: BalanceItem[];
  apps: BalanceItem[];
}

/**
 * Make authenticated API request to Piece Service
 */
async function pieceApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get client token - refresh if needed
  let clientToken: string;
  try {
    clientToken = await refreshClientToken();
  } catch {
    throw new Error('Failed to obtain client token');
  }
  
  // Get user access token
  const userToken = getAccessToken();
  
  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const url = `${AUTH_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-token': clientToken,
    'Authorization': `Bearer ${userToken}`,
    ...(options.headers as Record<string, string>),
  };

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
 * Get balance for current user
 */
export async function getBalance(): Promise<BalanceResponse> {
  return pieceApiRequest<BalanceResponse>('/pieces/balance');
}

export async function getBalanceWithRefresh(): Promise<BalanceResponse> {
  return pieceApiRequest<BalanceResponse>('/pieces/balance/refresh');
}

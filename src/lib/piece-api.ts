/**
 * Piece Service API Client
 * Handles all API calls to the Piece Service
 */

import { getAccessToken, getClientToken } from './auth';
import type { ApiError } from '@/types';

const PIECE_API_BASE = process.env.NEXT_PUBLIC_PIECE_API || process.env.NEXT_PUBLIC_AUTH_API || 'http://localhost:3003';

export interface BalanceItem {
  id: string;
  level: string;
  balance: number;
  currency: string;
  organizationId?: string;
  organizationName?: string;
  appId?: string;
  appName?: string;
  updatedAt: Date;
}

export interface BalanceResponse {
  global: BalanceItem;
  organizations: BalanceItem[];
  apps: BalanceItem[];
}

export interface TransactionHistory {
  id: string;
  type: string;
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  referenceId: string;
  description?: string;
  status: string;
  createdAt: Date;
}

export interface AppBalanceResponse {
  pieceId: string;
  level: string;
  balance: number;
  currency: string;
  appId: string;
  userId: string;
  updatedAt: Date;
  transactions: TransactionHistory[];
}

async function pieceApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    // Get client token (for app authentication)
    let clientToken = getClientToken();
    if (!clientToken || isClientTokenExpired()) {
      // Refresh client token if needed
      const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
      const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || '';
      
      if (!CLIENT_APP_SECRET) {
        throw new Error('Client app secret not configured');
      }

      const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTH_API || 'http://localhost:3003'}/auth/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: CLIENT_APP_ID,
          app_secret: CLIENT_APP_SECRET,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get client token');
      }

      const tokenData = await tokenResponse.json();
      clientToken = tokenData['x-api-token'];
    }

    // Get user token (for user authentication)
    const userToken = getAccessToken();
    if (!userToken) {
      throw new Error('No access token found');
    }

    const response = await fetch(`${PIECE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': clientToken || '',
        Authorization: `Bearer ${userToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch data' }));
      throw {
        message: error.message || 'Failed to fetch data',
        statusCode: response.status,
      } as ApiError;
    }

    return response.json();
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }
    throw {
      message: err instanceof Error ? err.message : 'Failed to fetch data',
      statusCode: 500,
    } as ApiError;
  }
}

function isClientTokenExpired(): boolean {
  const tokenData = sessionStorage.getItem('clientTokenData');
  if (!tokenData) return true;

  try {
    const parsed = JSON.parse(tokenData);
    const expiresAt = parsed.expiresAt;
    if (!expiresAt) return true;

    // Check if token expires in less than 5 minutes
    return Date.now() >= expiresAt - 5 * 60 * 1000;
  } catch {
    return true;
  }
}

export async function getBalance(): Promise<BalanceResponse> {
  return pieceApiRequest<BalanceResponse>('/pieces/balance');
}

export async function getBalanceWithRefresh(): Promise<BalanceResponse> {
  return pieceApiRequest<BalanceResponse>('/pieces/balance/refresh');
}

export async function getAppBalance(appId: string, userId: string): Promise<AppBalanceResponse> {
  return pieceApiRequest<AppBalanceResponse>(`/pieces/app-balance?appId=${appId}&userId=${userId}`);
}

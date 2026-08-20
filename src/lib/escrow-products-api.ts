/**
 * Escrow Products API Client
 * Handles all API calls related to Escrow Products (`bagdja-payment-service`
 * `/escrow-products`) — katalog/policy per app untuk item yang dijual via
 * escrow milestone. Terpisah dari `products-api.ts` (katalog jualan generik).
 */

import {
  getAccessToken,
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type {
  EscrowProduct,
  CreateEscrowProductRequest,
  UpdateEscrowProductRequest,
  ApiError,
} from '@/types';

function getPaymentApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_PAYMENT_API;
  if (!apiBase) {
    throw new Error('NEXT_PUBLIC_PAYMENT_API environment variable is required. Please set it in your .env file.');
  }
  return apiBase;
}

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || 'a9F3kL2P8QwZx7C0M5eB1R4H6TnUJDYVSm';

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

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const url = `${getPaymentApiBase()}${endpoint}`;

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
    cache: options.cache || 'no-store',
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Get all escrow products, optionally filtered by app (slug) and/or active status.
 */
export async function getEscrowProducts(
  appId?: string,
  isActive?: boolean,
): Promise<EscrowProduct[]> {
  const qs = new URLSearchParams();
  if (appId) qs.append('appId', appId);
  if (typeof isActive === 'boolean') qs.append('is_active', String(isActive));
  const query = qs.toString();
  return apiRequest<EscrowProduct[]>(`/escrow-products${query ? `?${query}` : ''}`);
}

/**
 * Get a single escrow product by id.
 */
export async function getEscrowProduct(id: string): Promise<EscrowProduct> {
  return apiRequest<EscrowProduct>(`/escrow-products/${id}`);
}

/**
 * Create a new escrow product. `appId` (slug) dikirim di body.
 */
export async function createEscrowProduct(
  appId: string,
  data: CreateEscrowProductRequest,
): Promise<EscrowProduct> {
  return apiRequest<EscrowProduct>('/escrow-products', {
    method: 'POST',
    body: JSON.stringify({ ...data, appId }),
  });
}

/**
 * Update an escrow product.
 */
export async function updateEscrowProduct(
  id: string,
  data: UpdateEscrowProductRequest,
): Promise<EscrowProduct> {
  return apiRequest<EscrowProduct>(`/escrow-products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an escrow product.
 */
export async function deleteEscrowProduct(id: string): Promise<void> {
  return apiRequest<void>(`/escrow-products/${id}`, {
    method: 'DELETE',
  });
}

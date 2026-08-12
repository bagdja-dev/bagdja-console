/**
 * Products API Client
 * Handles all API calls related to products.
 *
 * Dipindah dari bagdja-auth ke bagdja-payment-service (lihat
 * refactoring-payment-service.md §5). `appId` yang dipakai di sini adalah
 * slug app (`ClientApp.appId`), bukan lagi UUID `ClientApp.id`.
 */

import {
  getAccessToken,
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
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

// Client app credentials from environment variables
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || 'a9F3kL2P8QwZx7C0M5eB1R4H6TnUJDYVSm';

/**
 * Get or refresh client app token (x-api-token).
 * Token tetap didapat dari bagdja-auth (`/auth/client`) — hanya endpoint
 * resource-nya yang berpindah ke payment-service.
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
 * Make authenticated API request to bagdja-payment-service
 */
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
 * Get all products for an app (appId = slug, mis. "bagdja-course")
 */
export async function getProducts(appId: string): Promise<Product[]> {
  return apiRequest<Product[]>(`/products?appId=${encodeURIComponent(appId)}`);
}

/**
 * Get a product by ID
 */
export async function getProduct(id: string): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`);
}

/**
 * Create a new product. `appId` (slug) dikirim di body, bukan query string
 * (beda dgn endpoint auth yg lama).
 */
export async function createProduct(
  appId: string,
  data: CreateProductRequest
): Promise<Product> {
  return apiRequest<Product>('/products', {
    method: 'POST',
    body: JSON.stringify({ ...data, appId }),
  });
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  data: UpdateProductRequest
): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
  return apiRequest<void>(`/products/${id}`, {
    method: 'DELETE',
  });
}

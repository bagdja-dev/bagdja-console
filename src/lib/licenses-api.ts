/**
 * Licenses API Client
 * Handles all API calls related to licenses.
 *
 * Dipindah dari bagdja-auth ke bagdja-payment-service (lihat
 * refactoring-payment-service.md §3.3/§5). `appId` = slug app,
 * `orgId` = string opaque (bukan lagi FK), `currency` ditambahkan.
 */

import {
  getAccessToken,
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type {
  License,
  CreateLicenseRequest,
  UpdateLicenseRequest,
  BuyLicenseResponse,
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
 * Get all licenses for an app (appId = slug)
 */
export async function getLicenses(appId: string): Promise<License[]> {
  return apiRequest<License[]>(`/licenses?appId=${encodeURIComponent(appId)}`);
}

/**
 * Get all purchased licenses for an app
 */
export async function getPurchasedLicenses(appId: string): Promise<License[]> {
  return apiRequest<License[]>(`/licenses/purchased?appId=${encodeURIComponent(appId)}`);
}

/**
 * Get a license by ID
 */
export async function getLicense(id: string): Promise<License> {
  return apiRequest<License>(`/licenses/${id}`);
}

/**
 * Create a new license. `appId` (slug) dikirim di body.
 */
export async function createLicense(
  appId: string,
  data: CreateLicenseRequest
): Promise<License> {
  return apiRequest<License>('/licenses', {
    method: 'POST',
    body: JSON.stringify({ ...data, appId }),
  });
}

/**
 * Update a license
 */
export async function updateLicense(
  id: string,
  data: UpdateLicenseRequest
): Promise<License> {
  return apiRequest<License>(`/licenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a license
 */
export async function deleteLicense(id: string): Promise<void> {
  return apiRequest<void>(`/licenses/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Buy a license (organization purchases license).
 *
 * NB: di payment-service, appId/orgId "pemilik inventory & penerima dana"
 * diresolve dari identitas app pemanggil (`req.clientApp`), BUKAN dari query
 * param — beda dari endpoint auth yg lama. `organizationId` di sini murni
 * jadi `orgId` pembeli (body), dipakai kalau app pemanggil bertindak atas
 * nama org tersebut. Belum ada pemanggil aktif dari console saat ini.
 */
export async function buyLicense(
  licenseId: string,
  organizationId: string
): Promise<BuyLicenseResponse> {
  return apiRequest<BuyLicenseResponse>(`/licenses/${licenseId}/buy`, {
    method: 'POST',
    body: JSON.stringify({ orgId: organizationId }),
  });
}

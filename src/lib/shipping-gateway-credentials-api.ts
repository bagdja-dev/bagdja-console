/**
 * Shipping Gateway Credentials API Client
 *
 * Backend only allows core services (isCoreService=true on this console's
 * client-app registration) to call these endpoints — see
 * ShippingGatewayCredentialsController in bagdja-shipping-service.
 */

import {
  getAccessToken,
  getActiveOrganizationId,
  getActiveOrganizationSlug,
  getClientToken,
  isClientTokenExpired,
  removeAccessToken,
  setClientToken,
} from './auth';
import type { ApiError } from '@/types';

function getShippingApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_SHIPPING_API;
  if (!apiBase) {
    throw new Error('NEXT_PUBLIC_SHIPPING_API environment variable is required. Please set it in your .env file.');
  }
  return apiBase;
}

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID || 'user-console';
const CLIENT_APP_SECRET =
  process.env.NEXT_PUBLIC_CLIENT_APP_SECRET || 'a9F3kL2P8QwZx7C0M5eB1R4H6TnUJDYVSm';

async function ensureClientToken(): Promise<string> {
  const clientToken = getClientToken();

  if (!clientToken || isClientTokenExpired()) {
    const url = `${AUTH_API_BASE}/auth/client`;
    const requestBody = { app_id: CLIENT_APP_ID, app_secret: CLIENT_APP_SECRET };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error: ApiError = { message: 'Failed to obtain client app token', statusCode: response.status };
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

async function credentialsApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const orgSlug = getActiveOrganizationSlug() || 'all';
  const orgUuid = getActiveOrganizationId();
  const url = `${getShippingApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': clientToken,
    Authorization: `Bearer ${userToken}`,
    'x-organization-id': orgSlug,
    ...(orgUuid && orgUuid !== orgSlug ? { 'x-organization-uuid': orgUuid } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: options.cache || 'no-store',
  });

  if (!response.ok) {
    const error: ApiError = { message: 'An error occurred', statusCode: response.status };
    try {
      const errorData = await response.json();
      error.message = errorData.message || errorData.error || error.message;
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

export interface ShippingGatewayCredential {
  provider: string;
  org_id: string;
  app_id: string;
  credentials: Record<string, string>;
  is_sandbox: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getShippingGatewayCredentials(params?: {
  provider?: string;
  orgId?: string;
  appId?: string;
}): Promise<ShippingGatewayCredential[]> {
  const qs = new URLSearchParams();
  if (params?.provider) qs.append('provider', params.provider);
  if (params?.orgId) qs.append('orgId', params.orgId);
  if (params?.appId) qs.append('appId', params.appId);
  const queryString = qs.toString();
  const url = queryString
    ? `/shipping-gateway-credentials?${queryString}`
    : '/shipping-gateway-credentials';
  return credentialsApiRequest<ShippingGatewayCredential[]>(url, { method: 'GET' });
}

export async function createShippingGatewayCredential(payload: {
  provider: string;
  org_id?: string;
  app_id?: string;
  credentials: Record<string, string>;
  is_sandbox?: boolean;
  is_active?: boolean;
}): Promise<ShippingGatewayCredential> {
  return credentialsApiRequest<ShippingGatewayCredential>('/shipping-gateway-credentials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateShippingGatewayCredential(
  provider: string,
  orgId: string,
  appId: string,
  payload: Partial<Pick<ShippingGatewayCredential, 'credentials' | 'is_sandbox' | 'is_active'>>,
): Promise<ShippingGatewayCredential> {
  return credentialsApiRequest<ShippingGatewayCredential>(
    `/shipping-gateway-credentials/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function deleteShippingGatewayCredential(provider: string, orgId: string, appId: string): Promise<void> {
  return credentialsApiRequest<void>(
    `/shipping-gateway-credentials/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'DELETE' },
  );
}

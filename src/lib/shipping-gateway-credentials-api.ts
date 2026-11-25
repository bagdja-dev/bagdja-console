/**
 * Shipping Gateway Credentials API Client
 *
 * Memanggil jalur Console berbasis USER di shipping-service
 * (`/console/shipping-gateway-credentials`, plan/architecture/
 * core-service-flag-removal-plan.md P2): cukup token login user — tanpa
 * token client app core service. shipping-service memverifikasi token ke
 * bagdja-auth dan mewajibkan keanggotaan org sistem + permission
 * `console.infra.shipping-credentials.view` / `.manage` (owner org sistem
 * selalu lolos).
 */

import { requireAccessToken } from './auth';
import type { ApiError } from '@/types';

function getShippingApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_SHIPPING_API;
  if (!apiBase) {
    throw new Error('NEXT_PUBLIC_SHIPPING_API environment variable is required. Please set it in your .env file.');
  }
  return apiBase;
}

const CONSOLE_BASE = '/console/shipping-gateway-credentials';

async function credentialsApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const userToken = requireAccessToken();
  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${getShippingApiBase()}${CONSOLE_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
      ...(options.headers as Record<string, string>),
    },
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

    // 401/403 dari service non-auth TIDAK menghapus token login (29 Okt 2026):
    // bisa berarti izin di service itu, bukan sesi berakhir. Sesi hanya
    // diakhiri oleh 401 dari bagdja-auth (lib/api.ts).

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
  /** Hanya field non-rahasia (mis. baseUrl). Nilai rahasia tidak pernah dikirim server. */
  credentials: Record<string, string>;
  /** Semua field yang sudah terisi, termasuk yang rahasia (mis. apiKey). */
  configured_fields?: string[];
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
  const url = queryString ? `?${queryString}` : '';
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
  return credentialsApiRequest<ShippingGatewayCredential>('', {
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
    `/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function deleteShippingGatewayCredential(provider: string, orgId: string, appId: string): Promise<void> {
  return credentialsApiRequest<void>(
    `/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'DELETE' },
  );
}

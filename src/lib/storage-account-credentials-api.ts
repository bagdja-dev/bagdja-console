/**
 * Storage Account Credentials API Client
 *
 * Memanggil jalur Console berbasis USER di storage-service
 * (`/console/storage-account-credentials`, plan/architecture/
 * core-service-flag-removal-plan.md P1.4): cukup token login user — tanpa
 * token client app core service. storage-service memverifikasi token ke
 * bagdja-auth dan mewajibkan keanggotaan org sistem + permission
 * `console.infra.storage-credentials.view` / `.manage` (owner org sistem
 * selalu lolos).
 */

import { requireAccessToken } from './auth';
import type { ApiError } from '@/types';

function getStorageApiBase(): string {
  const apiBase = process.env.NEXT_PUBLIC_STORAGE_API;
  if (!apiBase) {
    throw new Error('NEXT_PUBLIC_STORAGE_API environment variable is required. Please set it in your .env file.');
  }
  return apiBase;
}

const CONSOLE_BASE = '/console/storage-account-credentials';

async function credentialsApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const userToken = requireAccessToken();
  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${getStorageApiBase()}${CONSOLE_BASE}${endpoint}`, {
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

export interface StorageAccountCredential {
  provider: string;
  org_id: string;
  app_id: string;
  credentials: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getStorageAccountCredentials(params?: {
  provider?: string;
  orgId?: string;
  appId?: string;
}): Promise<StorageAccountCredential[]> {
  const qs = new URLSearchParams();
  if (params?.provider) qs.append('provider', params.provider);
  if (params?.orgId) qs.append('orgId', params.orgId);
  if (params?.appId) qs.append('appId', params.appId);
  const queryString = qs.toString();
  const url = queryString ? `?${queryString}` : '';
  return credentialsApiRequest<StorageAccountCredential[]>(url, { method: 'GET' });
}

export async function createStorageAccountCredential(payload: {
  provider: string;
  org_id?: string;
  app_id?: string;
  credentials: Record<string, string>;
  is_active?: boolean;
}): Promise<StorageAccountCredential> {
  return credentialsApiRequest<StorageAccountCredential>('', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStorageAccountCredential(
  provider: string,
  orgId: string,
  appId: string,
  payload: Partial<Pick<StorageAccountCredential, 'credentials' | 'is_active'>>,
): Promise<StorageAccountCredential> {
  return credentialsApiRequest<StorageAccountCredential>(
    `/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function deleteStorageAccountCredential(provider: string, orgId: string, appId: string): Promise<void> {
  return credentialsApiRequest<void>(
    `/${encodeURIComponent(provider)}/${encodeURIComponent(orgId)}/${encodeURIComponent(appId)}`,
    { method: 'DELETE' },
  );
}

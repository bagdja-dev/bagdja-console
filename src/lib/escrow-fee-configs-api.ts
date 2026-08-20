/**
 * Escrow Fee Config API Client
 * Handles all API calls related to escrow fee configs
 * (`bagdja-payment-service` `/escrow/fee-configs`) — "billing config" yang
 * menentukan potongan platform_fee/app_fee saat release milestone escrow.
 * Lihat plan/payment-service/escrow-milestone-decision.md §3.5/§9 Fase D.
 *
 * Catatan kontrak API (asimetris, ikuti apa adanya):
 * - Request body (upsert) pakai snake_case: org_id, app_id, product_id,
 *   platform_fixed_fee, dst.
 * - Response (GET/POST) adalah entity TypeORM mentah → camelCase: orgId,
 *   appId, productId, platformFixedFee, dst.
 * - Tidak ada endpoint delete — nonaktifkan lewat upsert `is_active: false`.
 * - Persentase dikirim/diterima sebagai angka literal (mis. `1` = 1%), BEDA
 *   dari `payment-api.ts` `BillingSetting.percentage_fee` yang desimal.
 */

import {
  getAccessToken,
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type { ApiError } from '@/types';

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
    'x-api-key': clientToken,
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

export type EscrowFeeConfig = {
  id: string;
  orgId: string;
  appId: string;
  productId: string | null;
  platformFixedFee: number;
  platformPercentageFee: number;
  appFixedFee: number;
  appPercentageFee: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertEscrowFeeConfigRequest = {
  org_id?: string;
  app_id?: string;
  product_id?: string;
  platform_fixed_fee?: number;
  platform_percentage_fee?: number;
  app_fixed_fee?: number;
  app_percentage_fee?: number;
  is_active?: boolean;
};

/**
 * List escrow fee configs. `bagdja-console` terdaftar sebagai core service di
 * payment-service, jadi ini mengembalikan SEMUA config lintas org/app (bukan
 * cuma milik satu app) — filter di sisi klien pakai `product_id`/`is_active`
 * kalau perlu.
 */
export async function listEscrowFeeConfigs(params?: {
  product_id?: string;
  is_active?: boolean;
}): Promise<EscrowFeeConfig[]> {
  const qs = new URLSearchParams();
  if (params?.product_id) qs.append('product_id', params.product_id);
  if (typeof params?.is_active === 'boolean') qs.append('is_active', String(params.is_active));
  const query = qs.toString();
  return apiRequest<EscrowFeeConfig[]>(`/escrow/fee-configs${query ? `?${query}` : ''}`);
}

/**
 * Create/update a fee config for a scope (org_id, app_id, product_id).
 * Upsert — matching scope yang sudah ada akan di-update, bukan duplikat.
 */
export async function upsertEscrowFeeConfig(
  data: UpsertEscrowFeeConfigRequest,
): Promise<EscrowFeeConfig> {
  return apiRequest<EscrowFeeConfig>('/escrow/fee-configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

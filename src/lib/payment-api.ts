/**
 * Payment Service API Client
 * Handles payout account integration to bagdja-payment-service
 */

import {
  getAccessToken,
  getClientToken,
  isClientTokenExpired,
  removeAccessToken,
  setClientToken,
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

async function paymentApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  organizationId?: string,
): Promise<T> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const orgId =
    organizationId || (typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null);
  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const url = `${getPaymentApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': clientToken,
    Authorization: `Bearer ${userToken}`,
    'x-organization-id': orgId,
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

export type PayoutAccount = {
  id: string;
  org_id: string;
  currency_code: string;
  payout_method: string;
  account_holder_name: string;
  account_identifier: string;
  bank_name?: string | null;
  swift_code?: string | null;
  iban?: string | null;
  bank_address?: string | null;
  network?: string | null;
  provider_name?: string | null;
  is_verified?: boolean | null;
  verified_at?: string | null;
  created_at?: string | null;
};

export type PayoutAccountListResponse = {
  page: number;
  limit: number;
  total: number;
  data: PayoutAccount[];
};

export type CreatePayoutAccountRequest = {
  currency_code: string;
  payout_method: string;
  account_holder_name: string;
  account_identifier: string;
  bank_name?: string;
  swift_code?: string;
  iban?: string;
  bank_address?: string;
  network?: string;
  provider_name?: string;
  is_verified?: boolean;
};

export type UpdatePayoutAccountRequest = Partial<CreatePayoutAccountRequest>;

export async function listPayoutAccounts(params?: {
  page?: number;
  size?: number;
  organizationId?: string;
}): Promise<PayoutAccountListResponse> {
  const page = params?.page ?? 1;
  const size = params?.size ?? 20;
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  return paymentApiRequest<PayoutAccountListResponse>(`/payout-accounts/get?${qs.toString()}`, { method: 'GET' }, params?.organizationId);
}

export async function createPayoutAccount(
  data: CreatePayoutAccountRequest,
  organizationId?: string,
): Promise<PayoutAccount> {
  return paymentApiRequest<PayoutAccount>('/payout-account', { method: 'POST', body: JSON.stringify(data) }, organizationId);
}

export async function getPayoutAccountById(id: string, organizationId?: string): Promise<PayoutAccount> {
  return paymentApiRequest<PayoutAccount>(`/payout-account/${encodeURIComponent(id)}`, { method: 'GET' }, organizationId);
}

export async function updatePayoutAccount(
  id: string,
  data: UpdatePayoutAccountRequest,
  organizationId?: string,
): Promise<PayoutAccount> {
  return paymentApiRequest<PayoutAccount>(
    `/payout-account/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(data) },
    organizationId,
  );
}


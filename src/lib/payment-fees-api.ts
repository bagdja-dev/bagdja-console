/**
 * Payment Method Fees API Client
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

async function paymentFeesApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  organizationId?: string,
): Promise<T> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const orgSlug = organizationId || getActiveOrganizationSlug();
  if (!orgSlug) {
    throw new Error('Organization is required');
  }

  const orgUuid = getActiveOrganizationId();
  const url = `${getPaymentApiBase()}${endpoint}`;

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

export interface PaymentMethodFee {
  id: string;
  provider: string;
  method: string;
  fixedFee: number;
  percentageFee: number;
  currency: string;
  isActive: boolean;
  topupRewardFixedFee: number;
  topupRewardPercentageFee: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethodFeeListResponse = {
  data: PaymentMethodFee[];
  total: number;
  page: number;
  limit: number;
};

export type PaymentMethodFeesQuery = {
  page?: number;
  limit?: number;
  size?: number;
  search?: string;
  sort?: string;
  provider?: string;
  method?: string;
  currency?: string;
  isActive?: string;
};

export async function getPaymentMethodFees(
  params?: PaymentMethodFeesQuery
): Promise<PaymentMethodFeeListResponse> {
  const qs = new URLSearchParams();
  const page = params?.page;
  const limit = params?.limit ?? params?.size;

  if (page) qs.append('page', String(page));
  if (limit) qs.append('limit', String(limit));
  if (params?.search) qs.append('search', params.search);
  if (params?.sort) qs.append('sort', params.sort);
  if (params?.provider) qs.append('provider', params.provider);
  if (params?.method) qs.append('method', params.method);
  if (params?.currency) qs.append('currency', params.currency);
  if (params?.isActive) qs.append('is_active', params.isActive);

  const queryString = qs.toString();
  const url = queryString ? `/payment-method-fees?${queryString}` : '/payment-method-fees';

  return paymentFeesApiRequest<PaymentMethodFeeListResponse>(url, { method: 'GET' }, 'all');
}

export async function getActivePaymentMethods(): Promise<PaymentMethodFee[]> {
  const result = await paymentFeesApiRequest<PaymentMethodFeeListResponse>('/payment-methods', { method: 'GET' }, 'all');
  return result.data;
}

export async function createPaymentMethodFee(
  payload: Omit<PaymentMethodFee, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PaymentMethodFee> {
  return paymentFeesApiRequest<PaymentMethodFee>('/payment-method-fees', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'all');
}

export async function updatePaymentMethodFee(
  id: string,
  payload: Partial<Omit<PaymentMethodFee, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PaymentMethodFee> {
  return paymentFeesApiRequest<PaymentMethodFee>(`/payment-method-fees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, 'all');
}

export async function deletePaymentMethodFee(id: string): Promise<void> {
  return paymentFeesApiRequest<void>(`/payment-method-fees/${id}`, { method: 'DELETE' }, 'all');
}

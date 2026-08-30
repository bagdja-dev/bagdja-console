/**
 * Plans API Client
 * Handles all API calls related to subscription plans.
 *
 * Dipindah dari bagdja-auth ke bagdja-payment-service, merge dgn
 * `subscription_plans` yg sudah ada di sana (lihat
 * refactoring-payment-service.md §3.2/§5). Endpoint: `/subscription-plans`.
 *
 * Console tetap memakai nama field lama (`duration`/`durationValue`/
 * `features: string[]`) di UI supaya perubahan minimal — mapping ke bentuk
 * baru (`billingInterval`/`intervalCount`/`features: { list: [...] }`)
 * dilakukan di sini.
 */

import {
  getAccessToken,
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type {
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
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

type RawSubscriptionPlan = {
  id: string;
  appId: string;
  orgId: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: string;
  intervalCount: number;
  trialPeriodDays: number | null;
  maxRedemptionsPerOwner: number | null;
  features: { list?: string[] } | Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapFromApi(raw: RawSubscriptionPlan): Plan {
  const featuresList =
    raw.features && Array.isArray((raw.features as { list?: string[] }).list)
      ? ((raw.features as { list?: string[] }).list as string[])
      : null;

  return {
    id: raw.id,
    appId: raw.appId,
    orgId: raw.orgId,
    code: raw.code,
    name: raw.name,
    description: raw.description,
    price: Number(raw.price),
    currency: raw.currency,
    duration: raw.billingInterval as Plan['duration'],
    durationValue: raw.intervalCount,
    features: featuresList,
    trialPeriodDays: raw.trialPeriodDays,
    maxRedemptionsPerOwner: raw.maxRedemptionsPerOwner,
    metadata: raw.metadata,
    isActive: raw.isActive,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

function mapToApiBody(data: CreatePlanRequest | UpdatePlanRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: data.name,
    description: data.description,
    price: data.price,
    currency: data.currency,
    billingInterval: data.duration,
    intervalCount: data.durationValue,
    maxRedemptionsPerOwner: data.maxRedemptionsPerOwner,
    metadata: data.metadata,
    isActive: data.isActive,
  };
  if ('code' in data && data.code) {
    body.code = data.code;
  }
  if (data.features && data.features.length > 0) {
    body.features = { list: data.features };
  }
  return body;
}

/**
 * Get all plans for an app (appId = slug)
 */
export async function getPlans(appId: string): Promise<Plan[]> {
  const res = await apiRequest<{ data: RawSubscriptionPlan[] }>(
    `/subscription-plans?appId=${encodeURIComponent(appId)}`,
  );
  return (res.data || []).map(mapFromApi);
}

/**
 * Get a plan by ID
 */
export async function getPlan(id: string): Promise<Plan> {
  const raw = await apiRequest<RawSubscriptionPlan>(`/subscription-plans/${id}`);
  return mapFromApi(raw);
}

/**
 * Create a new plan. `appId` (slug) dikirim di body.
 */
export async function createPlan(
  appId: string,
  data: CreatePlanRequest
): Promise<Plan> {
  const raw = await apiRequest<RawSubscriptionPlan>('/subscription-plans', {
    method: 'POST',
    body: JSON.stringify({ ...mapToApiBody(data), appId }),
  });
  return mapFromApi(raw);
}

/**
 * Update a plan
 */
export async function updatePlan(
  id: string,
  data: UpdatePlanRequest
): Promise<Plan> {
  const raw = await apiRequest<RawSubscriptionPlan>(`/subscription-plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapToApiBody(data)),
  });
  return mapFromApi(raw);
}

/**
 * Delete (deactivate) a plan — soft-delete di payment-service
 */
export async function deletePlan(id: string): Promise<void> {
  return apiRequest<void>(`/subscription-plans/${id}`, {
    method: 'DELETE',
  });
}

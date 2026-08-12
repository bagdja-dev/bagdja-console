/**
 * Subscriptions API Client (bagdja-payment-service)
 *
 * Model BARU — subscription plan billing (wallet-based, proration,
 * dunning), BUKAN pengganti 1:1 `Subscription` lama bagdja-auth yang
 * dihapus di Fase 1.D. Lihat refactoring-payment-service.md §7 Track 2
 * Fase 1.G.
 *
 * `GET /subscriptions` (admin/self-service listing, appId target bebas)
 * beda dari `GET /subscriptions/my` (mediator pattern, appId selalu diri
 * pemanggil) — console pakai yang pertama karena appId targetnya adalah
 * app pihak lain yang di-"subscribe" oleh org yang login.
 */

import {
  getAccessToken,
  removeAccessToken,
  getClientToken,
  setClientToken,
  isClientTokenExpired,
} from './auth';
import type { Subscription, ApiError } from '@/types';

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

type RawSubscription = {
  id: string;
  planId: string;
  appId: string;
  orgId: string | null;
  userId: string | null;
  walletId: string;
  platformOrgId: string;
  lockedAmount: number;
  currency: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  failedAttemptCount: number;
  gracePeriodEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapFromApi(raw: RawSubscription): Subscription {
  return {
    id: raw.id,
    planId: raw.planId,
    appId: raw.appId,
    orgId: raw.orgId,
    userId: raw.userId,
    walletId: raw.walletId,
    platformOrgId: raw.platformOrgId,
    lockedAmount: Number(raw.lockedAmount),
    currency: raw.currency,
    status: raw.status as Subscription['status'],
    currentPeriodStart: new Date(raw.currentPeriodStart),
    currentPeriodEnd: new Date(raw.currentPeriodEnd),
    nextBillingDate: new Date(raw.nextBillingDate),
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd,
    cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt) : null,
    failedAttemptCount: raw.failedAttemptCount,
    gracePeriodEndsAt: raw.gracePeriodEndsAt ? new Date(raw.gracePeriodEndsAt) : null,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

/**
 * List subscriptions of `orgId` for a given target app (appId = slug).
 * `orgId` wajib diisi (payment-service menolak listing tanpa orgId/userId).
 *
 * NB: sengaja belum ada `cancelSubscription()`/`changePlan()` di sini —
 * endpoint `/subscriptions/:id/cancel` & `/:id/change-plan` di
 * payment-service pakai pola mediator (`appId` = identitas app pemanggil
 * sendiri dari `ClientAppGuard`, BUKAN query param), jadi tidak bisa
 * dipanggil apa adanya dari console (yang authenticate sbg `user-console`,
 * bukan app target). Perlu endpoint admin baru dulu (sama pola dgn
 * `GET /subscriptions` di bawah) kalau aksi cancel/change-plan dari
 * console dibutuhkan — belum diminta, jadi belum dikerjakan.
 */
export async function getSubscriptionsForOrg(
  appId: string,
  orgId: string,
): Promise<Subscription[]> {
  const raw = await apiRequest<RawSubscription[]>(
    `/subscriptions?appId=${encodeURIComponent(appId)}&orgId=${encodeURIComponent(orgId)}`,
  );
  return (raw || []).map(mapFromApi);
}

/**
 * List EVERY subscriber of `appId` (owner view — no orgId/userId filter).
 * Dipakai `applications/owned/[id]/page.tsx` tab Subscriptions, beda dari
 * `getSubscriptionsForOrg()` yang scope ke satu org (subscriber view).
 */
export async function getAllSubscriptionsForApp(appId: string): Promise<Subscription[]> {
  const raw = await apiRequest<RawSubscription[]>(
    `/subscriptions?appId=${encodeURIComponent(appId)}`,
  );
  return (raw || []).map(mapFromApi);
}

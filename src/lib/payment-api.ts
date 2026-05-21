/**
 * Payment Service API Client
 * Handles payout account integration to bagdja-payment-service
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

export type Wallet = {
  id: string;
  org_id: string;
  currency_code: string;
  provider: string;
  balance: number;
  held_balance: number;
  is_active: boolean;
  activated_at: string | null;
  updated_at: string;
};

export async function listWallets(organizationId?: string): Promise<Wallet[]> {
  return paymentApiRequest<Wallet[]>('/wallets', { method: 'GET' }, organizationId);
}

export async function activateWallet(currencyCode: string, organizationId?: string): Promise<Wallet> {
  return paymentApiRequest<Wallet>(
    '/wallets/activate',
    {
      method: 'POST',
      body: JSON.stringify({ currencyCode }),
    },
    organizationId,
  );
}

export type WalletLedgerEntry = {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  direction: 'credit' | 'debit';
  reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
  currency: string | null;
  created_at: string;
};

/** @deprecated Use WalletLedgerEntry */
export type PaymentTransaction = WalletLedgerEntry;

export type TransactionListResponse = {
  data: WalletLedgerEntry[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
};

export async function getPaymentTransactions(params?: {
  page?: number;
  size?: number;
  search?: string;
  type?: string;
  currency?: string;
  sort?: string;
  organizationId?: string;
}): Promise<TransactionListResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.append('page', String(params.page));
  if (params?.size) qs.append('size', String(params.size));
  if (params?.search) qs.append('search', params.search);
  if (params?.type) qs.append('type', params.type);
  if (params?.currency) qs.append('currency', params.currency);
  if (params?.sort) qs.append('sort', params.sort);

  return paymentApiRequest<TransactionListResponse>(
    `/payments/transactions?${qs.toString()}`,
    { method: 'GET' },
    params?.organizationId,
  );
}

export type BillingSetting = {
  org_id: string;
  app_id: string;
  /** null/empty means default in UI; API expects 'default' */
  item_type?: string;
  /** null/empty means default in UI; API expects 'default' */
  item_id?: string;
  currency: string;
  fixed_fee: number;
  percentage_fee: number;
  fixed_cap_fee?: number;
  max_service_fee?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BillingSettingListResponse = {
  data: BillingSetting[];
  total: number;
  page: number;
  limit: number;
};

export type BillingSettingsQuery = {
  page?: number;
  limit?: number;
  size?: number;
  search?: string;
  sort?: string;
  org_id?: string;
  app_id?: string;
  item_type?: string;
  item_id?: string;
  currency?: string;
  is_active?: string;
};

export async function getBillingSettings(
  params?: BillingSettingsQuery,
): Promise<BillingSettingListResponse> {
  const qs = new URLSearchParams();
  const page = params?.page;
  const limit = params?.limit ?? params?.size;

  if (page) qs.append('page', String(page));
  if (limit) qs.append('limit', String(limit));
  if (params?.search) qs.append('search', params.search);
  if (params?.sort) qs.append('sort', params.sort);
  if (params?.org_id) qs.append('org_id', params.org_id);
  if (params?.app_id) qs.append('app_id', params.app_id);
  if (params?.item_type) qs.append('item_type', params.item_type);
  if (params?.item_id) qs.append('item_id', params.item_id);
  if (params?.currency) qs.append('currency', params.currency);
  if (params?.is_active) qs.append('is_active', params.is_active);

  return paymentApiRequest<BillingSettingListResponse>(`/billing/settings?${qs.toString()}`, {}, 'all');
}

export async function getGlobalDefaultBillingSetting(): Promise<BillingSetting | null> {
  // Use 'default' as organizationId for global settings
  return paymentApiRequest<BillingSetting | null>('/billing/settings/global-default', {}, 'default');
}

export async function updateGlobalDefaultBillingSetting(data: Partial<BillingSetting>): Promise<BillingSetting> {
  // Use 'default' as organizationId for global settings
  return paymentApiRequest<BillingSetting>('/billing/settings/global-default', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, 'default');
}

export async function upsertBillingSetting(data: BillingSetting): Promise<BillingSetting> {
  // Use the org_id from data if available, otherwise fallback to current org
  return paymentApiRequest<BillingSetting>('/billing/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  }, data.org_id);
}

export async function updateBillingSetting(
  appId: string,
  itemType: string,
  itemId: string,
  currency: string,
  data: Partial<BillingSetting>,
): Promise<BillingSetting> {
  const orgId = (data as { org_id?: string }).org_id || getActiveOrganizationSlug() || 'default';

  return paymentApiRequest<BillingSetting>(
    `/billing/settings/${encodeURIComponent(appId)}/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}/${encodeURIComponent(currency)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    orgId,
  );
}

export async function deleteBillingSetting(
  orgId: string,
  appId: string,
  itemType: string,
  itemId: string,
  currency: string,
): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('org_id', orgId);
  return paymentApiRequest<void>(
    `/billing/settings/${encodeURIComponent(appId)}/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}/${encodeURIComponent(currency)}?${qs.toString()}`,
    { method: 'DELETE' },
    orgId,
  );
}

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

export type WithdrawalRequest = {
  id: string;
  wallet_id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  bank_info: any;
  payout_details_snapshot: any;
  created_at: string;
  wallet?: {
    currency_code: string;
  };
};

export type WithdrawalListResponse = {
  data: WithdrawalRequest[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
};

export async function listWithdrawalRequests(params?: {
  page?: number;
  size?: number;
  currency?: string;
  status?: string;
  organizationId?: string;
}): Promise<WithdrawalListResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.append('page', String(params.page));
  if (params?.size) qs.append('size', String(params.size));
  if (params?.currency) qs.append('currency', params.currency);
  if (params?.status) qs.append('status', params.status);

  return paymentApiRequest<WithdrawalListResponse>(
    `/wallets/withdrawals?${qs.toString()}`,
    { method: 'GET' },
    params?.organizationId,
  );
}

/**
 * Payment Service API Client
 * Handles payout account integration to bagdja-payment-service
 */

import {
  requireAccessToken,
  getActiveOrganizationId,
  getActiveOrganizationSlug,
  getClientToken,
  isClientTokenExpired,
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
  const userToken = requireAccessToken();

  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const orgSlug = organizationId || getActiveOrganizationSlug();
  if (!orgSlug) {
    throw new Error('Organization is required');
  }

  const orgUuid = getActiveOrganizationId();
  const url = `${getPaymentApiBase()}${endpoint}`;
  // Multipart (FormData): biarkan browser mengisi Content-Type + boundary.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
      if (typeof errorData.code === 'string') error.code = errorData.code;
      if (typeof errorData.remainingAttempts === 'number') {
        error.remainingAttempts = errorData.remainingAttempts;
      }
    } catch {
      error.message = response.statusText || error.message;
    }

    // 401 dari service non-auth TIDAK menghapus token login (29 Okt 2026):
    // bisa berarti guard/izin di service itu, bukan sesi berakhir. Sesi
    // hanya diakhiri oleh 401 dari bagdja-auth (lib/api.ts).

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function paymentApiRequestPersonal<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const clientToken = await ensureClientToken();
  const userToken = requireAccessToken();

  if (!userToken) {
    throw new Error('User not authenticated');
  }

  const url = `${getPaymentApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': clientToken,
    Authorization: `Bearer ${userToken}`,
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
      if (typeof errorData.code === 'string') error.code = errorData.code;
      if (typeof errorData.remainingAttempts === 'number') {
        error.remainingAttempts = errorData.remainingAttempts;
      }
    } catch {
      error.message = response.statusText || error.message;
    }

    // 401 dari service non-auth TIDAK menghapus token login (29 Okt 2026):
    // bisa berarti guard/izin di service itu, bukan sesi berakhir. Sesi
    // hanya diakhiri oleh 401 dari bagdja-auth (lib/api.ts).

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export type PayoutAccount = {
  id: string;
  org_id?: string | null;
  user_id?: string | null;
  currency_code: string;
  payout_method: string;
  account_holder_name: string;
  account_identifier: string;
  bank_name?: string | null;
  /** Kode katalog payout_methods (mis. "BCA"); menentukan channel yang tersedia. */
  method_code?: string | null;
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
  method_code?: string;
  swift_code?: string;
  iban?: string;
  bank_address?: string;
  network?: string;
  provider_name?: string;
  is_verified?: boolean;
  /** OTP email `add_payout_account` untuk isi rekening ini (D14). */
  otpId?: string;
  otpCode?: string;
};

export type UpdatePayoutAccountRequest = Partial<CreatePayoutAccountRequest>;

export type Wallet = {
  id: string;
  org_id: string;
  currency_code: string;
  provider: string;
  balance: number;
  held_balance: number;
  /** Dana withdrawal PENDING/PROCESSING (sudah dipotong dari `balance`). */
  withdrawal_held_balance?: number;
  is_active: boolean;
  activated_at: string | null;
  updated_at: string;
};

export async function listWallets(organizationId?: string): Promise<Wallet[]> {
  return paymentApiRequest<Wallet[]>('/wallets', { method: 'GET' }, organizationId);
}

export async function listUserWallets(): Promise<Wallet[]> {
  return paymentApiRequestPersonal<Wallet[]>('/wallets/me', { method: 'GET' });
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

export async function activateUserWallet(currencyCode: string): Promise<Wallet> {
  return paymentApiRequestPersonal<Wallet>('/wallets/me/activate', {
    method: 'POST',
    body: JSON.stringify({ currencyCode }),
  });
}

export type TopUpResponse = {
  success: boolean;
  checkoutUrl?: string;
  refNumber?: string;
  expiryTime?: string;
};

export async function createOrgTopup(amount: number, currencyCode: string = 'IDR', organizationId?: string): Promise<TopUpResponse> {
  const token = requireAccessToken();
  let userId = '';
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      userId = payload.sub || '';
    } catch (e) {
      console.warn('Could not parse userId from token', e);
    }
  }

  const orgId = organizationId || getActiveOrganizationId();
  if (!orgId) throw new Error('Organization ID is required');

  return paymentApiRequest<TopUpResponse>(
    '/topup/organization',
    {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency:
          currencyCode,
        userId,
        orgId,
        successRedirectUrl: `${window.location.origin}/balance?topup=success`,
        failureRedirectUrl: `${window.location.origin}/balance?topup=failure`,
      }),
    },
    orgId,
  );
}

export async function createPersonalTopup(amount: number, currencyCode: string = 'IDR'): Promise<TopUpResponse> {
  const token = requireAccessToken();
  let userId = '';
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      userId = payload.sub || '';
    } catch (e) {
      console.warn('Could not parse userId from token', e);
    }
  }

  return paymentApiRequestPersonal<TopUpResponse>('/topup/personal', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      amount,
      currency: currencyCode,
      successRedirectUrl: `${window.location.origin}/balance?topup=success`,
      failureRedirectUrl: `${window.location.origin}/balance?topup=failure`,
    }),
  });
}

export type WalletLedgerEntry = {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  direction: 'credit' | 'debit';
  reference_id?: string | null;
  external_id?: string | null;
  description?: string | null;
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
  ownerType?: 'organization' | 'personal';
}): Promise<TransactionListResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.append('page', String(params.page));
  if (params?.size) qs.append('size', String(params.size));
  if (params?.search) qs.append('search', params.search);
  if (params?.type) qs.append('type', params.type);
  if (params?.currency) qs.append('currency', params.currency);
  if (params?.sort) qs.append('sort', params.sort);
  if (params?.ownerType) qs.append('ownerType', params.ownerType);

  if (params?.ownerType === 'personal') {
    return paymentApiRequestPersonal<TransactionListResponse>(
      `/payments/transactions?${qs.toString()}`,
      { method: 'GET' },
    );
  }

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
  ownerType?: PayoutAccountOwnerType;
  ownerId?: string;
  organizationId?: string;
}): Promise<PayoutAccountListResponse> {
  const page = params?.page ?? 1;
  const size = params?.size ?? 20;
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (params?.ownerType) qs.set('ownerType', params.ownerType);
  if (params?.ownerId) qs.set('ownerId', params.ownerId);
  return paymentApiRequest<PayoutAccountListResponse>(`/payout-accounts/get?${qs.toString()}`, { method: 'GET' }, params?.organizationId);
}

export type PayoutAccountOwnerType = 'organization' | 'personal';

/**
 * Rekening personal vs organisasi (29 Okt 2026) — payment-service memisahkan
 * keduanya; `ownerType` dikirim lewat query (dibaca sebelum body). Tanpa
 * ownerType = rekening organisasi aktif.
 */
function ownerTypeQuery(ownerType?: PayoutAccountOwnerType): string {
  return ownerType ? `?ownerType=${ownerType}` : '';
}

export async function createPayoutAccount(
  data: CreatePayoutAccountRequest,
  organizationId?: string,
  ownerType?: PayoutAccountOwnerType,
): Promise<PayoutAccount> {
  return paymentApiRequest<PayoutAccount>(
    `/payout-account${ownerTypeQuery(ownerType)}`,
    { method: 'POST', body: JSON.stringify(data) },
    organizationId,
  );
}

export async function getPayoutAccountById(
  id: string,
  organizationId?: string,
  ownerType?: PayoutAccountOwnerType,
): Promise<PayoutAccount> {
  return paymentApiRequest<PayoutAccount>(
    `/payout-account/${encodeURIComponent(id)}${ownerTypeQuery(ownerType)}`,
    { method: 'GET' },
    organizationId,
  );
}

export async function updatePayoutAccount(
  id: string,
  data: UpdatePayoutAccountRequest,
  organizationId?: string,
  ownerType?: PayoutAccountOwnerType,
): Promise<PayoutAccount> {
  return paymentApiRequest<PayoutAccount>(
    `/payout-account/${encodeURIComponent(id)}${ownerTypeQuery(ownerType)}`,
    { method: 'PUT', body: JSON.stringify(data) },
    organizationId,
  );
}

export type WithdrawalRequest = {
  id: string;
  wallet_id: string;
  org_id?: string | null;
  user_id?: string | null;
  app_id?: string;
  provider?: string;
  provider_reference_id?: string;
  /** Nominal yang ditarik dari saldo (sebelum biaya). */
  amount: number;
  /** Biaya channel, dipotong dari `amount`. */
  fee_amount?: number;
  /** Nominal yang diterima rekening tujuan: amount - fee_amount. */
  net_amount?: number;
  /** Kode metode tujuan (katalog payout_methods), mis. "BCA". */
  method?: string | null;
  payout_method_fee_id?: string | null;
  requested_by?: string | null;
  cancelled_at?: string | null;
  status:
    | 'PENDING'
    | 'PROCESSING'
    | 'PAID'
    | 'COMPLETED'
    | 'FAILED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'APPROVED';
  rejection_reason?: string;
  /** Bukti lama berupa URL publik; bukti baru privat (lihat has_proof). */
  proof_url?: string;
  /** Ada bukti transfer — ambil link lewat getWithdrawalProofUrl(). */
  has_proof?: boolean;
  bank_info: any;
  /** Hanya pada respons admin (ownerType=all, approve, reject). */
  payout_details_snapshot?: any;
  status_history?: any[];
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
  wallet?: {
    currency_code: string;
    org_id?: string | null;
    user_id?: string | null;
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

export interface CreateWithdrawalPayload {
  ownerType?: 'organization' | 'personal';
  appId?: string;
  /** Channel pilihan dari GET /wallets/withdrawals/channels (opsional). */
  payoutMethodFeeId?: string;
  amount: number;
  currency?: string;
  payoutAccountId: string;
  description?: string;
  /** PIN wallet pengaju (D14/D19). */
  pin?: string;
}

export async function createWithdrawalRequest(
  payload: CreateWithdrawalPayload,
  organizationId?: string,
): Promise<WithdrawalRequest> {
  return paymentApiRequest<WithdrawalRequest>(
    '/wallets/withdrawals',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    organizationId,
  );
}

/**
 * Upload bukti transfer (admin finance org sistem). payment-service menyimpan
 * file PRIVAT di storage-service dan menautkannya ke withdrawal (29 Okt 2026).
 */
export async function uploadWithdrawalProof(
  id: string,
  file: File,
  organizationId?: string,
): Promise<WithdrawalRequest> {
  const formData = new FormData();
  formData.append('file', file);
  return paymentApiRequest<WithdrawalRequest>(
    `/wallets/withdrawals/${encodeURIComponent(id)}/proof`,
    { method: 'POST', body: formData },
    organizationId,
  );
}

/**
 * Link bukti transfer berumur pendek (presigned, 10 menit). Ambil saat akan
 * dibuka, jangan disimpan. `all` = admin org sistem (view-all).
 */
export async function getWithdrawalProofUrl(
  id: string,
  ownerType: WithdrawalOwnerType | 'all',
  organizationId?: string,
): Promise<{ url: string; expires_at: string | null }> {
  return paymentApiRequest<{ url: string; expires_at: string | null }>(
    `/wallets/withdrawals/${encodeURIComponent(id)}/proof-url?ownerType=${ownerType}`,
    { method: 'GET' },
    organizationId,
  );
}

export async function approveWithdrawalRequest(
  id: string,
  payload: {
    adminNotes?: string;
    proofUrl?: string;
    providerReferenceId?: string;
  },
  organizationId?: string,
): Promise<WithdrawalRequest> {
  return paymentApiRequest<WithdrawalRequest>(
    `/wallets/withdrawals/${id}/approve`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    organizationId,
  );
}

export async function rejectWithdrawalRequest(
  id: string,
  payload: { reason: string },
  organizationId?: string,
): Promise<WithdrawalRequest> {
  return paymentApiRequest<WithdrawalRequest>(
    `/wallets/withdrawals/${id}/reject`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    organizationId,
  );
}

export async function listWithdrawalRequests(params?: {
  page?: number;
  size?: number;
  currency?: string;
  status?: string;
  ownerType?: string;
  /** Filter tambahan; `filterOrgId` hanya berlaku untuk ownerType=all. */
  provider?: string;
  filterOrgId?: string;
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
}): Promise<WithdrawalListResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.append('page', String(params.page));
  if (params?.size) qs.append('size', String(params.size));
  if (params?.currency) qs.append('currency', params.currency);
  if (params?.status) qs.append('status', params.status);
  if (params?.ownerType) qs.append('ownerType', params.ownerType);
  if (params?.provider) qs.append('provider', params.provider);
  if (params?.filterOrgId) qs.append('filterOrgId', params.filterOrgId);
  if (params?.dateFrom) qs.append('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.append('dateTo', params.dateTo);

  return paymentApiRequest<WithdrawalListResponse>(
    `/wallets/withdrawals?${qs.toString()}`,
    { method: 'GET' },
    params?.organizationId,
  );
}

export type AppPaymentMethodSetting = {
  id: string;
  provider: string;
  method: string;
  fixedFee: number;
  percentageFee: number;
  currency: string;
  orgId: string;
  appId: string;
  isActive: boolean;
  isEnabledForApp: boolean;
};

export async function listAppPaymentMethodSettings(
  appId: string,
  organizationId?: string,
): Promise<AppPaymentMethodSetting[]> {
  const qs = new URLSearchParams({ appId });
  return paymentApiRequest<AppPaymentMethodSetting[]>(
    `/app-payment-method-settings/available?${qs.toString()}`,
    { method: 'GET' },
    organizationId,
  );
}

export async function setAppPaymentMethodSetting(
  paymentMethodFeeId: string,
  appId: string,
  isEnabled: boolean,
  organizationId?: string,
): Promise<void> {
  return paymentApiRequest<void>(
    `/app-payment-method-settings/${encodeURIComponent(paymentMethodFeeId)}`,
    { method: 'PATCH', body: JSON.stringify({ appId, isEnabled }) },
    organizationId,
  );
}

// ---------------------------------------------------------------------------
// Payout channels & withdrawal (refactor-payout-flow-plan.md §4.6, §5)
// ---------------------------------------------------------------------------

export type WithdrawalOwnerType = 'organization' | 'personal';

export type WithdrawalChannel = {
  /** Dikirim sebagai `payoutMethodFeeId` saat membuat withdrawal. */
  id: string;
  provider: string;
  methodCode: string;
  estimatedTime: string | null;
  priority: number;
  minAmount: number | null;
  maxAmount: number | null;
  feeAmount: number;
  /** Nominal yang diterima rekening: amount - feeAmount. */
  netAmount: number;
  eligible: boolean;
  reason: string | null;
};

export async function getWithdrawalChannels(
  params: {
    payoutAccountId: string;
    amount: number;
    currency?: string;
    ownerType: WithdrawalOwnerType;
    appId?: string;
  },
  organizationId?: string,
): Promise<WithdrawalChannel[]> {
  const qs = new URLSearchParams({
    payoutAccountId: params.payoutAccountId,
    amount: String(params.amount || 0),
    ownerType: params.ownerType,
  });
  if (params.currency) qs.append('currency', params.currency);
  if (params.appId) qs.append('appId', params.appId);
  return paymentApiRequest<WithdrawalChannel[]>(
    `/wallets/withdrawals/channels?${qs.toString()}`,
    { method: 'GET' },
    organizationId,
  );
}

export type WithdrawalSummary = {
  processingCount: number;
  processingAmount: number;
  paidThisMonth: number;
  /** Total PAID sepanjang waktu. */
  paidTotal: number;
};

export async function getWithdrawalSummary(
  ownerType: WithdrawalOwnerType,
  currency?: string,
  organizationId?: string,
): Promise<WithdrawalSummary> {
  const qs = new URLSearchParams({ ownerType });
  if (currency) qs.append('currency', currency);
  return paymentApiRequest<WithdrawalSummary>(
    `/wallets/withdrawals/summary?${qs.toString()}`,
    { method: 'GET' },
    organizationId,
  );
}

export async function cancelWithdrawalRequest(
  id: string,
  ownerType: WithdrawalOwnerType,
  organizationId?: string,
): Promise<WithdrawalRequest> {
  const qs = new URLSearchParams({ ownerType });
  return paymentApiRequest<WithdrawalRequest>(
    `/wallets/withdrawals/${encodeURIComponent(id)}/cancel?${qs.toString()}`,
    { method: 'POST' },
    organizationId,
  );
}

export type PayoutMethodType = 'bank' | 'ewallet';

export type PayoutMethod = {
  code: string;
  name: string;
  methodType: PayoutMethodType;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PayoutMethodPayload = {
  code?: string;
  name?: string;
  methodType?: PayoutMethodType;
  currency?: string;
  isActive?: boolean;
};

/** Metode tujuan aktif (untuk form rekening). */
export async function listPayoutMethods(currency?: string): Promise<PayoutMethod[]> {
  const qs = currency ? `?${new URLSearchParams({ currency }).toString()}` : '';
  return paymentApiRequest<PayoutMethod[]>(`/payout-methods${qs}`, { method: 'GET' });
}

/** Semua metode termasuk nonaktif (admin). */
export async function listAllPayoutMethods(): Promise<PayoutMethod[]> {
  return paymentApiRequest<PayoutMethod[]>('/payout-methods/all', { method: 'GET' });
}

export async function createPayoutMethod(payload: PayoutMethodPayload): Promise<PayoutMethod> {
  return paymentApiRequest<PayoutMethod>('/payout-methods', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePayoutMethod(
  code: string,
  payload: PayoutMethodPayload,
): Promise<PayoutMethod> {
  return paymentApiRequest<PayoutMethod>(`/payout-methods/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type PayoutProvider = 'manual' | 'midtrans' | 'duitku';

export type PayoutMethodFee = {
  id: string;
  provider: PayoutProvider | string;
  methodCode: string;
  providerMethodCode: string | null;
  fixedFee: number;
  percentageFee: number;
  minFee: number | null;
  maxFee: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  providerCost: number | null;
  estimatedTime: string | null;
  priority: number;
  currency: string;
  orgId: string;
  appId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PayoutMethodFeePayload = Partial<
  Omit<PayoutMethodFee, 'id' | 'createdAt' | 'updatedAt'>
>;

export type PayoutMethodFeeListResponse = {
  data: PayoutMethodFee[];
  total: number;
  page: number;
  limit: number;
};

export async function listPayoutMethodFees(params?: {
  page?: number;
  limit?: number;
  provider?: string;
  methodCode?: string;
  currency?: string;
  orgId?: string;
  appId?: string;
  isActive?: string;
}): Promise<PayoutMethodFeeListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') qs.append(key, String(value));
  });
  const query = qs.toString();
  return paymentApiRequest<PayoutMethodFeeListResponse>(
    `/payout-method-fees${query ? `?${query}` : ''}`,
    { method: 'GET' },
  );
}

export async function createPayoutMethodFee(
  payload: PayoutMethodFeePayload,
): Promise<PayoutMethodFee> {
  return paymentApiRequest<PayoutMethodFee>('/payout-method-fees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePayoutMethodFee(
  id: string,
  payload: PayoutMethodFeePayload,
): Promise<PayoutMethodFee> {
  return paymentApiRequest<PayoutMethodFee>(
    `/payout-method-fees/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function deletePayoutMethodFee(id: string): Promise<void> {
  return paymentApiRequest<void>(`/payout-method-fees/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export type AppPayoutChannel = PayoutMethodFee & { isEnabledForApp: boolean };

export async function listAppPayoutChannels(
  appId: string,
  organizationId?: string,
): Promise<AppPayoutChannel[]> {
  const qs = new URLSearchParams({ appId });
  return paymentApiRequest<AppPayoutChannel[]>(
    `/app-payout-method-settings/available?${qs.toString()}`,
    { method: 'GET' },
    organizationId,
  );
}

export async function setAppPayoutChannel(
  payoutMethodFeeId: string,
  appId: string,
  isEnabled: boolean,
  organizationId?: string,
): Promise<void> {
  return paymentApiRequest<void>(
    `/app-payout-method-settings/${encodeURIComponent(payoutMethodFeeId)}`,
    { method: 'PATCH', body: JSON.stringify({ appId, isEnabled }) },
    organizationId,
  );
}

// ---------------------------------------------------------------------------
// PIN & OTP wallet (D14/D19) — satu PIN per user, dikelola di pay-web.
// ---------------------------------------------------------------------------

export type WalletPinStatus = {
  hasPin: boolean;
  lockedUntil: string | null;
  spendBlockedUntil: string | null;
};

export async function getWalletPinStatus(): Promise<WalletPinStatus> {
  return paymentApiRequestPersonal<WalletPinStatus>('/wallets/pin/status', { method: 'GET' });
}

/** Isi rekening yang disetujui lewat OTP — harus sama persis dengan yang disimpan. */
export type PayoutAccountOtpPayload = {
  currency_code: string;
  payout_method: string;
  method_code?: string;
  bank_name?: string;
  account_identifier: string;
  account_holder_name: string;
};

export type WalletOtpRequested = {
  otpId: string;
  expiresAt: string;
  resendAvailableAt: string;
  maskedEmail: string;
};

export async function requestPayoutAccountOtp(
  payload: PayoutAccountOtpPayload,
): Promise<WalletOtpRequested> {
  return paymentApiRequestPersonal<WalletOtpRequested>('/wallets/otp', {
    method: 'POST',
    body: JSON.stringify({ purpose: 'add_payout_account', payload }),
  });
}

/** Halaman pay-web untuk buat / ubah / lupa PIN, kembali ke halaman console ini. */
export function walletPinPageUrl(returnUrl: string, mode?: 'forgot'): string {
  const payWeb = (process.env.NEXT_PUBLIC_PAY_WEB_URL || 'http://localhost:3010').replace(/\/$/, '');
  const params = new URLSearchParams({ returnUrl });
  if (process.env.NEXT_PUBLIC_CLIENT_APP_ID) params.set('client_id', process.env.NEXT_PUBLIC_CLIENT_APP_ID);
  if (mode) params.set('mode', mode);
  return `${payWeb}/wallet/pin?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Hosted withdraw pay-web (D10): dompet personal menarik dana lewat pay-web.
// ---------------------------------------------------------------------------

export type WithdrawalSessionCreated = { sessionToken: string; url: string; expiresAt: string };

export async function createWithdrawalSession(params: {
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<WithdrawalSessionCreated> {
  return paymentApiRequestPersonal<WithdrawalSessionCreated>('/wallets/withdrawal-sessions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ---------------------------------------------------------------------------
// Akses wallet org (D18): owner memberi anggota izin belanja dengan batas.
// ---------------------------------------------------------------------------

export type OrgWalletSpendGrant = {
  id: string;
  walletId: string;
  orgId: string;
  userId: string;
  perTransactionLimit: number | null;
  monthlyLimit: number | null;
  monthlyUsed: number;
  isActive: boolean;
  grantedBy: string;
  updatedAt: string;
};

export type OrgWalletSpendLimits = {
  perTransactionLimit?: number | null;
  monthlyLimit?: number | null;
};

export type OrgWalletMemberUsage = {
  monthlyUsed: number;
  monthStart: string;
  transactions: { id: string; amount: number; type: string; description: string | null; created_at: string }[];
};

export async function listOrgWalletSpendGrants(walletId: string): Promise<OrgWalletSpendGrant[]> {
  return paymentApiRequestPersonal<OrgWalletSpendGrant[]>(
    `/wallets/${encodeURIComponent(walletId)}/spend-grants`,
    { method: 'GET' },
  );
}

export async function upsertOrgWalletSpendGrant(
  walletId: string,
  userId: string,
  limits: OrgWalletSpendLimits,
): Promise<OrgWalletSpendGrant> {
  return paymentApiRequestPersonal<OrgWalletSpendGrant>(
    `/wallets/${encodeURIComponent(walletId)}/spend-grants/${encodeURIComponent(userId)}`,
    { method: 'PUT', body: JSON.stringify(limits) },
  );
}

export async function updateOrgWalletSpendGrant(
  walletId: string,
  userId: string,
  changes: OrgWalletSpendLimits & { isActive?: boolean },
): Promise<OrgWalletSpendGrant> {
  return paymentApiRequestPersonal<OrgWalletSpendGrant>(
    `/wallets/${encodeURIComponent(walletId)}/spend-grants/${encodeURIComponent(userId)}`,
    { method: 'PATCH', body: JSON.stringify(changes) },
  );
}

export async function revokeOrgWalletSpendGrant(
  walletId: string,
  userId: string,
): Promise<OrgWalletSpendGrant> {
  return paymentApiRequestPersonal<OrgWalletSpendGrant>(
    `/wallets/${encodeURIComponent(walletId)}/spend-grants/${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
}

export async function getOrgWalletMemberUsage(
  walletId: string,
  userId: string,
): Promise<OrgWalletMemberUsage> {
  return paymentApiRequestPersonal<OrgWalletMemberUsage>(
    `/wallets/${encodeURIComponent(walletId)}/spend-grants/${encodeURIComponent(userId)}/usage`,
    { method: 'GET' },
  );
}

/**
 * Escrow Dispute API Client
 * Order Handling Phase 2 (plan/website-builder/order-hanlde-plan.md, §2 D1,
 * revisi 2026-08-23) — dispute di sebuah escrow adalah urusan APP OWNER
 * (siapa yang punya app_id itu di bagdja-console — bisa developer eksternal,
 * bukan cuma Bagdja sendiri), BUKAN platform/CS lintas app. Karena itu daftar
 * dispute & tombol cabut dispute ditaruh sebagai tab "Sengketa" di halaman
 * detail app milik owner (`applications/owned/[id]`), di-scope ke `app_id`
 * app itu saja — TIDAK ada view lintas-app global di infrastructure/*.
 *
 * bagdja-console tetap autentikasi sebagai `user-console` (core service) ke
 * payment-service — itu cuma mekanisme AUTH (supaya bisa akses escrow milik
 * app manapun tanpa perlu client credentials app itu sendiri), BUKAN berarti
 * datanya ditampilkan lintas app ke user. Scoping ke 1 app dilakukan di sisi
 * QUERY (`app_id` param) dan HARUS selalu diisi dari app yang sedang dibuka.
 *
 * `bagdja-payment-service` `/escrow` — response entity mentah dari
 * `EscrowService.mapDetail()`, jadi (BEDA dari escrow-fee-configs-api.ts)
 * SNAKE_CASE: app_id, org_id, amount_total, dst.
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

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: CLIENT_APP_ID, app_secret: CLIENT_APP_SECRET }),
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

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const url = `${getPaymentApiBase()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-token': clientToken,
    'x-api-key': clientToken,
    ...(options.headers as Record<string, string>),
  };
  if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

  const response = await fetch(url, { ...options, headers, cache: options.cache || 'no-store' });

  if (!response.ok) {
    const error: ApiError = { message: 'An error occurred', statusCode: response.status };
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

  if (response.status === 204) return undefined as T;
  return response.json();
}

export interface EscrowMilestoneDetail {
  id: string;
  sequence: number;
  label: string;
  description: string | null;
  amount: number;
  status: string;
  release_window_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
}

export interface EscrowDetail {
  id: string;
  app_id: string;
  org_id: string;
  product_id: string;
  external_item_id: string | null;
  buyer_wallet_id: string;
  seller_wallet_id: string;
  payment_request_id: string | null;
  currency: string;
  amount_total: number;
  amount_held: number;
  amount_released: number;
  amount_refunded: number;
  remaining_hold: number;
  status: string;
  resolution_type: string | null;
  frozen_at: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  milestones: EscrowMilestoneDetail[];
}

/**
 * List escrow yang sedang DISPUTED milik SATU app (`app_id` wajib — lihat
 * catatan file ini kenapa tidak ada mode lintas-app). `app_id` cuma
 * di-hormati kalau caller adalah core service, lihat
 * `EscrowService.listEscrows()` di bagdja-payment-service.
 */
export async function listDisputedEscrows(params: {
  appId: string;
  page?: number;
  size?: number;
}): Promise<{ data: EscrowDetail[]; meta: { page: number; size: number; total: number; totalPages: number } }> {
  const qs = new URLSearchParams({ status: 'DISPUTED', app_id: params.appId });
  if (params.page) qs.set('page', String(params.page));
  if (params.size) qs.set('size', String(params.size));
  return apiRequest(`/escrow?${qs.toString()}`);
}

/** Wallet mentah dari payment-service — dipakai resolve `buyer_wallet_id -> user_id` untuk identitas pembeli. */
export interface WalletDetail {
  id: string;
  org_id: string | null;
  user_id: string | null;
  currency_code: string;
  balance: number;
  held_balance: number;
}

export async function getWalletById(walletId: string): Promise<WalletDetail> {
  return apiRequest<WalletDetail>(`/wallets/${encodeURIComponent(walletId)}`);
}

/**
 * Cabut dispute (DISPUTED -> HELD) — app owner "menolak" komplain buyer
 * (atau kasusnya sudah selesai di luar sistem, mis. lewat WhatsApp/CS
 * manual). `note` opsional, tersimpan di `escrow_events.metadata` untuk
 * audit trail (lihat `UnfreezeEscrowDto`).
 */
export async function unfreezeEscrow(escrowId: string, note?: string): Promise<EscrowDetail> {
  return apiRequest<EscrowDetail>(`/escrow/${encodeURIComponent(escrowId)}/unfreeze`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

/**
 * Force release 1 milestone ke seller — dipakai app owner saat komplain
 * buyer terbukti tidak valid (mis. ada bukti pengiriman) tapi buyer menolak
 * konfirmasi terima barang sendiri. Payment-service mensyaratkan escrow
 * `HELD` untuk release (bukan `DISPUTED`), jadi kalau escrow masih
 * disengketakan, unfreeze DULU baru release — lihat `forceReleaseDispute()`
 * di bawah yang menggabungkan kedua langkah itu jadi satu aksi.
 */
export async function releaseMilestone(
  escrowId: string,
  milestoneId: string,
  note?: string,
): Promise<EscrowDetail> {
  return apiRequest<EscrowDetail>(
    `/escrow/${encodeURIComponent(escrowId)}/release-milestone/${encodeURIComponent(milestoneId)}`,
    { method: 'POST', body: JSON.stringify(note ? { note } : {}) },
  );
}

/**
 * Force refund pembeli — dipakai app owner saat komplain buyer terbukti
 * valid (mis. barang tidak sampai) tapi seller tidak/menolak me-refund
 * lewat aksi mereka sendiri (bagdja-website-admin). Refund penuh sisa hold
 * (tanpa `milestone_id`) — cocok untuk escrow 1-milestone. Payment-service
 * TIDAK mensyaratkan HELD untuk ini — bisa langsung dari status DISPUTED.
 */
export async function refundEscrow(escrowId: string, note?: string): Promise<EscrowDetail> {
  return apiRequest<EscrowDetail>(`/escrow/${encodeURIComponent(escrowId)}/refund`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

/**
 * Force release "compound" — unfreeze (DISPUTED -> HELD) lalu release
 * milestone PENDING pertama. Escrow builder Website selalu 1 milestone jadi
 * tidak perlu buyer pilih; kalau nanti ada app lain multi-milestone, ini
 * cuma ambil yang paling awal.
 */
export async function forceReleaseDispute(escrow: EscrowDetail, note: string): Promise<EscrowDetail> {
  await unfreezeEscrow(escrow.id, note);
  const milestone = escrow.milestones.find((m) => m.status === 'PENDING' || m.status === 'FROZEN');
  if (!milestone) {
    throw new Error('No releasable milestone found on this escrow');
  }
  return releaseMilestone(escrow.id, milestone.id, note);
}

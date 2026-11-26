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
 * Sejak P2 batch 2 (plan/architecture/core-service-flag-removal-plan.md)
 * memakai endpoint Console berbasis USER
 * `/console/apps/:appId/escrow/disputes` + header `x-organization-id` = org
 * pemilik App. Service mengecek keanggotaan org, permission
 * `payment.escrow-disputes.manage`, dan kepemilikan App — tanpa token core.
 *
 * Response dari `EscrowService.mapDetail()` → SNAKE_CASE (BEDA dari
 * escrow-fee-configs-api.ts): app_id, org_id, amount_total, dst.
 */

import { paymentConsoleRequest } from './console-user-api';

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
}

/** Ringkasan wallet pembeli — `user_id` dipakai mencari identitas di bagdja-auth. */
export interface BuyerWalletSummary {
  id: string;
  user_id: string | null;
  org_id: string | null;
}

export interface DisputedEscrow extends EscrowDetail {
  /** `null` bila wallet pembeli tidak ditemukan. */
  buyer_wallet: BuyerWalletSummary | null;
}

export interface DisputeListResponse {
  data: DisputedEscrow[];
  meta: { page: number; size: number; total: number; totalPages: number };
}

/** Scope satu App milik org user. */
export interface AppScope {
  orgId: string;
  appId: string;
}

function disputeRequest<T>(scope: AppScope, path: string, options: RequestInit = {}): Promise<T> {
  return paymentConsoleRequest<T>(`/apps/${encodeURIComponent(scope.appId)}/escrow/disputes${path}`, {
    ...options,
    headers: {
      'x-organization-id': scope.orgId,
      ...(options.headers as Record<string, string>),
    },
  });
}

/** Daftar escrow DISPUTED milik SATU App (terbaru dulu), dengan ringkasan wallet pembeli. */
export async function listDisputedEscrows(
  scope: AppScope,
  params?: { page?: number; size?: number },
): Promise<DisputeListResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.size) qs.set('size', String(params.size));
  const query = qs.toString();
  return disputeRequest<DisputeListResponse>(scope, query ? `?${query}` : '');
}

/**
 * Cabut dispute (DISPUTED -> HELD) — app owner "menolak" komplain buyer
 * (atau kasusnya sudah selesai di luar sistem, mis. lewat WhatsApp/CS
 * manual). `note` opsional, tersimpan di `escrow_events.metadata` untuk
 * audit trail.
 */
export async function unfreezeEscrow(scope: AppScope, escrowId: string, note?: string): Promise<EscrowDetail> {
  return disputeRequest<EscrowDetail>(scope, `/${encodeURIComponent(escrowId)}/unfreeze`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

/**
 * Force refund pembeli — dipakai app owner saat komplain buyer terbukti
 * valid (mis. barang tidak sampai) tapi seller tidak/menolak me-refund
 * lewat aksi mereka sendiri (bagdja-website-admin). Refund penuh sisa hold
 * (tanpa `amount`); boleh langsung dari status DISPUTED.
 */
export async function refundEscrow(
  scope: AppScope,
  escrowId: string,
  clientRefNumber: string,
  note?: string,
): Promise<EscrowDetail> {
  return disputeRequest<EscrowDetail>(scope, `/${encodeURIComponent(escrowId)}/refund`, {
    method: 'POST',
    body: JSON.stringify({ clientRefNumber, ...(note ? { note } : {}) }),
  });
}

/**
 * Force release remaining held funds after resolving a dispute:
 * cabut dispute dulu, lalu release seluruh sisa hold ke penjual.
 */
export async function forceReleaseDispute(scope: AppScope, escrow: EscrowDetail, note: string): Promise<unknown> {
  await unfreezeEscrow(scope, escrow.id, note);
  const amount = Number(escrow.amount_held);
  if (amount <= 0) {
    throw new Error('No held amount remains to release');
  }
  const clientRefNumber = `console-dispute-release:${escrow.id}:${escrow.amount_released}:${amount}`;
  return disputeRequest(scope, `/${encodeURIComponent(escrow.id)}/release`, {
    method: 'POST',
    body: JSON.stringify({ amount, clientRefNumber, reference: clientRefNumber, note }),
  });
}

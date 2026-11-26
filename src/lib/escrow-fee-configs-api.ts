/**
 * Escrow Fee Config API Client
 * Config fee escrow (`bagdja-payment-service`) — potongan platform_fee/app_fee
 * saat release escrow. Semua lewat endpoint Console berbasis USER (P2,
 * plan/architecture/core-service-flag-removal-plan.md), tanpa token core:
 * - Platform (org sistem): `/console/escrow/fee-configs`.
 * - Pemilik App: `/console/apps/:appId/escrow/fee-configs` + header
 *   `x-organization-id` = org pemilik App. Field `platform_*` diabaikan
 *   service di jalur ini.
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

import { paymentConsoleRequest } from './console-user-api';

export type EscrowFeeConfig = {
  id: string;
  orgId: string;
  appId: string;
  productId: string | null;
  platformFixedFee: number;
  platformPercentageFee: number;
  /** Floor untuk platform_fee — lihat rumus clamp di payment-service (2026-08-26). */
  platformMinimumFee: number;
  /** Cap untuk platform_fee. `null` = tidak ada cap. */
  platformMaximumFee: number | null;
  /** Ambang bebas-fee KHUSUS platform_fee — di bawah nilai ini, platform_fee = 0. */
  platformMinimumTransactionAmount: number;
  appFixedFee: number;
  appPercentageFee: number;
  /** Floor untuk app_fee — lihat rumus clamp di payment-service (2026-08-26). */
  appMinimumFee: number;
  /** Cap untuk app_fee. `null` = tidak ada cap. */
  appMaximumFee: number | null;
  /** Ambang bebas-fee KHUSUS app_fee — di bawah nilai ini, app_fee = 0. */
  appMinimumTransactionAmount: number;
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
  platform_minimum_fee?: number;
  /** `null` = hapus cap. */
  platform_maximum_fee?: number | null;
  platform_minimum_transaction_amount?: number;
  app_fixed_fee?: number;
  app_percentage_fee?: number;
  app_minimum_fee?: number;
  /** `null` = hapus cap. */
  app_maximum_fee?: number | null;
  app_minimum_transaction_amount?: number;
  is_active?: boolean;
};

function feeConfigQuery(params?: { product_id?: string; is_active?: boolean }): string {
  const qs = new URLSearchParams();
  if (params?.product_id) qs.append('product_id', params.product_id);
  if (typeof params?.is_active === 'boolean') qs.append('is_active', String(params.is_active));
  const query = qs.toString();
  return query ? `?${query}` : '';
}

function appScope(orgId: string, appId: string): { path: string; headers: Record<string, string> } {
  return {
    path: `/apps/${encodeURIComponent(appId)}/escrow/fee-configs`,
    headers: { 'x-organization-id': orgId },
  };
}

/**
 * Config fee escrow yang berlaku untuk SATU App (pemilik App): baris
 * (org, App, *) + fallback (org, default) dan (default, default) — cukup
 * untuk `resolveEffectiveFeeConfig`. Butuh `payment.escrow-fee-configs.manage`
 * di org pemilik App.
 */
export async function listAppEscrowFeeConfigs(
  orgId: string,
  appId: string,
  params?: { product_id?: string; is_active?: boolean },
): Promise<EscrowFeeConfig[]> {
  const { path, headers } = appScope(orgId, appId);
  return paymentConsoleRequest<EscrowFeeConfig[]>(`${path}${feeConfigQuery(params)}`, { headers });
}

/**
 * Set/update Fee App untuk App milik user (opsional per produk). Scope
 * selalu (org pemilik, App ini); `platform_*` diabaikan service — baris
 * baru mewarisi Fee Platform yang sedang berlaku.
 */
export async function upsertAppEscrowFeeConfig(
  orgId: string,
  appId: string,
  data: UpsertEscrowFeeConfigRequest,
): Promise<EscrowFeeConfig> {
  const { path, headers } = appScope(orgId, appId);
  return paymentConsoleRequest<EscrowFeeConfig>(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
}

/**
 * Daftar SEMUA config fee escrow (semua scope) — Infrastructure → Payment
 * Config. Jalur Console berbasis user (`/console/escrow/fee-configs`, P2):
 * butuh org sistem + `console.infra.payment-config.view`.
 */
export async function listPlatformEscrowFeeConfigs(params?: {
  product_id?: string;
  is_active?: boolean;
}): Promise<EscrowFeeConfig[]> {
  return paymentConsoleRequest<EscrowFeeConfig[]>(`/escrow/fee-configs${feeConfigQuery(params)}`);
}

/**
 * Set/update config fee escrow untuk scope mana pun, termasuk global
 * `default` — butuh org sistem + `console.infra.payment-config.manage`.
 */
export async function upsertPlatformEscrowFeeConfig(
  data: UpsertEscrowFeeConfigRequest,
): Promise<EscrowFeeConfig> {
  return paymentConsoleRequest<EscrowFeeConfig>('/escrow/fee-configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

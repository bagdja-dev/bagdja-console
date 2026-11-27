/**
 * Escrow Products API Client
 * Handles all API calls related to Escrow Products (`bagdja-payment-service`
 * `/escrow-products`) — katalog/policy per app untuk item yang dijual via
 * escrow. Terpisah dari `products-api.ts` (katalog jualan generik).
 */

import { paymentAppRequest, paymentConsoleRequest, type AppScope } from './console-user-api';
import type { EscrowProduct, CreateEscrowProductRequest, UpdateEscrowProductRequest } from '@/types';

/*
 * Lewat endpoint `/console/*` berbasis token user — tanpa token client
 * (core-service-flag-removal-plan.md P5.4):
 * - pemilik App: `/console/apps/:appId/escrow-products`;
 * - org sistem: `/console/catalog/escrow-products?appId=` (read-only).
 */

function activeQuery(isActive?: boolean): string {
  return typeof isActive === 'boolean' ? `is_active=${isActive}` : '';
}

/** Escrow product satu App, sebagai anggota org pemilik App. */
export async function getEscrowProducts(app: AppScope, isActive?: boolean): Promise<EscrowProduct[]> {
  const qs = activeQuery(isActive);
  return paymentAppRequest<EscrowProduct[]>(app, `/escrow-products${qs ? `?${qs}` : ''}`);
}

/** Escrow product App mana pun, untuk org sistem (Infrastructure). */
export async function getPlatformEscrowProducts(appId: string, isActive?: boolean): Promise<EscrowProduct[]> {
  const qs = [`appId=${encodeURIComponent(appId)}`, activeQuery(isActive)].filter(Boolean).join('&');
  return paymentConsoleRequest<EscrowProduct[]>(`/catalog/escrow-products?${qs}`);
}

export async function createEscrowProduct(app: AppScope, data: CreateEscrowProductRequest): Promise<EscrowProduct> {
  return paymentAppRequest<EscrowProduct>(app, '/escrow-products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEscrowProduct(
  app: AppScope,
  id: string,
  data: UpdateEscrowProductRequest,
): Promise<EscrowProduct> {
  return paymentAppRequest<EscrowProduct>(app, `/escrow-products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteEscrowProduct(app: AppScope, id: string): Promise<void> {
  return paymentAppRequest<void>(app, `/escrow-products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

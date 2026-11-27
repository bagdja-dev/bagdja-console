/**
 * Licenses API Client
 * Handles all API calls related to licenses.
 *
 * Dipindah dari bagdja-auth ke bagdja-payment-service (lihat
 * refactoring-payment-service.md §3.3/§5). `appId` = slug app,
 * `orgId` = string opaque (bukan lagi FK), `currency` ditambahkan.
 */

import {
  paymentAppRequest,
  paymentConsoleRequest,
  paymentOrgRequest,
  type AppScope,
} from './console-user-api';
import type { License, CreateLicenseRequest, UpdateLicenseRequest } from '@/types';

/*
 * Lewat endpoint `/console/*` berbasis token user — tanpa token client
 * (core-service-flag-removal-plan.md P5.4):
 * - pemilik App: `/console/apps/:appId/licenses[/purchased]`;
 * - pelanggan: `/console/subscribed-apps/:appId/licenses` (org aktif);
 * - org sistem: `/console/catalog/licenses?appId=`.
 */

/** Semua license satu App, sebagai anggota org pemilik App. */
export async function getLicenses(app: AppScope): Promise<License[]> {
  return paymentAppRequest<License[]>(app, '/licenses');
}

/** License App yang sudah terjual (pemilik App; butuh payment.app-subscriptions.view). */
export async function getPurchasedLicenses(app: AppScope): Promise<License[]> {
  return paymentAppRequest<License[]>(app, '/licenses/purchased');
}

/** License App yang dibeli org aktif (halaman App yang di-subscribe). */
export async function getMyPurchasedLicenses(appId: string, orgId: string): Promise<License[]> {
  return paymentOrgRequest<License[]>(orgId, `/subscribed-apps/${encodeURIComponent(appId)}/licenses`);
}

/** License App mana pun, untuk org sistem (Infrastructure). */
export async function getPlatformLicenses(appId: string): Promise<License[]> {
  return paymentConsoleRequest<License[]>(`/catalog/licenses?appId=${encodeURIComponent(appId)}`);
}

export async function createLicense(app: AppScope, data: CreateLicenseRequest): Promise<License> {
  return paymentAppRequest<License>(app, '/licenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** License yang sudah terjual tidak bisa diubah (400 dari service). */
export async function updateLicense(app: AppScope, id: string, data: UpdateLicenseRequest): Promise<License> {
  return paymentAppRequest<License>(app, `/licenses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteLicense(app: AppScope, id: string): Promise<void> {
  return paymentAppRequest<void>(app, `/licenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

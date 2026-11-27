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

import { paymentAppRequest, paymentOrgRequest, type AppScope } from './console-user-api';
import type { Subscription } from '@/types';

/*
 * Lewat endpoint `/console/*` berbasis token user — tanpa token client
 * (core-service-flag-removal-plan.md P5.4):
 * - pelanggan: `/console/subscribed-apps/:appId/subscriptions` (org aktif);
 * - pemilik App: `/console/apps/:appId/subscriptions`
 *   (butuh payment.app-subscriptions.view).
 */

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
 * Langganan org aktif (`orgId`) untuk App lain (sudut pandang pelanggan).
 * Cancel/change-plan dari Console belum ada (pola mediator payment-service).
 */
export async function getSubscriptionsForOrg(appId: string, orgId: string): Promise<Subscription[]> {
  const raw = await paymentOrgRequest<RawSubscription[]>(
    orgId,
    `/subscribed-apps/${encodeURIComponent(appId)}/subscriptions`,
  );
  return (raw || []).map(mapFromApi);
}

/** Semua pelanggan satu App (sudut pandang pemilik App). */
export async function getAllSubscriptionsForApp(app: AppScope): Promise<Subscription[]> {
  const raw = await paymentAppRequest<RawSubscription[]>(app, '/subscriptions');
  return (raw || []).map(mapFromApi);
}

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
  paymentAppRequest,
  paymentConsoleRequest,
  paymentOrgRequest,
  type AppScope,
} from "./console-user-api";
import type { Plan, CreatePlanRequest, UpdatePlanRequest } from "@/types";

/*
 * Lewat endpoint `/console/*` berbasis token user — tanpa token client
 * (core-service-flag-removal-plan.md P5.4):
 * - pemilik App: `/console/apps/:appId/plans`;
 * - pelanggan: `/console/subscribed-apps/:appId/plans` (org aktif);
 * - org sistem: `/console/catalog/plans?appId=`.
 */

type PlanListResponse = { data: RawSubscriptionPlan[] };

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
  renewalDay?: number | null;
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
    duration: raw.billingInterval as Plan["duration"],
    durationValue: raw.intervalCount,
    renewalDay: raw.renewalDay ?? null,
    features: featuresList,
    trialPeriodDays: raw.trialPeriodDays,
    maxRedemptionsPerOwner: raw.maxRedemptionsPerOwner,
    metadata: raw.metadata,
    isActive: raw.isActive,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

function mapToApiBody(
  data: CreatePlanRequest | UpdatePlanRequest,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: data.name,
    description: data.description,
    price: data.price,
    currency: data.currency,
    billingInterval: data.duration,
    intervalCount: data.durationValue,
    renewalDay: data.renewalDay,
    maxRedemptionsPerOwner: data.maxRedemptionsPerOwner,
    metadata: data.metadata,
    isActive: data.isActive,
  };
  if ("code" in data && data.code) {
    body.code = data.code;
  }
  if (data.features && data.features.length > 0) {
    body.features = { list: data.features };
  }
  return body;
}

/** Plan satu App, sebagai anggota org pemilik App. */
export async function getPlans(app: AppScope): Promise<Plan[]> {
  const res = await paymentAppRequest<PlanListResponse>(app, "/plans");
  return (res.data || []).map(mapFromApi);
}

/** Katalog plan App yang dipakai org aktif (halaman App yang di-subscribe). */
export async function getSubscribedAppPlans(
  appId: string,
  orgId: string,
): Promise<Plan[]> {
  const res = await paymentOrgRequest<PlanListResponse>(
    orgId,
    `/subscribed-apps/${encodeURIComponent(appId)}/plans`,
  );
  return (res.data || []).map(mapFromApi);
}

/** Plan App mana pun, untuk org sistem (Infrastructure). */
export async function getPlatformPlans(appId: string): Promise<Plan[]> {
  const res = await paymentConsoleRequest<PlanListResponse>(
    `/catalog/plans?appId=${encodeURIComponent(appId)}`,
  );
  return (res.data || []).map(mapFromApi);
}

export async function createPlan(
  app: AppScope,
  data: CreatePlanRequest,
): Promise<Plan> {
  const raw = await paymentAppRequest<RawSubscriptionPlan>(app, "/plans", {
    method: "POST",
    body: JSON.stringify(mapToApiBody(data)),
  });
  return mapFromApi(raw);
}

export async function updatePlan(
  app: AppScope,
  id: string,
  data: UpdatePlanRequest,
): Promise<Plan> {
  const raw = await paymentAppRequest<RawSubscriptionPlan>(
    app,
    `/plans/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(mapToApiBody(data)) },
  );
  return mapFromApi(raw);
}

/** Delete (deactivate) a plan — soft-delete di payment-service. */
export async function deletePlan(app: AppScope, id: string): Promise<void> {
  return paymentAppRequest<void>(app, `/plans/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * Event hub (`bagdja-event-service`) untuk Console — endpoint `/console/*`
 * berbasis USER (plan/architecture/core-service-flag-removal-plan.md P2 event).
 *
 * - Pemilik App: `/console/apps/:appId/events/*`, header `x-organization-id`
 *   = org pemilik App, permission `event.contracts.manage`.
 * - Org sistem: `/console/events/*`, permission `console.infra.events.view`.
 *
 * Hanya token login user; tidak ada token client / secret core service.
 */

import { consoleUserRequest, requireServiceBase } from './console-user-api';

export interface EventGridParams {
  page?: number;
  size?: number;
  search?: string;
  filter?: Record<string, string>;
  sort?: string;
}

export interface EventGridMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface EventGridPage<T> {
  data: T[];
  meta: EventGridMeta;
}

/** `RegisteredAppResponseDto` */
export interface EventHubApp {
  id: string;
  orgId: string;
  appId: string;
  publicKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `EventContractResponseDto` */
export interface EventContract {
  id: string;
  appInternalId: string;
  publisherOrgId: string | null;
  publisherAppId: string | null;
  eventName: string;
  schema: Record<string, unknown>;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  app?: EventHubApp;
}

export type EventSubscriptionStatus = 'pending' | 'approved' | 'rejected';

/** `EventSubscriptionResponseDto` — `webhookSecret` tidak pernah dikirim. */
export interface EventSubscription {
  id: string;
  appId: string;
  subscriberOrgId: string | null;
  subscriberAppId: string | null;
  contractId: string;
  label: string;
  status: EventSubscriptionStatus;
  webhookUrl: string | null;
  webhookSecretConfigured: boolean;
  createdAt: string;
  updatedAt: string;
  contract?: EventContract;
  app?: EventHubApp;
}

/** `EventLogResponseDto` */
export interface EventLog {
  id: string;
  type: string;
  eventName: string;
  orgId: string | null;
  appId: string;
  payload: unknown;
  status: string;
  errorDetails: string | null;
  targetUrl: string | null;
  responseTimeMs: number | null;
  contractId: string | null;
  createdAt: string;
  contract?: EventContract | null;
}

export interface EventContractInput {
  eventName: string;
  schema: Record<string, unknown>;
  isPublic?: boolean;
  isActive?: boolean;
}

export interface EventSubscriptionInput {
  webhookUrl?: string;
  label?: string;
  webhookSecret?: string;
}

function eventBase(): string {
  return requireServiceBase(process.env.NEXT_PUBLIC_EVENT_API, 'NEXT_PUBLIC_EVENT_API');
}

function gridQuery(params?: EventGridParams): string {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.size) query.append('size', String(params.size));
  if (params?.search) query.append('search', params.search);
  if (params?.sort) query.append('sort', params.sort);
  for (const [key, value] of Object.entries(params?.filter ?? {})) {
    if (value) query.append(`filter[${key}]`, value);
  }
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

/** Request ke `/console/apps/:appId/events…` sebagai user di org pemilik App. */
function appRequest<T>(orgId: string, appId: string, path: string, options: RequestInit = {}): Promise<T> {
  return consoleUserRequest<T>(
    eventBase(),
    `/console/apps/${encodeURIComponent(appId)}/events${path}`,
    {
      ...options,
      headers: { 'x-organization-id': orgId, ...(options.headers as Record<string, string>) },
    },
  );
}

// ─── Pemilik App: kontrak ──────────────────────────────────────────────

export function listAppEventContracts(
  orgId: string,
  appId: string,
  params?: EventGridParams,
): Promise<EventGridPage<EventContract>> {
  return appRequest(orgId, appId, `/contracts${gridQuery(params)}`);
}

/** App otomatis didaftarkan di hub bila belum. */
export function createAppEventContract(
  orgId: string,
  appId: string,
  data: EventContractInput,
): Promise<EventContract> {
  return appRequest(orgId, appId, '/contracts', { method: 'POST', body: JSON.stringify(data) });
}

export function updateAppEventContract(
  orgId: string,
  appId: string,
  contractId: string,
  data: Partial<EventContractInput>,
): Promise<EventContract> {
  return appRequest(orgId, appId, `/contracts/${encodeURIComponent(contractId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAppEventContract(
  orgId: string,
  appId: string,
  contractId: string,
): Promise<{ success: true }> {
  return appRequest(orgId, appId, `/contracts/${encodeURIComponent(contractId)}`, { method: 'DELETE' });
}

// ─── Pemilik App: log ──────────────────────────────────────────────────

export function listAppEventLogs(
  orgId: string,
  appId: string,
  params?: EventGridParams,
): Promise<EventGridPage<EventLog>> {
  return appRequest(orgId, appId, `/logs${gridQuery(params)}`);
}

export function resendAppEventLog(
  orgId: string,
  appId: string,
  logId: string,
): Promise<{ success: boolean; message: string; deliveryId: string }> {
  return appRequest(orgId, appId, `/logs/${encodeURIComponent(logId)}/resend`, { method: 'POST' });
}

// ─── Pemilik App: katalog & langganan ──────────────────────────────────

export function listAvailableEvents(
  orgId: string,
  appId: string,
  params?: EventGridParams,
): Promise<EventGridPage<EventContract>> {
  return appRequest(orgId, appId, `/available${gridQuery(params)}`);
}

export function listAppEventSubscriptions(
  orgId: string,
  appId: string,
  params?: EventGridParams,
): Promise<EventGridPage<EventSubscription>> {
  return appRequest(orgId, appId, `/subscriptions${gridQuery(params)}`);
}

export function subscribeAppToEvent(
  orgId: string,
  appId: string,
  contractId: string,
  data: EventSubscriptionInput = {},
): Promise<EventSubscription> {
  return appRequest(orgId, appId, '/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ contractId, ...data }),
  });
}

export function updateAppEventSubscription(
  orgId: string,
  appId: string,
  subscriptionId: string,
  data: EventSubscriptionInput,
): Promise<EventSubscription> {
  return appRequest(orgId, appId, `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAppEventSubscription(
  orgId: string,
  appId: string,
  subscriptionId: string,
): Promise<{ success: true }> {
  return appRequest(orgId, appId, `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
  });
}

// ─── Pemilik App: request langganan ke kontrak App ini ─────────────────

export function listAppSubscriptionRequests(
  orgId: string,
  appId: string,
  params?: EventGridParams,
): Promise<EventGridPage<EventSubscription>> {
  return appRequest(orgId, appId, `/requests${gridQuery(params)}`);
}

export function updateAppSubscriptionRequestStatus(
  orgId: string,
  appId: string,
  subscriptionId: string,
  status: EventSubscriptionStatus,
): Promise<EventSubscription> {
  return appRequest(orgId, appId, `/requests/${encodeURIComponent(subscriptionId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── Org sistem: Infrastructure ────────────────────────────────────────

export function listHubApps(): Promise<EventHubApp[]> {
  return consoleUserRequest(eventBase(), '/console/events/apps');
}

export function listAllEventContracts(params?: EventGridParams): Promise<EventGridPage<EventContract>> {
  return consoleUserRequest(eventBase(), `/console/events/contracts${gridQuery(params)}`);
}

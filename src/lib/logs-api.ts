/**
 * Log (`bagdja-log-service`) untuk Console — endpoint `/console/*` berbasis
 * USER (plan/architecture/core-service-flag-removal-plan.md P2 log).
 *
 * - Pemilik App: `/console/apps/:appId/logs`, header `x-organization-id`
 *   = org pemilik App, permission `logs.app-logs.view`.
 * - Org sistem: `/console/logs`, permission `console.infra.logs.view`.
 *
 * Hanya token login user; tidak ada token client / secret core service.
 */

import { consoleUserRequest, requireServiceBase } from './console-user-api';

/** `LogEntryResponseDto` */
export interface PlatformLogEntry {
  id: string;
  traceId: string | null;
  orgId: string;
  appId: string;
  service: string;
  level: string;
  message: string;
  tags: string[];
  data: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  timestamp: string;
}

/** `LogPageResponseDto` */
export interface PlatformLogPage {
  items: PlatformLogEntry[];
  total: number;
}

export interface PlatformLogQuery {
  service?: string;
  level?: string;
  /** Dipisah koma; log harus punya semua tag. */
  tags?: string;
  search?: string;
  /** Maks 200. */
  limit?: number;
  offset?: number;
}

export interface InfraLogQuery extends PlatformLogQuery {
  orgId?: string;
  appId?: string;
}

function logBase(): string {
  return requireServiceBase(process.env.NEXT_PUBLIC_LOG_API, 'NEXT_PUBLIC_LOG_API');
}

function toQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Log satu App, sebagai user di org pemilik App. */
export function getAppLogs(orgId: string, appId: string, query: PlatformLogQuery = {}): Promise<PlatformLogPage> {
  return consoleUserRequest(
    logBase(),
    `/console/apps/${encodeURIComponent(appId)}/logs${toQueryString(query)}`,
    { headers: { 'x-organization-id': orgId } },
  );
}

/** Log semua tenant (Infrastructure → Logs), khusus org sistem. */
export function getInfraLogs(query: InfraLogQuery = {}): Promise<PlatformLogPage> {
  return consoleUserRequest(logBase(), `/console/logs${toQueryString(query)}`);
}

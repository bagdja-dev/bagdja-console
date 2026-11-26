/**
 * Messaging (`bagdja-messaging-service`) untuk Console — endpoint
 * `/console/apps/:appId/messaging/*` berbasis USER
 * (plan/architecture/core-service-flag-removal-plan.md P2 messaging).
 *
 * Header `x-organization-id` = org pemilik App, permission
 * `messaging.templates.manage`. Hanya token login user; tidak ada token
 * client / secret core service.
 */

import { consoleUserRequest, requireServiceBase } from './console-user-api';
import type {
  ChannelConfig,
  ChannelSetting,
  ChannelType,
  CreateTemplateRequest,
  MessageGridPage,
  MessageLog,
  MessageTemplate,
  SetupChannelRequest,
  TestConnectionRequest,
  UpdateTemplateRequest,
} from '@/types';

export interface MessageGridParams {
  page?: number;
  size?: number;
  search?: string;
  filter?: Record<string, string>;
  sort?: string;
}

function messagingBase(): string {
  return requireServiceBase(process.env.NEXT_PUBLIC_MESSAGE_API, 'NEXT_PUBLIC_MESSAGE_API');
}

function gridQuery(params?: MessageGridParams & { channelType?: ChannelType }): string {
  const query = new URLSearchParams();
  if (params?.channelType) query.append('channelType', params.channelType);
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

const CONFIG_FIELDS: (keyof ChannelConfig)[] = ['host', 'port', 'secure', 'user', 'pass', 'apiKey', 'from'];

/** Server menolak field config asing (400); kirim hanya field yang dikenal. */
function pickConfig(config: ChannelConfig | undefined): ChannelConfig {
  const picked: ChannelConfig = {};
  for (const field of CONFIG_FIELDS) {
    const value = config?.[field];
    if (value !== undefined && !(typeof value === 'number' && Number.isNaN(value))) {
      (picked as Record<string, unknown>)[field] = value;
    }
  }
  return picked;
}

/** Request ke `/console/apps/:appId/messaging…` sebagai user di org pemilik App. */
function appRequest<T>(orgId: string, appId: string, path: string, options: RequestInit = {}): Promise<T> {
  return consoleUserRequest<T>(
    messagingBase(),
    `/console/apps/${encodeURIComponent(appId)}/messaging${path}`,
    {
      ...options,
      headers: { 'x-organization-id': orgId, ...(options.headers as Record<string, string>) },
    },
  );
}

// ─── Channel / provider ────────────────────────────────────────────────

/** Tanpa nilai rahasia; lihat `configuredFields`. */
export function getChannelSettings(orgId: string, appId: string): Promise<ChannelSetting[]> {
  return appRequest(orgId, appId, '/channels');
}

/** Field rahasia (`pass`, `apiKey`) kosong = pertahankan nilai tersimpan. */
export function setupChannel(orgId: string, appId: string, data: SetupChannelRequest): Promise<ChannelSetting> {
  return appRequest(orgId, appId, `/channels/${encodeURIComponent(data.channelType)}`, {
    method: 'PUT',
    body: JSON.stringify({ providerType: data.providerType, config: pickConfig(data.config) }),
  });
}

/** Hanya SMTP. */
export function testConnection(
  orgId: string,
  appId: string,
  data: TestConnectionRequest,
): Promise<{ success: boolean; message: string }> {
  return appRequest(orgId, appId, '/channels/test-connection', {
    method: 'POST',
    body: JSON.stringify({ ...data, config: pickConfig(data.config) }),
  });
}

// ─── Template ──────────────────────────────────────────────────────────

export function getTemplates(
  orgId: string,
  appId: string,
  params?: MessageGridParams & { channelType?: ChannelType },
): Promise<MessageGridPage<MessageTemplate>> {
  return appRequest(orgId, appId, `/templates${gridQuery(params)}`);
}

export function createTemplate(
  orgId: string,
  appId: string,
  data: CreateTemplateRequest,
): Promise<MessageTemplate> {
  return appRequest(orgId, appId, '/templates', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTemplate(
  orgId: string,
  appId: string,
  templateId: string,
  data: UpdateTemplateRequest,
): Promise<MessageTemplate> {
  return appRequest(orgId, appId, `/templates/${encodeURIComponent(templateId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTemplate(orgId: string, appId: string, templateId: string): Promise<{ success: true }> {
  return appRequest(orgId, appId, `/templates/${encodeURIComponent(templateId)}`, { method: 'DELETE' });
}

// ─── Log pengiriman ────────────────────────────────────────────────────

export function getMessageLogs(
  orgId: string,
  appId: string,
  params?: MessageGridParams,
): Promise<MessageGridPage<MessageLog>> {
  return appRequest(orgId, appId, `/logs${gridQuery(params)}`);
}

export function resendMessageLog(
  orgId: string,
  appId: string,
  logId: string,
): Promise<{ success: boolean; logId: string }> {
  return appRequest(orgId, appId, `/logs/${encodeURIComponent(logId)}/resend`, { method: 'POST' });
}

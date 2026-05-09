/**
 * Message Service API Client
 */

import { getClientToken, isClientTokenExpired } from './auth';
import { ChannelType, ProviderType } from '@/types';
import type { 
  ChannelSetting, 
  MessageTemplate, 
  CreateTemplateRequest, 
  UpdateTemplateRequest, 
  SetupChannelRequest, 
  TestConnectionRequest,
  ApiError 
} from '@/types';

const MESSAGE_API_BASE = process.env.NEXT_PUBLIC_MESSAGE_API || 'http://localhost:4086';

async function ensureClientToken(): Promise<string> {
  // This is a simplified version, assuming the token management is handled in auth.ts
  const token = getClientToken();
  if (!token) throw new Error('No client token available');
  return token;
}

async function request<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = await ensureClientToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': token,
    ...options.headers,
  };

  const response = await fetch(`${MESSAGE_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const error: ApiError = {
      message: data.message || 'Something went wrong',
      statusCode: response.status,
    };
    throw error;
  }

  return data as T;
}

// Channel Settings
export const getChannelSettings = (appId: string) => 
  request<ChannelSetting[]>(`/channels?appId=${appId}`);

export const setupChannel = (data: SetupChannelRequest) =>
  request<ChannelSetting>('/channels/setup', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const testConnection = (data: TestConnectionRequest) =>
  request<{ success: boolean; message: string }>('/messages/email/test-connection', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Templates
export const getTemplates = (appId: string, channelType?: ChannelType) => {
  let url = `/messages/templates?appId=${appId}`;
  if (channelType) url += `&channelType=${channelType}`;
  return request<MessageTemplate[]>(url);
};

export const createTemplate = (data: CreateTemplateRequest) =>
  request<MessageTemplate>('/messages/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateTemplate = (id: string, data: UpdateTemplateRequest) =>
  request<MessageTemplate>(`/messages/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteTemplate = (id: string, appId?: string) => {
  let url = `/messages/templates/${id}`;
  if (appId) url += `?appId=${appId}`;
  return request<void>(url, {
    method: 'DELETE',
  });
};

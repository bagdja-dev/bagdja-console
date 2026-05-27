import { getAccessToken, getClientToken, isClientTokenExpired } from './auth';
import { refreshClientToken } from './api';

const LOG_API_BASE = process.env.NEXT_PUBLIC_LOG_API || 'http://localhost:3002';

async function ensureClientToken(): Promise<string> {
  const clientToken = getClientToken();
  if (!clientToken || isClientTokenExpired()) {
    return await refreshClientToken();
  }
  return clientToken;
}

export async function getLogs(query: {
  orgId?: string;
  appId?: string;
  service?: string;
  level?: string;
  tags?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const clientToken = await ensureClientToken();
  const userToken = getAccessToken();

  const params = new URLSearchParams();
  if (query.orgId) params.append('orgId', query.orgId);
  if (query.appId) params.append('appId', query.appId);
  if (query.service) params.append('service', query.service);
  if (query.level) params.append('level', query.level);
  if (query.tags) params.append('tags', query.tags);
  if (query.search) params.append('search', query.search);
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.offset) params.append('offset', query.offset.toString());

  const url = `${LOG_API_BASE}/logs?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': clientToken,
      'Authorization': `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch logs');
  }

  return response.json();
}

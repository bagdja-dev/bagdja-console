/**
 * Asset (`bagdja-assets`) untuk Console — endpoint `/console/*` berbasis
 * USER (plan/architecture/core-service-flag-removal-plan.md P5.2).
 *
 * - `/console/assets*` dan `/console/asset-groups*`, header
 *   `x-organization-id` = org aktif; cukup anggota aktif org itu.
 * - Hanya token login user; tidak ada token client / secret client app.
 */

import { getActiveOrganizationSlug } from './auth';
import { consoleUserRequest, requireServiceBase } from './console-user-api';
import type {
  Asset,
  CreateAssetRequest,
  AssetGroup,
  CreateAssetGroupRequest,
  UpdateAssetGroupRequest,
} from '@/types';

function assetsBase(): string {
  return requireServiceBase(process.env.NEXT_PUBLIC_ASSETS_API, 'NEXT_PUBLIC_ASSETS_API');
}

function orgHeader(organizationId?: string): Record<string, string> {
  const orgId = organizationId || getActiveOrganizationSlug();
  if (!orgId) {
    throw new Error('Organization slug is required');
  }
  return { 'x-organization-id': orgId };
}

function assetsRequest<T>(path: string, options: RequestInit = {}, organizationId?: string): Promise<T> {
  return consoleUserRequest<T>(assetsBase(), `/console${path}`, {
    ...options,
    headers: { ...orgHeader(organizationId), ...(options.headers as Record<string, string>) },
  });
}

/** Upload asset ke org aktif (multipart/form-data). */
export function createAsset(data: CreateAssetRequest, organizationId: string): Promise<Asset> {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('groupId', data.groupId);
  if (data.name) {
    formData.append('name', data.name);
  }
  return assetsRequest<Asset>('/assets', { method: 'POST', body: formData }, organizationId);
}

/** Daftar asset org aktif (terbaru dulu, maks 100 per halaman). */
export function getAssets(
  groupId?: string,
  limit?: number,
  offset?: number,
  organizationId?: string,
): Promise<{ data: Asset[]; total: number }> {
  const params = new URLSearchParams();
  if (groupId) params.append('groupId', groupId);
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));
  const qs = params.toString();
  return assetsRequest<{ data: Asset[]; total: number }>(`/assets${qs ? `?${qs}` : ''}`, {}, organizationId);
}

export function getAssetGroups(includeInactive = false, organizationId?: string): Promise<AssetGroup[]> {
  const qs = includeInactive ? '?includeInactive=true' : '';
  return assetsRequest<AssetGroup[]>(`/asset-groups${qs}`, {}, organizationId);
}

export function getAssetGroup(id: string, organizationId?: string): Promise<AssetGroup> {
  return assetsRequest<AssetGroup>(`/asset-groups/${encodeURIComponent(id)}`, {}, organizationId);
}

export function createAssetGroup(data: CreateAssetGroupRequest, organizationId?: string): Promise<AssetGroup> {
  return assetsRequest<AssetGroup>(
    '/asset-groups',
    { method: 'POST', body: JSON.stringify(data) },
    organizationId,
  );
}

export function updateAssetGroup(
  id: string,
  data: UpdateAssetGroupRequest,
  organizationId?: string,
): Promise<AssetGroup> {
  return assetsRequest<AssetGroup>(
    `/asset-groups/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    organizationId,
  );
}

/** Soft delete; ditolak bila group masih berisi asset. */
export function deleteAssetGroup(id: string, organizationId?: string): Promise<void> {
  return assetsRequest<void>(`/asset-groups/${encodeURIComponent(id)}`, { method: 'DELETE' }, organizationId);
}

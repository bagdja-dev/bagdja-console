/**
 * User management organisasi — `bagdja-auth`
 * `/auth/organizations/:orgKey/{members,roles,permissions}`
 * (plan/architecture/org-user-management-plan.md, U2).
 *
 * Hanya token login user (Bearer). Semua otorisasi & aturan anti-eskalasi
 * ditegakkan auth; flag di UI hanya untuk menyembunyikan tombol.
 */

import { consoleUserRequest, requireServiceBase } from './console-user-api';
import { getAccessToken } from './auth';
import type { Organization } from '@/types';

/** Sama dengan `ORG_MEMBERS_MANAGE` / `ORG_ROLES_MANAGE` di bagdja-auth. */
export const ORG_MEMBERS_MANAGE = 'auth.*.org-members.manage';
export const ORG_ROLES_MANAGE = 'auth.*.org-roles.manage';

export interface OrgMemberRoleRef {
  id: string;
  name: string;
  slug: string;
}

/** `OrganizationMemberDetailDto` */
export interface OrgMember {
  membershipId: string;
  userId: string;
  username: string | null;
  email: string;
  profilePicture: string | null;
  role: OrgMemberRoleRef | null;
  isActive: boolean;
  joinedAt: string;
}

/** `OrganizationRoleDetailDto` */
export interface OrgRole {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  isSystemRole: boolean;
  isOwnerRole: boolean;
  permissions: string[];
  memberCount: number;
}

/** `AssignablePermissionDto` */
export interface AssignablePermission {
  key: string;
  description: string | null;
  grantable: boolean;
  /** Hanya bisa dimiliki role di org sistem (hanya muncul di katalog org sistem). */
  isSystemOnly: boolean;
}

export interface CreateOrgRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateOrgRoleRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  permissions?: string[];
}

function authBase(): string {
  return requireServiceBase(
    process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com',
    'NEXT_PUBLIC_AUTH_API',
  );
}

function orgPath(orgKey: string, path: string): string {
  return `/auth/organizations/${encodeURIComponent(orgKey)}${path}`;
}

export function listOrgMembers(orgKey: string, includeInactive = false): Promise<OrgMember[]> {
  return consoleUserRequest<OrgMember[]>(
    authBase(),
    orgPath(orgKey, `/members${includeInactive ? '?includeInactive=true' : ''}`),
  );
}

export function addOrgMember(orgKey: string, data: { email: string; roleId: string }): Promise<OrgMember> {
  return consoleUserRequest<OrgMember>(authBase(), orgPath(orgKey, '/members'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateOrgMember(
  orgKey: string,
  userId: string,
  data: { roleId?: string; isActive?: boolean },
): Promise<OrgMember> {
  return consoleUserRequest<OrgMember>(
    authBase(),
    orgPath(orgKey, `/members/${encodeURIComponent(userId)}`),
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}

export function listOrgRoles(orgKey: string): Promise<OrgRole[]> {
  return consoleUserRequest<OrgRole[]>(authBase(), orgPath(orgKey, '/roles'));
}

export function createOrgRole(orgKey: string, data: CreateOrgRoleRequest): Promise<OrgRole> {
  return consoleUserRequest<OrgRole>(authBase(), orgPath(orgKey, '/roles'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateOrgRole(orgKey: string, roleId: string, data: UpdateOrgRoleRequest): Promise<OrgRole> {
  return consoleUserRequest<OrgRole>(
    authBase(),
    orgPath(orgKey, `/roles/${encodeURIComponent(roleId)}`),
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}

export function deleteOrgRole(orgKey: string, roleId: string): Promise<{ success: true }> {
  return consoleUserRequest<{ success: true }>(
    authBase(),
    orgPath(orgKey, `/roles/${encodeURIComponent(roleId)}`),
    { method: 'DELETE' },
  );
}

export function listAssignablePermissions(orgKey: string): Promise<AssignablePermission[]> {
  return consoleUserRequest<AssignablePermission[]>(authBase(), orgPath(orgKey, '/permissions'));
}

/** Owner — sama dengan aturan auth & `@bagdja/node-sdk`. */
export function isOwnerOf(org: Pick<Organization, 'role'> | null | undefined): boolean {
  return org?.role?.slug === 'owner' || org?.role?.name === 'Owner';
}

/** Hak kelola untuk menampilkan/menyembunyikan tombol (otorisasi tetap di auth). */
export function orgManageFlags(org: Organization | null | undefined): {
  isOwner: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
} {
  const isOwner = isOwnerOf(org);
  const permissions = new Set(org?.permissions ?? []);
  return {
    isOwner,
    canManageMembers: isOwner || permissions.has(ORG_MEMBERS_MANAGE),
    canManageRoles: isOwner || permissions.has(ORG_ROLES_MANAGE),
  };
}

/** Kelompok permission per prefix untuk editor role. */
export function groupPermissions(permissions: AssignablePermission[]): Array<{
  group: string;
  items: AssignablePermission[];
}> {
  const groups = new Map<string, AssignablePermission[]>();
  for (const permission of permissions) {
    const group = permission.key.startsWith('console.infra.')
      ? 'console.infra'
      : permission.key.split('.')[0];
    groups.set(group, [...(groups.get(group) ?? []), permission]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => ({ group, items }));
}

/**
 * userId (`sub`) dari token login, hanya untuk menyembunyikan tombol di UI
 * (mis. non-owner tidak bisa mengubah keanggotaannya sendiri). Tidak
 * memverifikasi token — otorisasi tetap di bagdja-auth.
 */
export function currentUserIdFromToken(): string | null {
  const token = getAccessToken();
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { getOrganizations } from '@/lib/api';
import type { Organization } from '@/types';

function isOwner(org?: Organization): boolean {
  return org?.role?.slug === 'owner' || org?.role?.name === 'Owner';
}

/**
 * Permission user per organisasi, untuk menampilkan/menyembunyikan aksi.
 * Hanya kosmetik: payment-service tetap menegakkan permission yang sama.
 *
 * - `hasSystemPermission`: aksi platform — dibaca dari org sistem saja
 *   (bukan gabungan semua org), owner org sistem lolos otomatis.
 * - `hasOrgPermission`: aksi tenant pada satu org, owner org lolos otomatis.
 */
export function useOrganizationPermissions() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOrganizations()
      .then((orgs) => {
        if (!cancelled) setOrganizations(orgs);
      })
      .catch(() => {
        if (!cancelled) setOrganizations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSystemPermission = useCallback(
    (permission: string) => {
      const systemOrg = organizations?.find((org) => org.isSystemOrg);
      return Boolean(
        systemOrg && (isOwner(systemOrg) || systemOrg.permissions?.includes(permission)),
      );
    },
    [organizations],
  );

  const hasOrgPermission = useCallback(
    (orgKey: string | null | undefined, permission: string) => {
      const org = organizations?.find((o) => o.orgId === orgKey || o.id === orgKey);
      return Boolean(org && (isOwner(org) || org.permissions?.includes(permission)));
    },
    [organizations],
  );

  const isOrgOwner = useCallback(
    (orgKey: string | null | undefined) =>
      isOwner(organizations?.find((o) => o.orgId === orgKey || o.id === orgKey)),
    [organizations],
  );

  return {
    loading: organizations === null,
    hasSystemPermission,
    hasOrgPermission,
    isOrgOwner,
  };
}

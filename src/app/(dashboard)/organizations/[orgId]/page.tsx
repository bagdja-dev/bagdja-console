'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building, Edit, KeyRound, Plus, ShieldCheck, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import { getOrganizations } from '@/lib/api';
import {
  addOrgMember,
  createOrgRole,
  deleteOrgRole,
  listAssignablePermissions,
  listOrgMembers,
  listOrgRoles,
  orgManageFlags,
  updateOrgMember,
  updateOrgRole,
  currentUserIdFromToken,
  type AssignablePermission,
  type OrgMember,
  type OrgRole,
} from '@/lib/org-access-api';
import OrgMemberModal from '@/components/OrgMemberModal';
import OrgRoleModal from '@/components/OrgRoleModal';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal, { type AlertType } from '@/components/AlertModal';
import { Button } from '@/ui/button';
import type { ApiError, Organization } from '@/types';

type Tab = 'members' | 'roles';

interface PendingConfirm {
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'primary';
  run: () => Promise<void>;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));

export default function OrganizationAccessPage() {
  const router = useRouter();
  const params = useParams();
  const orgKey = decodeURIComponent((params?.orgId as string) ?? '');

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [catalog, setCatalog] = useState<AssignablePermission[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memberModal, setMemberModal] = useState<{ open: boolean; member: OrgMember | null }>({
    open: false,
    member: null,
  });
  const [roleModal, setRoleModal] = useState<{ open: boolean; role: OrgRole | null }>({ open: false, role: null });
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [alert, setAlert] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const flags = orgManageFlags(organization);
  const myPermissions = useMemo(() => organization?.permissions ?? [], [organization]);
  const myRoleId = organization?.role?.id;
  const myUserId = useMemo(() => currentUserIdFromToken(), []);
  const mine = useMemo(() => new Set(myPermissions), [myPermissions]);

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ isOpen: true, type, title, message });

  const loadAll = useCallback(async () => {
    if (!orgKey) return;
    setLoading(true);
    setError(null);
    try {
      const orgs = await getOrganizations();
      const org = orgs.find((o) => o.orgId === orgKey || o.id === orgKey) ?? null;
      if (!org) {
        setError('Organisasi tidak ditemukan atau Anda bukan anggotanya.');
        return;
      }
      setOrganization(org);
      const canSeeInactive = orgManageFlags(org).canManageMembers && showInactive;
      const [memberList, roleList, permissionList] = await Promise.all([
        listOrgMembers(org.orgId, canSeeInactive),
        listOrgRoles(org.orgId),
        listAssignablePermissions(org.orgId),
      ]);
      setMembers(memberList);
      setRoles(roleList);
      setCatalog(permissionList);
    } catch (err) {
      setError((err as ApiError).message || 'Gagal memuat data organisasi');
    } finally {
      setLoading(false);
    }
  }, [orgKey, showInactive]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ─── Aturan tampilan (cerminan aturan auth; auth tetap penentu) ─────────

  const canEditMember = (member: OrgMember): boolean => {
    if (!flags.canManageMembers) return false;
    if (flags.isOwner) return true;
    return member.role?.slug !== 'owner' && member.userId !== myUserId;
  };

  const canEditRole = (role: OrgRole): boolean => {
    if (!flags.canManageRoles || role.isOwnerRole || role.isSystemRole) return false;
    if (flags.isOwner) return true;
    return role.id !== myRoleId && role.permissions.every((p) => mine.has(p));
  };

  // ─── Aksi ────────────────────────────────────────────────────────────

  const handleMemberSubmit = async (data: { email: string; roleId: string }) => {
    if (!organization) return;
    if (memberModal.member) {
      await updateOrgMember(organization.orgId, memberModal.member.userId, { roleId: data.roleId });
      showAlert('success', 'Tersimpan', 'Role anggota diperbarui. Berlaku paling lambat 30 detik.');
    } else {
      await addOrgMember(organization.orgId, data);
      showAlert('success', 'Anggota ditambahkan', `${data.email} sekarang anggota ${organization.name}.`);
    }
    await loadAll();
  };

  const askToggleMember = (member: OrgMember) => {
    if (!organization) return;
    const activate = !member.isActive;
    setConfirm({
      title: activate ? 'Aktifkan anggota?' : 'Nonaktifkan anggota?',
      message: activate
        ? 'Anggota mendapat lagi akses sesuai role-nya.'
        : 'Anggota kehilangan akses ke organisasi ini. Data dan riwayatnya tetap tersimpan, dan bisa diaktifkan lagi.',
      detail: `${member.username || member.email} · ${member.role?.name ?? '-'}`,
      confirmLabel: activate ? 'Aktifkan' : 'Nonaktifkan',
      variant: activate ? 'primary' : 'danger',
      run: async () => {
        await updateOrgMember(organization.orgId, member.userId, { isActive: activate });
        await loadAll();
      },
    });
  };

  const handleRoleSubmit = async (data: { name: string; description?: string; permissions: string[]; isActive: boolean }) => {
    if (!organization) return;
    if (roleModal.role) {
      await updateOrgRole(organization.orgId, roleModal.role.id, data);
      showAlert('success', 'Role diperbarui', 'Perubahan berlaku paling lambat 30 detik.');
    } else {
      await createOrgRole(organization.orgId, {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      });
      showAlert('success', 'Role dibuat', `Role ${data.name} siap dipasang ke anggota.`);
    }
    await loadAll();
  };

  const askDeleteRole = (role: OrgRole) => {
    if (!organization) return;
    setConfirm({
      title: 'Hapus role?',
      message:
        role.memberCount > 0
          ? 'Role ini masih dipakai. Pindahkan anggotanya ke role lain dulu.'
          : 'Role akan dihapus permanen.',
      detail: role.name,
      confirmLabel: 'Hapus',
      variant: 'danger',
      run: async () => {
        await deleteOrgRole(organization.orgId, role.id);
        await loadAll();
      },
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirming(true);
    try {
      await confirm.run();
      setConfirm(null);
    } catch (err) {
      setConfirm(null);
      showAlert('error', 'Gagal', (err as ApiError).message || 'Aksi gagal');
    } finally {
      setConfirming(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  const header = (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => router.push('/organizations')}
        className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Organizations
      </button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)]">
          <Building className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            {organization?.name ?? orgKey}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Anggota & role
            {organization?.role ? ` · Anda: ${organization.role.name}` : ''}
            {organization?.isSystemOrg ? ' · Org sistem' : ''}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading && !organization) {
    return (
      <>
        {header}
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-center text-[var(--text-secondary)]">
          Memuat...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {header}
        <div
          className="rounded-md border border-[var(--brand-error)]/30 bg-[var(--brand-error)]/20 p-4 text-sm text-[var(--brand-error)]"
          role="alert"
        >
          {error}
        </div>
      </>
    );
  }

  const tabButton = (key: Tab, label: string, icon: React.ReactNode, count: number) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
        tab === key
          ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      {label}
      <span className="rounded-full bg-[var(--bg-main)] px-2 text-xs">{count}</span>
    </button>
  );

  return (
    <>
      {header}

      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border-default)] sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabButton('members', 'Anggota', <Users className="h-4 w-4" />, members.length)}
          {tabButton('roles', 'Role', <ShieldCheck className="h-4 w-4" />, roles.length)}
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-2">
          {tab === 'members' && flags.canManageMembers && (
            <>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                Tampilkan nonaktif
              </label>
              <Button type="button" size="sm" onClick={() => setMemberModal({ open: true, member: null })}>
                <Plus className="mr-1 inline h-4 w-4" /> Tambah anggota
              </Button>
            </>
          )}
          {tab === 'roles' && flags.canManageRoles && (
            <Button type="button" size="sm" onClick={() => setRoleModal({ open: true, role: null })}>
              <Plus className="mr-1 inline h-4 w-4" /> Buat role
            </Button>
          )}
        </div>
      </div>

      {tab === 'members' ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-default)]">
              <thead className="bg-[var(--bg-sidebar)]">
                <tr>
                  {['Anggota', 'Role', 'Status', 'Bergabung', ''].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {members.map((member) => (
                  <tr key={member.membershipId} className={member.isActive ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {member.username || member.email}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">{member.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-[var(--action-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--action-primary)]">
                        {member.role?.name ?? '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {member.isActive ? (
                        <span className="text-green-600">Aktif</span>
                      ) : (
                        <span className="text-[var(--text-secondary)]">Nonaktif</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {formatDate(member.joinedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canEditMember(member) && (
                        <div className="flex justify-end gap-1">
                          {member.isActive && (
                            <button
                              type="button"
                              onClick={() => setMemberModal({ open: true, member })}
                              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--action-primary)]/10 hover:text-[var(--action-primary)]"
                              title="Ganti role"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => askToggleMember(member)}
                            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--action-primary)]/10 hover:text-[var(--action-primary)]"
                            title={member.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {member.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 ${
                role.isActive ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{role.name}</h3>
                    {role.isOwnerRole && (
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">
                        Semua akses
                      </span>
                    )}
                    {!role.isActive && (
                      <span className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                        Nonaktif
                      </span>
                    )}
                    {role.id === myRoleId && (
                      <span className="rounded bg-[var(--action-primary)]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--action-primary)]">
                        Role Anda
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{role.description}</p>
                  )}
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {role.memberCount} anggota aktif ·{' '}
                    {role.isOwnerRole ? 'semua permission' : `${role.permissions.length} permission`}
                  </p>
                </div>
                {canEditRole(role) && (
                  <div className="flex flex-shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setRoleModal({ open: true, role })}
                      className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--action-primary)]/10 hover:text-[var(--action-primary)]"
                      title="Ubah"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => askDeleteRole(role)}
                      className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {!role.isOwnerRole && role.permissions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {role.permissions.map((key) => (
                    <span
                      key={key}
                      className="break-all rounded bg-[var(--bg-main)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <OrgMemberModal
        isOpen={memberModal.open}
        member={memberModal.member}
        roles={roles}
        isOwner={flags.isOwner}
        myPermissions={myPermissions}
        onClose={() => setMemberModal({ open: false, member: null })}
        onSubmit={handleMemberSubmit}
      />

      <OrgRoleModal
        isOpen={roleModal.open}
        role={roleModal.role}
        catalog={catalog}
        onClose={() => setRoleModal({ open: false, role: null })}
        onSubmit={handleRoleSubmit}
      />

      <ConfirmModal
        isOpen={confirm !== null}
        onClose={() => {
          if (!confirming) setConfirm(null);
        }}
        onConfirm={runConfirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        detail={confirm?.detail}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel="Batal"
        variant={confirm?.variant}
        loading={confirming}
      />

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert((prev) => ({ ...prev, isOpen: false }))}
        type={alert.type}
        title={alert.title}
        message={alert.message}
      />
    </>
  );
}


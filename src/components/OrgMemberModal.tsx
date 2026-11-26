'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import type { OrgMember, OrgRole } from '@/lib/org-access-api';
import type { ApiError } from '@/types';

interface OrgMemberModalProps {
  isOpen: boolean;
  /** `null` = tambah anggota baru; selain itu = ganti role anggota ini. */
  member: OrgMember | null;
  roles: OrgRole[];
  isOwner: boolean;
  /** Permission pemanggil di org ini (untuk menandai role yang tidak bisa ia pasang). */
  myPermissions: string[];
  onClose: () => void;
  onSubmit: (data: { email: string; roleId: string }) => Promise<void>;
}

/** Alasan role tidak bisa dipasang pemanggil (aturan sama dengan auth), atau null. */
function blockedReason(role: OrgRole, isOwner: boolean, mine: Set<string>): string | null {
  if (!role.isActive) return 'nonaktif';
  if (isOwner) return null;
  if (role.isOwnerRole) return 'khusus owner';
  return role.permissions.every((p) => mine.has(p)) ? null : 'melebihi hak Anda';
}

export default function OrgMemberModal({
  isOpen,
  member,
  roles,
  isOwner,
  myPermissions,
  onClose,
  onSubmit,
}: OrgMemberModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = new Set(myPermissions);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(member?.email ?? '');
    setRoleId(member?.role?.id ?? '');
    setError(null);
  }, [isOpen, member]);

  if (!isOpen) return null;

  const isEdit = member !== null;
  const canSubmit = Boolean(roleId) && (isEdit || email.trim().length > 0) && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim(), roleId });
      onClose();
    } catch (err) {
      setError((err as ApiError).message || 'Gagal menyimpan anggota');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-member-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="org-member-modal-title" className="text-xl font-semibold text-[var(--text-primary)]">
            {isEdit ? 'Ganti role anggota' : 'Tambah anggota'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {isEdit ? (
            <div className="rounded-md bg-[var(--bg-main)] px-3 py-2 text-sm">
              <div className="font-medium text-[var(--text-primary)]">{member.username || member.email}</div>
              <div className="text-[var(--text-secondary)]">{member.email}</div>
            </div>
          ) : (
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              helpText="User harus sudah terdaftar di Bagdja."
            />
          )}

          <Select
            label="Role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={submitting}
          >
            <option value="" disabled>
              Pilih role
            </option>
            {roles.map((role) => {
              const reason = blockedReason(role, isOwner, mine);
              return (
                <option key={role.id} value={role.id} disabled={reason !== null}>
                  {role.name}
                  {reason ? ` (${reason})` : ''}
                </option>
              );
            })}
          </Select>

          {error && (
            <div
              className="rounded-md border border-[var(--brand-error)]/30 bg-[var(--brand-error)]/20 p-3 text-sm text-[var(--brand-error)]"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

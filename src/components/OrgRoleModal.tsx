'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import {
  groupPermissions,
  type AssignablePermission,
  type CreateOrgRoleRequest,
  type OrgRole,
} from '@/lib/org-access-api';
import type { ApiError } from '@/types';

interface OrgRoleModalProps {
  isOpen: boolean;
  /** `null` = buat role baru. */
  role: OrgRole | null;
  catalog: AssignablePermission[];
  onClose: () => void;
  onSubmit: (data: CreateOrgRoleRequest & { isActive: boolean }) => Promise<void>;
}

export default function OrgRoleModal({ isOpen, role, catalog, onClose, onSubmit }: OrgRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setIsActive(role?.isActive ?? true);
    setSelected(new Set(role?.permissions ?? []));
    setError(null);
  }, [isOpen, role]);

  // Key yang sudah ada di role tapi tidak ada di katalog org ini tetap
  // ditampilkan supaya tidak hilang diam-diam saat disimpan.
  const groups = useMemo(() => {
    const known = new Set(catalog.map((p) => p.key));
    const extra: AssignablePermission[] = (role?.permissions ?? [])
      .filter((key) => !known.has(key))
      .map((key) => ({ key, description: null, grantable: false }));
    return groupPermissions([...catalog, ...extra]);
  }, [catalog, role]);

  if (!isOpen) return null;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        permissions: Array.from(selected).sort(),
        isActive,
      });
      onClose();
    } catch (err) {
      setError((err as ApiError).message || 'Gagal menyimpan role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-role-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-default)] p-6 pb-4">
          <h2 id="org-role-modal-title" className="text-xl font-semibold text-[var(--text-primary)]">
            {role ? `Ubah role ${role.name}` : 'Buat role'}
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

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <Input
            label="Nama role"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            maxLength={50}
          />
          <Input
            label="Deskripsi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            maxLength={255}
          />
          {role && (
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={submitting}
              />
              Aktif (role nonaktif tidak memberi permission apa pun)
            </label>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Permission</span>
              <span className="text-xs text-[var(--text-secondary)]">{selected.size} dipilih</span>
            </div>
            <p className="mb-3 text-xs text-[var(--text-secondary)]">
              Permission yang tidak Anda miliki tidak bisa dicentang.
            </p>
            <div className="space-y-4">
              {groups.map(({ group, items }) => (
                <fieldset key={group} className="rounded-md border border-[var(--border-default)] p-3">
                  <legend className="px-1 font-mono text-xs font-semibold text-[var(--text-secondary)]">
                    {group}
                  </legend>
                  <div className="space-y-2">
                    {items.map((permission) => {
                      const checked = selected.has(permission.key);
                      // Dikunci di kedua arah: auth menolak pengelola yang
                      // mengubah role berisi key di luar haknya.
                      const locked = !permission.grantable || submitting;
                      return (
                        <label
                          key={permission.key}
                          className={`flex items-start gap-2 text-sm ${locked ? 'opacity-50' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggle(permission.key)}
                          />
                          <span className="min-w-0">
                            <span className="block break-all font-mono text-xs text-[var(--text-primary)]">
                              {permission.key}
                            </span>
                            {permission.description && (
                              <span className="block text-xs text-[var(--text-secondary)]">
                                {permission.description}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          {error && (
            <div
              className="rounded-md border border-[var(--brand-error)]/30 bg-[var(--brand-error)]/20 p-3 text-sm text-[var(--brand-error)]"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-default)] p-6 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || name.trim().length < 2}>
            {submitting ? 'Menyimpan...' : role ? 'Simpan' : 'Buat role'}
          </Button>
        </div>
      </div>
    </div>
  );
}

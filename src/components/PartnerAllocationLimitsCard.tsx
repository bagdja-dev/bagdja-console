'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Input } from '@/ui/input';
import {
  deletePartnerAllocationLimit,
  listPartnerAllocationLimits,
  upsertPartnerAllocationLimit,
  type PartnerAllocationLimit,
} from '@/lib/payment-api';

const WILDCARD = '*';
const TYPE_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;

interface PartnerAllocationLimitsCardProps {
  appId: string;
  orgId?: string;
  onShowAlert: (message: string, type?: string, title?: string) => void;
}

interface FormState {
  partnerType: string;
  maxPercentage: string;
  maxTotalPercentage: string;
}

const EMPTY_FORM: FormState = { partnerType: '', maxPercentage: '', maxTotalPercentage: '' };

function typeLabel(type: string): string {
  return type === WILDCARD ? 'Semua tipe lain (*)' : type;
}

function parsePercent(raw: string): number | null {
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
}

/**
 * Atap alokasi partner (D9 lapis 1) — pemilik App menentukan persen maksimum
 * yang boleh dialokasikan App ke tiap tipe partner. Batas per partner diisi
 * App atas nama Tenant; yang berlaku adalah yang terkecil.
 */
export default function PartnerAllocationLimitsCard({
  appId,
  orgId,
  onShowAlert,
}: PartnerAllocationLimitsCardProps) {
  const [limits, setLimits] = useState<PartnerAllocationLimit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingType, setEditingType] = useState<string | null>(null);
  const showAlertRef = useRef(onShowAlert);
  showAlertRef.current = onShowAlert;

  const load = useCallback(async () => {
    if (!appId) return;
    try {
      setLoading(true);
      setLimits(await listPartnerAllocationLimits(appId, orgId));
    } catch (err) {
      showAlertRef.current(
        (err as { message?: string })?.message || 'Gagal memuat atap alokasi partner',
        'error',
        'Error',
      );
    } finally {
      setLoading(false);
    }
  }, [appId, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingType(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (limit: PartnerAllocationLimit) => {
    setEditingType(limit.partner_type);
    setForm({
      partnerType: limit.partner_type,
      maxPercentage: String(limit.max_percentage),
      maxTotalPercentage:
        limit.max_total_percentage === null ? '' : String(limit.max_total_percentage),
    });
    setFormOpen(true);
  };

  const partnerType = form.partnerType.trim().toLowerCase();
  const isWildcard = partnerType === WILDCARD;
  const typeValid = isWildcard || TYPE_PATTERN.test(partnerType);
  const maxPct = parsePercent(form.maxPercentage);
  const totalPct = form.maxTotalPercentage.trim() ? parsePercent(form.maxTotalPercentage) : null;
  const totalValid = !form.maxTotalPercentage.trim() || totalPct !== null;
  const canSave = typeValid && maxPct !== null && totalValid && !saving;

  const save = async () => {
    if (!canSave || maxPct === null) return;
    try {
      setSaving(true);
      const saved = await upsertPartnerAllocationLimit(
        {
          app_id: appId,
          partner_type: partnerType,
          max_percentage: maxPct,
          max_total_percentage: isWildcard ? totalPct : null,
        },
        orgId,
      );
      setLimits((prev) => {
        const rest = prev.filter((l) => l.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.partner_type.localeCompare(b.partner_type));
      });
      setFormOpen(false);
    } catch (err) {
      showAlertRef.current(
        (err as { message?: string })?.message || 'Gagal menyimpan atap',
        'error',
        'Error',
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (limit: PartnerAllocationLimit) => {
    if (!window.confirm(`Hapus atap untuk ${typeLabel(limit.partner_type)}? Tipe ini jadi tanpa batas dari App.`)) {
      return;
    }
    try {
      setDeletingId(limit.id);
      await deletePartnerAllocationLimit(limit.id, orgId);
      setLimits((prev) => prev.filter((l) => l.id !== limit.id));
    } catch (err) {
      showAlertRef.current(
        (err as { message?: string })?.message || 'Gagal menghapus atap',
        'error',
        'Error',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Atap Alokasi Partner</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Persen maksimum dari total transaksi yang boleh dibagikan app ini ke tiap tipe partner
            (outlet, driver, …). Tenant masih bisa membatasi tiap partner lebih ketat; yang berlaku
            adalah yang terkecil.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Tambah atap
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="mb-4 rounded-lg border border-[var(--border-default)] bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Tipe partner"
              placeholder="driver, outlet, atau *"
              value={form.partnerType}
              disabled={editingType !== null}
              onChange={(e) => setForm((f) => ({ ...f, partnerType: e.target.value }))}
              error={form.partnerType && !typeValid ? 'Huruf kecil/angka/_, atau *' : undefined}
            />
            <Input
              label="Maks. per partner (%)"
              inputMode="decimal"
              placeholder="30"
              value={form.maxPercentage}
              onChange={(e) => setForm((f) => ({ ...f, maxPercentage: e.target.value }))}
              error={form.maxPercentage && maxPct === null ? '0–100' : undefined}
            />
            <Input
              label="Maks. total semua partner (%)"
              inputMode="decimal"
              placeholder={isWildcard ? 'opsional, mis. 90' : "hanya untuk tipe *"}
              value={isWildcard ? form.maxTotalPercentage : ''}
              disabled={!isWildcard}
              onChange={(e) => setForm((f) => ({ ...f, maxTotalPercentage: e.target.value }))}
              error={!totalValid ? '0–100' : undefined}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Tipe <span className="font-mono">*</span> berlaku untuk tipe yang belum punya atap sendiri,
            dan bisa membatasi total semua bagian partner dalam satu transaksi.
          </p>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {loading && limits.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-secondary)]">Memuat atap...</p>
      ) : limits.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
          Belum ada atap — app ini bebas menentukan bagian partner (dalam batas sisa setelah fee).
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-default)]">
          {limits.map((limit) => (
            <li key={limit.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {typeLabel(limit.partner_type)}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Maks. {limit.max_percentage}% per partner
                  {limit.max_total_percentage !== null
                    ? ` · total semua partner maks. ${limit.max_total_percentage}%`
                    : ''}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(limit)}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--action-primary)]"
                  title="Ubah"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(limit)}
                  disabled={deletingId === limit.id}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-danger)] disabled:opacity-50"
                  title="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

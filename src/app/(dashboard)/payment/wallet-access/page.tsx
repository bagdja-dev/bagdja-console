'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck, UserPlus, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import { getActiveOrganizationSlug } from '@/lib/auth';
import { findUserByUsernameOrEmail, getUserById } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import {
  getOrgWalletMemberUsage,
  listOrgWalletSpendGrants,
  listWallets,
  revokeOrgWalletSpendGrant,
  updateOrgWalletSpendGrant,
  upsertOrgWalletSpendGrant,
  type OrgWalletMemberUsage,
  type OrgWalletSpendGrant,
  type Wallet,
} from '@/lib/payment-api';
import type { ApiError, User } from '@/types';

type LimitForm = { perTransactionLimit: string; monthlyLimit: string };
const EMPTY_LIMITS: LimitForm = { perTransactionLimit: '', monthlyLimit: '' };

/** '' = tanpa batas (null); selain itu harus angka positif. */
function parseLimit(value: string): number | null | 'invalid' {
  const trimmed = value.replace(/[^\d]/g, '');
  if (!trimmed) return null;
  const amount = Number(trimmed);
  return amount > 0 ? amount : 'invalid';
}

function errorText(error: unknown, fallback: string): string {
  return (error as Partial<ApiError> | undefined)?.message || fallback;
}

/**
 * D18: owner org memberi anggota izin belanja pakai wallet org (checkout) dengan
 * batas per transaksi & bulanan. Withdraw dana org tetap hanya owner.
 * Kepemilikan dicek payment-service; non-owner menerima 403.
 */
function WalletAccessContent() {
  const searchParams = useSearchParams();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState<string>(searchParams.get('walletId') || '');
  const [grants, setGrants] = useState<OrgWalletSpendGrant[] | null>(null);
  const [members, setMembers] = useState<Record<string, User | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [newLimits, setNewLimits] = useState<LimitForm>(EMPTY_LIMITS);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<OrgWalletSpendGrant | null>(null);
  const [editLimits, setEditLimits] = useState<LimitForm>(EMPTY_LIMITS);
  const [usageOf, setUsageOf] = useState<OrgWalletSpendGrant | null>(null);
  const [usage, setUsage] = useState<OrgWalletMemberUsage | null>(null);

  const wallet = useMemo(() => wallets.find((item) => item.id === walletId) ?? null, [walletId, wallets]);
  const currency = wallet?.currency_code || 'IDR';

  useEffect(() => {
    const orgSlug = getActiveOrganizationSlug();
    if (!orgSlug) {
      setError('Select an organization first.');
      setLoading(false);
      return;
    }
    listWallets(orgSlug)
      .then((list) => {
        const active = (list || []).filter((item) => item.is_active);
        setWallets(active);
        setWalletId((current) => (current && active.some((item) => item.id === current) ? current : active[0]?.id || ''));
        if (active.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError(errorText(err, 'Failed to load organization wallets'));
        setLoading(false);
      });
  }, []);

  const loadGrants = useCallback(async () => {
    if (!walletId) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const list = await listOrgWalletSpendGrants(walletId);
      setGrants(list);
      const missing = list.map((grant) => grant.userId).filter((id) => !(id in members));
      if (missing.length > 0) {
        const resolved = await Promise.all(
          missing.map(async (id) => [id, await getUserById(id).catch(() => null)] as const),
        );
        setMembers((prev) => ({ ...prev, ...Object.fromEntries(resolved) }));
      }
    } catch (err) {
      if ((err as Partial<ApiError>)?.statusCode === 403) setForbidden(true);
      else setError(errorText(err, 'Failed to load wallet access'));
      setGrants(null);
    } finally {
      setLoading(false);
    }
    // `members` hanya cache nama; tidak perlu memicu muat ulang grant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  useEffect(() => {
    void loadGrants();
  }, [loadGrants]);

  const addMember = async () => {
    const perTransactionLimit = parseLimit(newLimits.perTransactionLimit);
    const monthlyLimit = parseLimit(newLimits.monthlyLimit);
    if (perTransactionLimit === 'invalid' || monthlyLimit === 'invalid') {
      setError('Limits must be positive amounts, or empty for no limit.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const user = await findUserByUsernameOrEmail(identifier.trim());
      setMembers((prev) => ({ ...prev, [user.id]: user }));
      await upsertOrgWalletSpendGrant(walletId, user.id, { perTransactionLimit, monthlyLimit });
      setIdentifier('');
      setNewLimits(EMPTY_LIMITS);
      await loadGrants();
    } catch (err) {
      setError(errorText(err, 'Failed to grant access'));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const perTransactionLimit = parseLimit(editLimits.perTransactionLimit);
    const monthlyLimit = parseLimit(editLimits.monthlyLimit);
    if (perTransactionLimit === 'invalid' || monthlyLimit === 'invalid') {
      setError('Limits must be positive amounts, or empty for no limit.');
      return;
    }
    setSaving(true);
    try {
      await updateOrgWalletSpendGrant(walletId, editing.userId, { perTransactionLimit, monthlyLimit, isActive: true });
      setEditing(null);
      await loadGrants();
    } catch (err) {
      setError(errorText(err, 'Failed to update limits'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (grant: OrgWalletSpendGrant) => {
    setSaving(true);
    try {
      if (grant.isActive) await revokeOrgWalletSpendGrant(walletId, grant.userId);
      else await updateOrgWalletSpendGrant(walletId, grant.userId, { isActive: true });
      await loadGrants();
    } catch (err) {
      setError(errorText(err, 'Failed to change access'));
    } finally {
      setSaving(false);
    }
  };

  const openUsage = async (grant: OrgWalletSpendGrant) => {
    setUsageOf(grant);
    setUsage(null);
    try {
      setUsage(await getOrgWalletMemberUsage(walletId, grant.userId));
    } catch (err) {
      setError(errorText(err, 'Failed to load spending history'));
      setUsageOf(null);
    }
  };

  const memberLabel = (userId: string) => {
    const user = members[userId];
    return user ? user.name || user.username || user.email : userId;
  };
  const limitText = (value: number | null) => (value == null ? 'No limit' : formatMoney(value, currency));

  return (
    <div className="flex min-h-full flex-col space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-[var(--action-primary)]" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Wallet Access</h1>
        </div>
        <p className="mt-2 text-[var(--text-secondary)]">
          Let organization members pay with an organization wallet at checkout, within limits you set. Members
          confirm every payment with their own PIN. Only the owner can withdraw organization funds.
        </p>
      </div>

      {wallets.length > 0 && (
        <div className="max-w-xs">
          <Select label="Organization wallet" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
            {wallets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.currency_code} — {formatMoney(Number(item.balance), item.currency_code)}
              </option>
            ))}
          </Select>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      )}

      {forbidden ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-[var(--text-primary)]">
          Only the organization owner can manage wallet access.
        </div>
      ) : !loading && wallets.length === 0 && !error ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
          This organization has no active wallet yet.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Give a member access</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Member email or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="budi@example.com"
                disabled={saving || !walletId}
              />
              <Input
                label={`Per transaction limit (${currency})`}
                inputMode="numeric"
                value={newLimits.perTransactionLimit}
                onChange={(e) => setNewLimits((prev) => ({ ...prev, perTransactionLimit: e.target.value }))}
                placeholder="Empty = no limit"
                disabled={saving || !walletId}
              />
              <Input
                label={`Monthly limit (${currency})`}
                inputMode="numeric"
                value={newLimits.monthlyLimit}
                onChange={(e) => setNewLimits((prev) => ({ ...prev, monthlyLimit: e.target.value }))}
                placeholder="Empty = no limit"
                disabled={saving || !walletId}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={addMember} disabled={saving || !walletId || !identifier.trim()}>
                {saving ? 'Saving…' : 'Grant access'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-[var(--border-default)] text-left text-xs uppercase text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Per transaction</th>
                  <th className="px-4 py-3">Monthly limit</th>
                  <th className="px-4 py-3">Used this month</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Loading…
                    </td>
                  </tr>
                ) : !grants || grants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-secondary)]">
                      No member has access to this wallet yet.
                    </td>
                  </tr>
                ) : (
                  grants.map((grant) => (
                    <tr key={grant.id} className="border-b border-[var(--border-default)] last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-primary)]">{memberLabel(grant.userId)}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{members[grant.userId]?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">{limitText(grant.perTransactionLimit)}</td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">{limitText(grant.monthlyLimit)}</td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">{formatMoney(grant.monthlyUsed, currency)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            grant.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--bg-main)] text-[var(--text-secondary)]',
                          ].join(' ')}
                        >
                          {grant.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3 text-xs font-medium">
                          <button
                            type="button"
                            className="text-[var(--action-primary)] hover:underline"
                            onClick={() => void openUsage(grant)}
                          >
                            History
                          </button>
                          <button
                            type="button"
                            className="text-[var(--action-primary)] hover:underline"
                            onClick={() => {
                              setEditing(grant);
                              setEditLimits({
                                perTransactionLimit: grant.perTransactionLimit?.toString() || '',
                                monthlyLimit: grant.monthlyLimit?.toString() || '',
                              });
                            }}
                          >
                            Edit limits
                          </button>
                          <button
                            type="button"
                            className={grant.isActive ? 'text-red-500 hover:underline' : 'text-emerald-500 hover:underline'}
                            onClick={() => void toggleActive(grant)}
                            disabled={saving}
                          >
                            {grant.isActive ? 'Revoke' : 'Restore'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Limits for {memberLabel(editing.userId)}</h3>
              <button type="button" onClick={() => setEditing(null)} className="rounded p-1 hover:bg-[var(--bg-hover)]">
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <Input
              label={`Per transaction limit (${currency})`}
              inputMode="numeric"
              value={editLimits.perTransactionLimit}
              onChange={(e) => setEditLimits((prev) => ({ ...prev, perTransactionLimit: e.target.value }))}
              placeholder="Empty = no limit"
            />
            <Input
              label={`Monthly limit (${currency})`}
              inputMode="numeric"
              value={editLimits.monthlyLimit}
              onChange={(e) => setEditLimits((prev) => ({ ...prev, monthlyLimit: e.target.value }))}
              placeholder="Empty = no limit"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {usageOf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Spending by {memberLabel(usageOf.userId)}</h3>
              <button type="button" onClick={() => setUsageOf(null)} className="rounded p-1 hover:bg-[var(--bg-hover)]">
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            {!usage ? (
              <p className="text-sm text-[var(--text-secondary)]">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Loading…
              </p>
            ) : (
              <>
                <p className="text-sm text-[var(--text-secondary)]">
                  This month: <strong className="text-[var(--text-primary)]">{formatMoney(usage.monthlyUsed, currency)}</strong>
                  {usageOf.monthlyLimit != null && <> of {formatMoney(usageOf.monthlyLimit, currency)}</>}
                </p>
                {usage.transactions.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">No payments yet.</p>
                ) : (
                  <ul className="divide-y divide-[var(--border-default)] text-sm">
                    {usage.transactions.map((tx) => (
                      <li key={tx.id} className="flex justify-between gap-3 py-2">
                        <span className="text-[var(--text-primary)]">
                          {tx.description || tx.type}
                          <span className="block text-xs text-[var(--text-secondary)]">
                            {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </span>
                        <span className="font-medium tabular-nums text-[var(--text-primary)]">
                          {formatMoney(Math.abs(tx.amount), currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalletAccessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--text-secondary)]">Loading…</div>}>
      <WalletAccessContent />
    </Suspense>
  );
}

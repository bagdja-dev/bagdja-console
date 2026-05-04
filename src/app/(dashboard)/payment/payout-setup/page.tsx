'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/button';
import { Select } from '@/ui/select';
import {
  createPayoutAccount,
  getPayoutAccountById,
  listPayoutAccounts,
  updatePayoutAccount,
  type PayoutAccount,
  type CreatePayoutAccountRequest,
} from '@/lib/payment-api';
import type { ApiError } from '@/types';
import PayoutAccountModal from '@/components/PayoutAccountModal';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function PayoutSetupPage() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState<PayoutAccount[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalAccount, setModalAccount] = useState<PayoutAccount | null>(null);
  const [modalLoadingInitial, setModalLoadingInitial] = useState(false);

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  const load = useCallback(async () => {
    try {
      setLoadingList(true);
      setError(null);
      const result = await listPayoutAccounts({ page, size });
      setItems(result.data || []);
      setTotal(result.total || 0);
      setLimit(result.limit || size);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load payout accounts');
    } finally {
      setLoadingList(false);
    }
  }, [page, size]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setError(null);
    setModalMode('create');
    setModalAccount(null);
    setModalLoadingInitial(false);
    setModalOpen(true);
  };

  const openEdit = async (account: PayoutAccount) => {
    setError(null);
    setModalMode('edit');
    setModalAccount(account);
    setModalLoadingInitial(true);
    setModalOpen(true);

    try {
      const detail = await getPayoutAccountById(account.id);
      setModalAccount(detail);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load payout account');
      setModalOpen(false);
      setModalAccount(null);
    } finally {
      setModalLoadingInitial(false);
    }
  };

  const closeModal = () => {
    if (modalLoadingInitial) return;
    setModalOpen(false);
    setModalAccount(null);
    setModalLoadingInitial(false);
  };

  const handleModalSubmit = async (payload: CreatePayoutAccountRequest, accountId?: string) => {
    setError(null);
    if (modalMode === 'create') {
      await createPayoutAccount(payload);
      setPage(1);
      await load();
      return;
    }

    if (modalMode === 'edit' && accountId) {
      await updatePayoutAccount(accountId, payload);
      await load();
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Payout Setup</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Configure where your earnings will be paid out.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-md bg-[var(--brand-error)]/20 border border-[var(--brand-error)]/30 p-4 text-sm text-[var(--brand-error)]"
          role="alert"
        >
          {error}
        </div>
      )}

      <PayoutAccountModal
        isOpen={modalOpen}
        mode={modalMode}
        account={modalAccount}
        isLoadingInitial={modalLoadingInitial}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Payout accounts</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Add and manage payout destinations for your organization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={load}
              disabled={loadingList || modalOpen}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreate}
              disabled={modalOpen}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border-default)] bg-[var(--bg-main)]">
              <tr className="text-xs text-[var(--text-secondary)]">
                <th className="px-6 py-3 font-medium">Currency</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Holder</th>
                <th className="px-6 py-3 font-medium">Identifier</th>
                <th className="px-6 py-3 font-medium">Verified</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr className="border-b border-[var(--border-default)] last:border-0">
                  <td className="px-6 py-5 text-[var(--text-secondary)]" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr className="border-b border-[var(--border-default)] last:border-0">
                  <td className="px-6 py-5 text-[var(--text-secondary)]" colSpan={7}>
                    No payout accounts yet. Click “Add” to create one.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--border-default)] last:border-0">
                    <td className="px-6 py-4 text-[var(--text-primary)]">{item.currency_code}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{item.payout_method}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{item.account_holder_name}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{item.account_identifier}</td>
                    <td className="px-6 py-4">
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                          item.is_verified
                            ? 'border-[var(--action-primary)]/40 bg-[var(--action-primary)]/10 text-[var(--text-primary)]'
                            : 'border-[var(--border-default)] bg-[var(--bg-main)] text-[var(--text-secondary)]',
                        ].join(' ')}
                      >
                        {item.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{formatDate(item.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(item)}
                        disabled={modalOpen}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-default)] bg-[var(--bg-main)] px-6 py-4">
          <div className="text-sm text-[var(--text-secondary)]">
            Total: <span className="text-[var(--text-primary)] font-medium">{total}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">Page</span>
              <Select
                value={String(page)}
                onChange={(e) => setPage(Number(e.target.value))}
                disabled={loadingList || modalOpen}
                className="w-24"
              >
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const p = idx + 1;
                  return (
                    <option key={p} value={String(p)}>
                      {p}
                    </option>
                  );
                })}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">Size</span>
              <Select
                value={String(size)}
                onChange={(e) => {
                  setPage(1);
                  setSize(Number(e.target.value));
                }}
                disabled={loadingList || modalOpen}
                className="w-28"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  CheckCircle2,
  Edit2,
  Landmark,
  Plus,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import DataGrid, { type FilterField, type GridAction, type GridColumn } from '@/components/DataGrid';
import PayoutChannelModal from '@/components/PayoutChannelModal';
import PayoutMethodModal from '@/components/PayoutMethodModal';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal, { type AlertType } from '@/components/AlertModal';
import { useLayout } from '@/context/LayoutContext';
import { formatMoney } from '@/lib/money';
import { PAYOUT_PERMISSIONS } from '@/lib/payout-permissions';
import { useOrganizationPermissions } from '@/lib/use-organization-permissions';
import {
  createPayoutMethod,
  createPayoutMethodFee,
  deletePayoutMethodFee,
  listAllPayoutMethods,
  listPayoutMethodFees,
  updatePayoutMethod,
  updatePayoutMethodFee,
  type PayoutMethod,
  type PayoutMethodFee,
  type PayoutMethodFeePayload,
  type PayoutMethodPayload,
} from '@/lib/payment-api';

type Tab = 'channels' | 'methods';

const PROVIDER_LABELS: Record<string, string> = {
  manual: 'Manual',
  midtrans: 'Midtrans Iris',
  duitku: 'Duitku',
};

const channelFilters: FilterField[] = [
  {
    key: 'provider',
    label: 'Engine',
    type: 'select',
    options: [
      { label: 'Manual', value: 'manual' },
      { label: 'Midtrans Iris', value: 'midtrans' },
      { label: 'Duitku', value: 'duitku' },
    ],
  },
  { key: 'methodCode', label: 'Method', type: 'text', placeholder: 'e.g. BCA' },
  { key: 'orgId', label: 'Org ID', type: 'text', placeholder: "org slug or 'default'" },
  { key: 'appId', label: 'App ID', type: 'text', placeholder: "app slug or 'default'" },
  {
    key: 'isActive',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
  },
];

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 text-[10px] font-bold uppercase rounded-md border border-green-500/20">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-600 text-[10px] font-bold uppercase rounded-md border border-red-500/20">
      <XCircle className="w-3 h-3" /> Inactive
    </span>
  );
}

function describeFee(row: PayoutMethodFee): string {
  const parts: string[] = [];
  if (row.fixedFee > 0) parts.push(formatMoney(row.fixedFee, row.currency));
  if (row.percentageFee > 0) parts.push(`${row.percentageFee}%`);
  if (parts.length === 0) return 'Gratis';
  const bounds: string[] = [];
  if (row.minFee != null) bounds.push(`min ${formatMoney(row.minFee, row.currency)}`);
  if (row.maxFee != null) bounds.push(`maks ${formatMoney(row.maxFee, row.currency)}`);
  return parts.join(' + ') + (bounds.length ? ` (${bounds.join(', ')})` : '');
}

/**
 * Konfigurasi payout platform: katalog metode tujuan dan channel
 * (engine × metode) beserta biayanya. refactor-payout-flow-plan.md §4.6.
 */
export default function PayoutChannelsPage() {
  const [tab, setTab] = useState<Tab>('channels');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [channelModal, setChannelModal] = useState<{ open: boolean; mode: 'create' | 'edit'; row: PayoutMethodFee | null }>({
    open: false,
    mode: 'create',
    row: null,
  });
  const [methodModal, setMethodModal] = useState<{ open: boolean; mode: 'create' | 'edit'; row: PayoutMethod | null }>({
    open: false,
    mode: 'create',
    row: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<PayoutMethodFee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const { loading: permissionsLoading, hasSystemPermission } = useOrganizationPermissions();
  const canManage = hasSystemPermission(PAYOUT_PERMISSIONS.CHANNELS_MANAGE);

  const { setTopbarContent } = useLayout();
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderVisibleRef = useRef(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting === isHeaderVisibleRef.current) return;
        isHeaderVisibleRef.current = entry.isIntersecting;
        setTopbarContent(
          entry.isIntersecting ? null : (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="p-1.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)]">
                <ArrowDownLeft className="h-4 w-4 text-[var(--action-primary)]" />
              </div>
              <h1 className="text-sm font-bold text-[var(--text-primary)] leading-none">Payout Channels</h1>
            </div>
          ),
        );
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' },
    );
    if (headerRef.current) observer.observe(headerRef.current);
    return () => {
      observer.disconnect();
      setTopbarContent(null);
    };
  }, [setTopbarContent]);

  const loadMethods = useCallback(async () => {
    try {
      setMethods(await listAllPayoutMethods());
    } catch {
      setMethods([]);
    }
  }, []);

  useEffect(() => {
    if (canManage) loadMethods();
  }, [canManage, loadMethods, refreshTrigger]);

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlertState({ isOpen: true, type, title, message });

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const fetchChannels = useCallback(
    async (params?: { page: number; size: number; filter?: Record<string, string> }) => {
      const response = await listPayoutMethodFees({
        page: params?.page,
        limit: params?.size,
        ...params?.filter,
      });
      return {
        data: response.data,
        meta: {
          totalItems: response.total,
          itemCount: response.data.length,
          itemsPerPage: response.limit,
          totalPages: Math.max(1, Math.ceil(response.total / response.limit)),
          currentPage: response.page,
        },
      };
    },
    [],
  );

  const fetchMethods = useCallback(async () => {
    const data = await listAllPayoutMethods();
    return {
      data,
      meta: {
        totalItems: data.length,
        itemCount: data.length,
        itemsPerPage: data.length || 1,
        totalPages: 1,
        currentPage: 1,
      },
    };
  }, []);

  const methodName = (code: string) => methods.find((m) => m.code === code)?.name || code;

  const handleSaveChannel = async (payload: PayoutMethodFeePayload) => {
    if (channelModal.mode === 'edit' && channelModal.row) {
      await updatePayoutMethodFee(channelModal.row.id, payload);
      showAlert('success', 'Updated', 'Payout channel has been updated.');
    } else {
      await createPayoutMethodFee(payload);
      showAlert('success', 'Created', 'Payout channel has been added.');
    }
    refresh();
  };

  const handleSaveMethod = async (payload: PayoutMethodPayload) => {
    if (methodModal.mode === 'edit' && methodModal.row) {
      await updatePayoutMethod(methodModal.row.code, payload);
      showAlert('success', 'Updated', 'Payout method has been updated.');
    } else {
      await createPayoutMethod(payload);
      showAlert('success', 'Created', 'Payout method has been added.');
    }
    refresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePayoutMethodFee(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
      showAlert('success', 'Deleted', 'Payout channel has been removed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : (error as { message?: string })?.message || 'Failed to delete payout channel';
      showAlert('error', 'Delete failed', message);
    } finally {
      setIsDeleting(false);
    }
  };

  const channelColumns: GridColumn[] = [
    {
      key: 'methodCode',
      label: 'Destination',
      render: (val) => (
        <div>
          <div className="text-sm font-medium text-[var(--text-primary)]">{methodName(val)}</div>
          <div className="text-xs font-mono text-[var(--text-secondary)]">{val}</div>
        </div>
      ),
    },
    {
      key: 'provider',
      label: 'Engine',
      render: (val, row) => (
        <div>
          <div className="text-sm text-[var(--text-primary)]">{PROVIDER_LABELS[val] || val}</div>
          {(row as PayoutMethodFee).providerMethodCode && (
            <div className="text-xs font-mono text-[var(--text-secondary)]">
              code: {(row as PayoutMethodFee).providerMethodCode}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'orgId',
      label: 'Scope',
      render: (_, row) => {
        const r = row as PayoutMethodFee;
        const isGlobal = r.orgId === 'default' && r.appId === 'default';
        return (
          <span className={`font-mono text-xs ${isGlobal ? 'text-primary font-bold' : 'text-[var(--text-primary)]'}`}>
            {isGlobal ? 'Global' : `${r.orgId === 'default' ? 'all orgs' : r.orgId} / ${r.appId === 'default' ? 'all apps' : r.appId}`}
          </span>
        );
      },
    },
    {
      key: 'fee',
      label: 'Fee to user',
      render: (_, row) => {
        const r = row as PayoutMethodFee;
        return (
          <div>
            <div className="text-sm text-[var(--text-primary)]">{describeFee(r)}</div>
            {r.providerCost != null && (
              <div className="text-xs text-[var(--text-secondary)]">
                cost: {formatMoney(r.providerCost, r.currency)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'limits',
      label: 'Limits & ETA',
      render: (_, row) => {
        const r = row as PayoutMethodFee;
        const limits = [
          r.minAmount != null ? `≥ ${formatMoney(r.minAmount, r.currency)}` : null,
          r.maxAmount != null ? `≤ ${formatMoney(r.maxAmount, r.currency)}` : null,
        ].filter(Boolean);
        return (
          <div className="text-xs text-[var(--text-secondary)]">
            <div>{limits.length ? limits.join(' · ') : 'Tanpa batas'}</div>
            <div>{r.estimatedTime || '—'}</div>
          </div>
        );
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (val) => <span className="text-sm text-[var(--text-primary)]">{val}</span>,
    },
    { key: 'isActive', label: 'Status', render: (val) => <StatusBadge active={Boolean(val)} /> },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setChannelModal({ open: true, mode: 'edit', row: row as PayoutMethodFee })}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-primary/10 hover:text-primary"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row as PayoutMethodFee)}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const methodColumns: GridColumn[] = [
    {
      key: 'code',
      label: 'Code',
      render: (val) => <span className="font-mono text-sm text-[var(--text-primary)]">{val}</span>,
    },
    { key: 'name', label: 'Name', render: (val) => <span className="text-sm text-[var(--text-primary)]">{val}</span> },
    {
      key: 'methodType',
      label: 'Type',
      render: (val) => (
        <span className="px-2 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-default)] text-[10px] font-bold rounded uppercase">
          {val === 'bank' ? 'Bank' : 'E-wallet'}
        </span>
      ),
    },
    { key: 'currency', label: 'Currency', render: (val) => <span className="text-sm">{val}</span> },
    { key: 'isActive', label: 'Status', render: (val) => <StatusBadge active={Boolean(val)} /> },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setMethodModal({ open: true, mode: 'edit', row: row as PayoutMethod })}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-primary/10 hover:text-primary"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const channelActions: GridAction[] = [
    {
      label: '',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => setChannelModal({ open: true, mode: 'create', row: null }),
      variant: 'secondary',
    },
  ];

  const methodActions: GridAction[] = [
    {
      label: '',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => setMethodModal({ open: true, mode: 'create', row: null }),
      variant: 'secondary',
    },
  ];

  const tabClass = (active: boolean) =>
    `pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
      active
        ? 'border-[var(--action-primary)] text-[var(--action-primary)]'
        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <div className="flex flex-col min-h-full space-y-6">
      <div ref={headerRef} className="flex-shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Payout Channels</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Channel = engine × metode tujuan. Biaya dipotong dari nominal penarikan; user memilih channel sendiri.
        </p>
      </div>

      {!permissionsLoading && !canManage ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-500">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p>
            Halaman ini khusus anggota organisasi sistem dengan permission{' '}
            <code className="font-mono">{PAYOUT_PERMISSIONS.CHANNELS_MANAGE}</code>.
          </p>
        </div>
      ) : (
        <>
          <div className="border-b border-[var(--border-default)]">
            <nav className="-mb-px flex gap-6 overflow-x-auto">
              <button type="button" onClick={() => setTab('channels')} className={tabClass(tab === 'channels')}>
                <span className="flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4" /> Channels & Fees
                </span>
              </button>
              <button type="button" onClick={() => setTab('methods')} className={tabClass(tab === 'methods')}>
                <span className="flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> Payout Methods
                </span>
              </button>
            </nav>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-sm overflow-y-auto p-4 md:p-5 h-[calc(100vh-220px)]">
            {tab === 'channels' ? (
              <DataGrid
                key="channels"
                title="Channels & Fees"
                description="Channel aktif per scope beserta biaya ke user"
                columns={channelColumns}
                actions={channelActions}
                fetchData={fetchChannels}
                filterFields={channelFilters}
                refreshTrigger={refreshTrigger}
                emptyState={{
                  title: 'Belum ada channel',
                  description: 'Tambahkan channel untuk metode tujuan yang didukung rekening sumber platform.',
                  icon: <ArrowDownLeft className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />,
                }}
                fullHeight
                isScrollable
              />
            ) : (
              <DataGrid
                key="methods"
                title="Payout Methods"
                description="Katalog bank & e-wallet tujuan. Nonaktifkan, jangan hapus — dipakai rekening & channel."
                columns={methodColumns}
                actions={methodActions}
                fetchData={fetchMethods}
                refreshTrigger={refreshTrigger}
                emptyState={{
                  title: 'Katalog kosong',
                  description: 'Tambahkan metode tujuan payout.',
                  icon: <Landmark className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />,
                }}
                fullHeight
                isScrollable
              />
            )}
          </div>
        </>
      )}

      <PayoutChannelModal
        isOpen={channelModal.open}
        mode={channelModal.mode}
        channel={channelModal.row}
        methods={methods}
        onClose={() => setChannelModal((prev) => ({ ...prev, open: false }))}
        onSubmit={handleSaveChannel}
      />

      <PayoutMethodModal
        isOpen={methodModal.open}
        mode={methodModal.mode}
        method={methodModal.row}
        onClose={() => setMethodModal((prev) => ({ ...prev, open: false }))}
        onSubmit={handleSaveMethod}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete payout channel?"
        message="Withdrawal yang sudah berjalan tidak terpengaruh (biaya tersimpan sebagai snapshot). Pertimbangkan menonaktifkan alih-alih menghapus."
        detail={
          deleteTarget
            ? `${PROVIDER_LABELS[deleteTarget.provider] || deleteTarget.provider} · ${deleteTarget.methodCode} · ${deleteTarget.orgId}/${deleteTarget.appId}`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={isDeleting}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
      />
    </div>
  );
}

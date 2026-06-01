'use client';

import { useState, useCallback, useRef, useEffect, type MouseEvent } from 'react';
import {
  getBillingSettings,
  getGlobalDefaultBillingSetting,
  updateGlobalDefaultBillingSetting,
  upsertBillingSetting,
  deleteBillingSetting,
  type BillingSetting
} from '@/lib/payment-api';
import { formatPercentageFeeForDisplay } from '@/lib/billing-utils';
import { formatRuleKeyLabel, getHierarchyStep } from '@/lib/billing-hierarchy';
import { CreditCard, Plus, Info, CheckCircle2, XCircle, Settings2, Edit2, Trash2 } from 'lucide-react';
import DataGrid, { GridColumn, GridAction, FilterField } from '@/components/DataGrid';
import BillingSettingModal from '@/components/BillingSettingModal';
import GlobalBillingModal from '@/components/GlobalBillingModal';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal, { type AlertType } from '@/components/AlertModal';
import { useLayout } from '@/context/LayoutContext';

const billingFilters: FilterField[] = [
  {
    key: 'org_id',
    label: 'Organization',
    type: 'text',
    placeholder: 'e.g. acme',
  },
  {
    key: 'app_id',
    label: 'Application',
    type: 'text',
    placeholder: 'app slug',
  },
  {
    key: 'item_type',
    label: 'Item Type',
    type: 'select',
    options: [
      { label: 'Default (all)', value: 'default' },
      { label: 'PRODUCT', value: 'PRODUCT' },
      { label: 'PLAN', value: 'PLAN' },
      { label: 'LICENSE KEY', value: 'LICENSE' },
    ],
  },
  {
    key: 'item_id',
    label: 'Item Id',
    type: 'text',
    placeholder: 'item UUID (or default)',
  },
  {
    key: 'currency',
    label: 'Currency',
    type: 'select',
    options: [
      { label: 'IDR', value: 'IDR' },
      { label: 'USD', value: 'USD' },
      { label: 'MYR', value: 'MYR' },
      { label: 'Default (all)', value: 'DEFAULT' },
    ],
  },
  {
    key: 'is_active',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
  },
];

export default function PaymentConfigPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSetting, setSelectedSetting] = useState<BillingSetting | null>(null);
  const [globalDefault, setGlobalDefault] = useState<BillingSetting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillingSetting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ isOpen: false, type: 'info', title: '', message: '' });
  const { setTopbarContent } = useLayout();
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderVisibleRef = useRef(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentlyVisible = entry.isIntersecting;

        if (currentlyVisible !== isHeaderVisibleRef.current) {
          isHeaderVisibleRef.current = currentlyVisible;

          if (!currentlyVisible) {
            setTopbarContent(
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="h-4 w-[1px] bg-[var(--border-default)] mx-2 hidden md:block" />
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--action-primary)]/10">
                    <CreditCard className="h-3.5 w-3.5 text-[var(--action-primary)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
                    Payment Configuration
                  </span>
                </div>
              </div>
            );
          } else {
            setTopbarContent(null);
          }
        }
      },
      {
        threshold: 0,
        rootMargin: '-64px 0px 0px 0px',
      },
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      observer.disconnect();
      setTopbarContent(null);
    };
  }, [setTopbarContent]);

  const fetchData = useCallback(
    async (params?: {
      page: number;
      size: number;
      search?: string;
      filter?: Record<string, string>;
      sort?: string;
    }) => {
      const filter = params?.filter ?? {};
      const [response, globalData] = await Promise.all([
        getBillingSettings({
          page: params?.page,
          limit: params?.size,
          search: params?.search,
          sort: params?.sort,
          org_id: filter.org_id,
          app_id: filter.app_id,
          item_type: filter.item_type,
          item_id: filter.item_id,
          currency: filter.currency,
          is_active: filter.is_active,
        }),
        getGlobalDefaultBillingSetting(),
      ]);
      setGlobalDefault(globalData);
      const limit = response.limit || params?.size || 20;
      const totalItems = response.total ?? 0;
      const currentPage = response.page ?? params?.page ?? 1;
      return {
        data: response.data,
        meta: {
          totalItems,
          itemCount: response.data.length,
          itemsPerPage: limit,
          totalPages: Math.max(1, Math.ceil(totalItems / limit)),
          currentPage,
        },
      };
    },
    [],
  );

  const handleUpsert = async (payload: BillingSetting) => {
    await upsertBillingSetting(payload);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUpdateGlobal = async (payload: Partial<BillingSetting>) => {
    await updateGlobalDefaultBillingSetting(payload);
    setRefreshTrigger(prev => prev + 1);
  };

  const isGlobalDefault = (row: BillingSetting) =>
    row.org_id === 'default' &&
    row.app_id === 'default' &&
    (row.item_type === 'default' || !row.item_type) &&
    (row.item_id === 'default' || !row.item_id) &&
    row.currency === 'DEFAULT';

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message });
  };

  const openDeleteConfirm = (row: BillingSetting, e?: MouseEvent) => {
    e?.stopPropagation();
    if (isGlobalDefault(row)) {
      showAlert(
        'warning',
        'Cannot delete',
        'Global default billing rule cannot be deleted. Edit it instead.',
      );
      return;
    }
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBillingSetting(
        deleteTarget.org_id,
        deleteTarget.app_id,
        deleteTarget.item_type || 'default',
        deleteTarget.item_id || 'default',
        deleteTarget.currency,
      );
      setDeleteTarget(null);
      setRefreshTrigger((prev) => prev + 1);
      showAlert('success', 'Deleted', 'Billing rule has been removed.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete billing rule';
      showAlert('error', 'Delete failed', message);
    } finally {
      setIsDeleting(false);
    }
  };

  const gridActions: GridAction[] = [
    {
      label: '',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => {
        setModalMode('create');
        setSelectedSetting(null);
        setIsModalOpen(true);
      },
      variant: 'secondary'
    }
  ];

  const columns: GridColumn[] = [
    {
      key: 'org_id',
      label: 'Organization',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className={`font-bold ${val === 'default' ? 'text-primary' : 'text-[var(--text-primary)]'}`}>
            {val === 'default' ? 'Global Default' : val}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {formatRuleKeyLabel(
              row.org_id,
              row.app_id,
              row.item_type || 'default',
              row.item_id || 'default',
              row.currency,
            )}
          </span>
          <span className="text-[10px] text-primary font-medium">
            Priority #
            {getHierarchyStep(
              row.org_id,
              row.app_id,
              row.item_type || 'default',
              row.item_id || 'default',
              row.currency,
            )}
          </span>
        </div>
      )
    },
    {
      key: 'app_id',
      label: 'Application',
      sortable: true,
      render: (val) => (
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {val === 'default' ? 'All apps' : val}
        </span>
      ),
    },
    {
      key: 'item_type',
      label: 'Item Type',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)] font-mono uppercase">
          {!val || val === 'default' ? 'ALL' : String(val)}
        </span>
      ),
    },
    {
      key: 'item_id',
      label: 'Item Id',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)] font-mono truncate max-w-[160px] block">
          {!val || val === 'default' ? 'All items' : String(val)}
        </span>
      ),
    },
    {
      key: 'currency',
      label: 'Currency',
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-1 ${val === 'DEFAULT' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-default)]'} text-[10px] font-bold rounded uppercase border`}>
          {val}
        </span>
      )
    },
    {
      key: 'fees',
      label: 'Fee Structure',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] w-12 font-bold uppercase">Fixed:</span>
            <span className="text-sm font-medium">{row.fixed_fee.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] w-12 font-bold uppercase">Perc:</span>
            <span className="text-sm font-medium">{formatPercentageFeeForDisplay(row.percentage_fee)}</span>
          </div>
        </div>
      )
    },
    {
      key: 'constraints',
      label: 'Constraints',
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] w-12 font-bold uppercase">Cap:</span>
            <span className="text-sm">{row.fixed_cap_fee?.toLocaleString() || 'None'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] w-12 font-bold uppercase text-primary">Max:</span>
            <span className="text-sm font-bold text-primary">{row.max_service_fee?.toLocaleString() || 'None'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'updated_at',
      label: 'Updated',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)]">
          {val ? new Date(val).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-1.5">
          {val ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 text-[10px] font-bold uppercase rounded-md border border-green-500/20">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-600 text-[10px] font-bold uppercase rounded-md border border-red-500/20">
              <XCircle className="w-3 h-3" /> Inactive
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_, row: BillingSetting) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => openDeleteConfirm(row, e)}
            disabled={isGlobalDefault(row)}
            title={
              isGlobalDefault(row)
                ? 'Global default cannot be deleted'
                : 'Delete billing rule'
            }
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Header */}
      <div ref={headerRef} className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Payment Configuration
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage system-wide billing rules and transaction fees
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Default Setting Quick View */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)]">Global Default</h3>
              </div>
              {globalDefault && (
                <button
                  onClick={() => setIsGlobalModalOpen(true)}
                  className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  title="Edit Global Default"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {!globalDefault ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-[var(--border-default)] rounded-xl">
                <p className="text-sm text-[var(--text-secondary)] mb-4">No global default configured</p>
                <button
                  type="button"
                  onClick={() => setIsGlobalModalOpen(true)}
                  className="text-xs font-bold text-primary uppercase hover:underline"
                >
                  Create Default Now
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Fixed Fee</span>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{globalDefault.fixed_fee.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Percentage</span>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{formatPercentageFeeForDisplay(globalDefault.percentage_fee)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-default)] grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Threshold (Cap)</span>
                    <p className="text-sm text-[var(--text-primary)]">{globalDefault.fixed_cap_fee?.toLocaleString() || 'None'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Max Service Fee</span>
                    <p className="text-sm font-bold text-primary">{globalDefault.max_service_fee?.toLocaleString() || 'None'}</p>
                  </div>
                </div>

                <div className={`mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${globalDefault.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  {globalDefault.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  System is using these defaults as fallback
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-2 p-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Info className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)]">Billing Hierarchy Logic</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm text-[var(--text-secondary)] flex-1">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p>Rules are matched from <b>Specific</b> (App+Currency) to <b>General</b> (Default+DEFAULT).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p><b>Fixed Cap</b> is the threshold: if transaction &le; cap, use Fixed Fee; else use Percentage (%).</p>
              <p>Percentage is stored as decimal in the API (1% = 0.01). The form accepts whole percent (e.g. enter <b>1</b> for 1%).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p><b>Max Service Fee</b> is the absolute ceiling for any calculated platform fee.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p><b>Inactive rules</b> are completely ignored during the hierarchy lookup process.</p>
            </div>
          </div>
          <div className="mt-6 p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-default)] text-[10px] uppercase font-bold tracking-widest text-center">
            System Identity: org_id = 'default' | app_id = 'default' | item_type = 'default' | item_id = 'default' | currency = 'DEFAULT'
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden p-5" style={{ height: 'calc(100vh - 120px)' }}>
        <DataGrid
          title="Billing Rules"
          description="All active and inactive fee configurations"
          columns={columns}
          actions={gridActions}
          fetchData={fetchData}
          filterFields={billingFilters}
          defaultSort="updated_at:desc"
          refreshTrigger={refreshTrigger}
          onRowClick={(row) => {
            setModalMode('edit');
            setSelectedSetting(row);
            setIsModalOpen(true);
          }}
          emptyState={{
            title: "No billing rules found",
            description: "Start by creating a global default or a specific organization rule.",
            icon: <CreditCard className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />
          }}
          fullHeight={true}
          isScrollable={true}
        />
      </div>

      <BillingSettingModal
        isOpen={isModalOpen}
        mode={modalMode}
        setting={selectedSetting}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpsert}
        onEditSystemGlobal={() => setIsGlobalModalOpen(true)}
      />

      <GlobalBillingModal
        isOpen={isGlobalModalOpen}
        setting={globalDefault}
        onClose={() => setIsGlobalModalOpen(false)}
        onSubmit={handleUpdateGlobal}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete billing rule?"
        message="Transactions will fall back to other rules in the billing hierarchy."
        detail={
          deleteTarget
            ? `${deleteTarget.org_id} · ${deleteTarget.app_id} · ${deleteTarget.item_type || 'default'} · ${deleteTarget.item_id || 'default'} · ${deleteTarget.currency}`
            : undefined
        }
        confirmLabel="Delete rule"
        cancelLabel="Keep rule"
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
    </>
  );
}

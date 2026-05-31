'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CreditCard, Plus, CheckCircle2, XCircle, Edit2, Trash2 } from 'lucide-react';
import DataGrid, { GridColumn, GridAction, FilterField } from '@/components/DataGrid';
import PaymentFeeModal from '@/components/PaymentFeeModal';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal, { type AlertType } from '@/components/AlertModal';
import { useLayout } from '@/context/LayoutContext';
import {
  getPaymentMethodFees,
  createPaymentMethodFee,
  updatePaymentMethodFee,
  deletePaymentMethodFee,
  type PaymentMethodFee,
} from '@/lib/payment-fees-api';

const feeFilters: FilterField[] = [
  {
    key: 'provider',
    label: 'Provider',
    type: 'select',
    options: [
      { label: 'All', value: '' },
      { label: 'Midtrans', value: 'midtrans' },
      { label: 'Internal', value: 'internal' },
    ],
  },
  {
    key: 'method',
    label: 'Payment Method',
    type: 'text',
    placeholder: 'e.g. gopay',
  },
  {
    key: 'currency',
    label: 'Currency',
    type: 'select',
    options: [
      { label: 'All', value: '' },
      { label: 'IDR', value: 'IDR' },
      { label: 'USD', value: 'USD' },
    ],
  },
  {
    key: 'is_active',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'All', value: '' },
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
  },
];

export default function PaymentFeesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedFee, setSelectedFee] = useState<PaymentMethodFee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodFee | null>(null);
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

  // Contextual Topbar Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentlyVisible = entry.isIntersecting;

        // Only update if visibility status changed to avoid unnecessary events
        if (currentlyVisible !== isHeaderVisibleRef.current) {
          isHeaderVisibleRef.current = currentlyVisible;

          if (!currentlyVisible) {
            setTopbarContent(
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="p-1.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)]">
                  <CreditCard className="h-4 w-4 text-[var(--action-primary)]" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold text-[var(--text-primary)] leading-none">Payment Gateway Fees</h1>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Manage payment gateway fees for each payment method
                  </p>
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
        rootMargin: '-64px 0px 0px 0px'
      }
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
      const response = await getPaymentMethodFees({
        page: params?.page,
        size: params?.size,
        search: params?.search,
        sort: params?.sort,
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

  const handleCreate = async (payload: any) => {
    await createPaymentMethodFee(payload);
    setRefreshTrigger((prev) => prev + 1);
    showAlert('success', 'Created', 'Payment method fee has been added.');
  };

  const handleUpdate = async (payload: any) => {
    if (!selectedFee?.id) return;
    await updatePaymentMethodFee(selectedFee.id, payload);
    setRefreshTrigger((prev) => prev + 1);
    showAlert('success', 'Updated', 'Payment method fee has been updated.');
  };

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message });
  };

  const openDeleteConfirm = (row: PaymentMethodFee) => {
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await deletePaymentMethodFee(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshTrigger((prev) => prev + 1);
      showAlert('success', 'Deleted', 'Payment method fee has been removed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete payment method fee';
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
        setSelectedFee(null);
        setIsModalOpen(true);
      },
      variant: 'secondary',
    },
  ];

  const columns: GridColumn[] = [
    {
      key: 'provider',
      label: 'Provider',
      sortable: true,
      render: (val) => (
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {val}
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Payment Method',
      sortable: true,
      render: (val) => (
        <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
          {val.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'currency',
      label: 'Currency',
      sortable: true,
      render: (val) => (
        <span className="px-2 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-default)] text-[10px] font-bold rounded uppercase">
          {val}
        </span>
      ),
    },
    {
      key: 'fees',
      label: 'Fee Structure',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] w-12 font-bold uppercase">
              Fixed:
            </span>
            <span className="text-sm font-medium">
              {(row as PaymentMethodFee).fixedFee.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)] w-12 font-bold uppercase">
              Perc:
            </span>
            <span className="text-sm font-medium">
              {(row as PaymentMethodFee).percentageFee}%
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'topupReward',
      label: 'Topup Reward',
      render: (_, row) => {
        const r = row as PaymentMethodFee;
        const hasReward = r.topupRewardFixedFee > 0 || r.topupRewardPercentageFee > 0;
        if (!hasReward) {
          return <span className="text-xs text-[var(--text-secondary)]">—</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {r.topupRewardFixedFee > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded border border-emerald-500/20">
                +{r.topupRewardFixedFee.toLocaleString()}
              </span>
            )}
            {r.topupRewardPercentageFee > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded border border-emerald-500/20">
                +{r.topupRewardPercentageFee}%
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)]">
          {val ? new Date(val).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
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
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setModalMode('edit');
              setSelectedFee(row as PaymentMethodFee);
              setIsModalOpen(true);
            }}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-primary/10 hover:text-primary"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openDeleteConfirm(row as PaymentMethodFee)}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-full space-y-6">
      <div ref={headerRef} className="flex-shrink-0 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Payment Gateway Fees
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Manage payment gateway fees for each payment method
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-sm overflow-y-auto p-5 h-[calc(100vh-110px)]">
        <DataGrid
          title="Payment Fees"
          description="Fee configuration for each payment method"
          columns={columns}
          actions={gridActions}
          fetchData={fetchData}
          filterFields={feeFilters}
          defaultSort="updatedAt:desc"
          refreshTrigger={refreshTrigger}
          emptyState={{
            title: 'No payment fees configured',
            description: 'Start by adding fee configurations for payment methods.',
            icon: <CreditCard className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />,
          }}
          fullHeight
          isScrollable={true}
        />  
      </div>

      <PaymentFeeModal
        isOpen={isModalOpen}
        mode={modalMode}
        fee={selectedFee}
        onClose={() => setIsModalOpen(false)}
        onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete payment fee?"
        message="This fee configuration will be removed."
        detail={
          deleteTarget
            ? `${deleteTarget.provider} · ${deleteTarget.method} · ${deleteTarget.currency}`
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
  )
}

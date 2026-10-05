'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { HardDrive, Plus, CheckCircle2, XCircle, Edit2, Trash2 } from 'lucide-react';
import DataGrid, { GridColumn, GridAction, FilterField } from '@/components/DataGrid';
import StorageAccountConfigurationModal from '@/components/StorageAccountConfigurationModal';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal, { type AlertType } from '@/components/AlertModal';
import { useLayout } from '@/context/LayoutContext';
import {
  getStorageAccountConfigurations,
  createStorageAccountConfiguration,
  updateStorageAccountConfiguration,
  deleteStorageAccountConfiguration,
  type StorageConfigurationPayload,
  type StorageConfigurationMutationResult,
  type StorageAccountConfiguration,
} from '@/lib/storage-account-credentials-api';

function getBucketSummary(buckets: StorageAccountConfiguration['buckets']): string {
  const publicSummary = `Public: ${buckets.public.provider} / ${buckets.public.bucketName}`;
  const privateSummary = buckets.private
    ? `Private: ${buckets.private.provider} / ${buckets.private.bucketName}`
    : 'Private: not configured';
  return `${publicSummary} · ${privateSummary}`;
}

function getProvisioningMessage(result: StorageConfigurationMutationResult): string {
  const buckets = result.bucket_provisioning ?? [];
  if (buckets.length === 0) return 'Configuration saved. Bucket readiness was not reported.';
  const ready = buckets.filter((bucket) => bucket.status === 'ready').length;
  const failed = buckets.filter((bucket) => bucket.status === 'failed');
  const summary = `${ready}/${buckets.length} buckets ready`;
  if (failed.length === 0) return `Storage configuration saved; ${summary}.`;
  const details = failed.map((bucket) => `${bucket.visibility} (${bucket.bucket_name || 'unnamed'}): ${bucket.message ?? 'provisioning failed'}`).join('; ');
  return `Configuration saved, but ${failed.length} bucket(s) could not be verified. ${details}`;
}

const credentialFilters: FilterField[] = [
  {
    key: 'orgId',
    label: 'Org ID',
    type: 'text',
    placeholder: "org slug or 'default'",
  },
  {
    key: 'appId',
    label: 'App ID',
    type: 'text',
    placeholder: "app slug or 'default'",
  },
];

export default function StorageAccountCredentialsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedConfiguration, setSelectedConfiguration] = useState<StorageAccountConfiguration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageAccountConfiguration | null>(null);
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
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="p-1.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)]">
                  <HardDrive className="h-4 w-4 text-[var(--action-primary)]" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold text-[var(--text-primary)] leading-none">
                    Storage Configuration
                  </h1>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Manage Public and Private storage connections
                  </p>
                </div>
              </div>,
            );
          } else {
            setTopbarContent(null);
          }
        }
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' },
    );

    if (headerRef.current) observer.observe(headerRef.current);
    return () => {
      observer.disconnect();
      setTopbarContent(null);
    };
  }, [setTopbarContent]);

  const fetchData = useCallback(
    async (params?: { filter?: Record<string, string> }) => {
      const filter = params?.filter ?? {};
      const data = await getStorageAccountConfigurations({
        orgId: filter.orgId || undefined,
        appId: filter.appId || undefined,
      });
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
    },
    [],
  );

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message });
  };

  const handleCreate = async (payload: StorageConfigurationPayload) => {
    const result = await createStorageAccountConfiguration(payload);
    setRefreshTrigger((prev) => prev + 1);
    const failed = result.bucket_provisioning?.some((bucket) => bucket.status === 'failed');
    showAlert(failed ? 'warning' : 'success', failed ? 'Saved with bucket warning' : 'Created', getProvisioningMessage(result));
  };

  const handleUpdate = async (payload: StorageConfigurationPayload) => {
    if (!selectedConfiguration) return;
    const result = await updateStorageAccountConfiguration(
      selectedConfiguration.org_id,
      selectedConfiguration.app_id,
      payload,
    );
    setRefreshTrigger((prev) => prev + 1);
    const failed = result.bucket_provisioning?.some((bucket) => bucket.status === 'failed');
    showAlert(failed ? 'warning' : 'success', failed ? 'Saved with bucket warning' : 'Updated', getProvisioningMessage(result));
  };

  const openDeleteConfirm = (row: StorageAccountConfiguration) => {
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteStorageAccountConfiguration(deleteTarget.org_id, deleteTarget.app_id);
      setDeleteTarget(null);
      setRefreshTrigger((prev) => prev + 1);
      showAlert('success', 'Deleted', 'Storage credential has been removed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete storage credential';
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
        setSelectedConfiguration(null);
        setIsModalOpen(true);
      },
      variant: 'secondary',
    },
  ];

  const columns: GridColumn[] = [
    {
      key: 'org_id',
      label: 'Org ID',
      render: (val) => (
        <span className={`font-mono text-sm ${val === 'default' ? 'text-primary font-bold' : 'text-[var(--text-primary)]'}`}>
          {val === 'default' ? 'default (all orgs)' : val}
        </span>
      ),
    },
    {
      key: 'app_id',
      label: 'App ID',
      render: (val) => (
        <span className={`font-mono text-sm ${val === 'default' ? 'text-primary font-bold' : 'text-[var(--text-primary)]'}`}>
          {val === 'default' ? 'default (all apps)' : val}
        </span>
      ),
    },
    {
      key: 'buckets',
      label: 'Public / Private Storage',
      render: (val) => {
        const buckets = val as StorageAccountConfiguration['buckets'];
        return (
          <span className="text-xs text-[var(--text-secondary)]">{getBucketSummary(buckets)}</span>
        );
      },
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)]">{val ? new Date(val).toLocaleString() : '—'}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
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
              setSelectedConfiguration(row as StorageAccountConfiguration);
              setIsModalOpen(true);
            }}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-primary/10 hover:text-primary"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openDeleteConfirm(row as StorageAccountConfiguration)}
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
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Storage Configuration</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Configure independent provider credentials for Public and Private buckets by app scope.
            Private requests fail closed when no Private configuration resolves.
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-sm overflow-y-auto p-5 h-[calc(100vh-110px)]">
        <DataGrid
          title="Public / Private Storage"
          description="Independent Cloudflare R2 / S3 connections with scope fallback"
          columns={columns}
          actions={gridActions}
          fetchData={fetchData}
          filterFields={credentialFilters}
          refreshTrigger={refreshTrigger}
          emptyState={{
            title: 'No storage configuration found',
            description: "Add a 'default' Public/Private configuration or configure a specific app scope.",
            icon: <HardDrive className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />,
          }}
          fullHeight
          isScrollable={true}
        />
      </div>

      <StorageAccountConfigurationModal
        isOpen={isModalOpen}
        mode={modalMode}
        configuration={selectedConfiguration}
        onClose={() => setIsModalOpen(false)}
        onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete storage configuration?"
        message={
          deleteTarget && deleteTarget.org_id === 'default' && deleteTarget.app_id === 'default'
            ? 'This is the global default configuration. Public requests may fall back to legacy provider credentials; Private requests will fail closed if no Private bucket is configured.'
            : 'Requests for this scope fall back to the next matching configuration. Private requests fail closed if no Private bucket is configured.'
        }
        detail={deleteTarget ? `${deleteTarget.org_id} · ${deleteTarget.app_id}` : undefined}
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

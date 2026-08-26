'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { HardDrive, Plus, CheckCircle2, XCircle, Edit2, Trash2 } from 'lucide-react';
import DataGrid, { GridColumn, GridAction, FilterField } from '@/components/DataGrid';
import StorageAccountCredentialModal from '@/components/StorageAccountCredentialModal';
import ConfirmModal from '@/components/ConfirmModal';
import AlertModal, { type AlertType } from '@/components/AlertModal';
import { useLayout } from '@/context/LayoutContext';
import {
  getStorageAccountCredentials,
  createStorageAccountCredential,
  updateStorageAccountCredential,
  deleteStorageAccountCredential,
  type StorageAccountCredential,
} from '@/lib/storage-account-credentials-api';

const credentialFilters: FilterField[] = [
  {
    key: 'provider',
    label: 'Provider',
    type: 'select',
    options: [
      { label: 'All', value: '' },
      { label: 'Cloudflare R2', value: 'cloudflare_r2' },
      { label: 'S3-compatible', value: 's3' },
    ],
  },
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
  const [selectedCredential, setSelectedCredential] = useState<StorageAccountCredential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageAccountCredential | null>(null);
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
                    Storage Credentials
                  </h1>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Manage R2/S3 secrets — core services only
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
      const data = await getStorageAccountCredentials({
        provider: filter.provider || undefined,
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

  const handleCreate = async (payload: any) => {
    await createStorageAccountCredential(payload);
    setRefreshTrigger((prev) => prev + 1);
    showAlert('success', 'Created', 'Storage credential has been added.');
  };

  const handleUpdate = async (payload: any) => {
    if (!selectedCredential) return;
    await updateStorageAccountCredential(
      selectedCredential.provider,
      selectedCredential.org_id,
      selectedCredential.app_id,
      payload,
    );
    setRefreshTrigger((prev) => prev + 1);
    showAlert('success', 'Updated', 'Storage credential has been updated.');
  };

  const openDeleteConfirm = (row: StorageAccountCredential) => {
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteStorageAccountCredential(deleteTarget.provider, deleteTarget.org_id, deleteTarget.app_id);
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
        setSelectedCredential(null);
        setIsModalOpen(true);
      },
      variant: 'secondary',
    },
  ];

  const columns: GridColumn[] = [
    {
      key: 'provider',
      label: 'Provider',
      render: (val) => (
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {val === 'cloudflare_r2' ? 'Cloudflare R2' : val === 's3' ? 'S3-compatible' : val}
        </span>
      ),
    },
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
      key: 'credentials',
      label: 'Bucket / Fields Configured',
      render: (val) => {
        const creds = (val as Record<string, string>) || {};
        const keys = Object.keys(creds).filter((k) => creds[k]?.trim());
        return (
          <span className="text-xs text-[var(--text-secondary)]">
            {creds.bucketName ? `${creds.bucketName} · ` : ''}
            {keys.length > 0 ? keys.join(', ') : '— none —'}
          </span>
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
              setSelectedCredential(row as StorageAccountCredential);
              setIsModalOpen(true);
            }}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-primary/10 hover:text-primary"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openDeleteConfirm(row as StorageAccountCredential)}
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
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Storage Credentials</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Cloudflare R2 / S3-compatible access keys per app, with a per-app override falling
            back to a global default. Only visible to core services.
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-sm overflow-y-auto p-5 h-[calc(100vh-110px)]">
        <DataGrid
          title="Storage Credentials"
          description="Cloudflare R2 / S3 credentials, default + per-app overrides"
          columns={columns}
          actions={gridActions}
          fetchData={fetchData}
          filterFields={credentialFilters}
          refreshTrigger={refreshTrigger}
          emptyState={{
            title: 'No storage credentials configured',
            description: "Add a 'default' row per provider to start moving off .env.",
            icon: <HardDrive className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />,
          }}
          fullHeight
          isScrollable={true}
        />
      </div>

      <StorageAccountCredentialModal
        isOpen={isModalOpen}
        mode={modalMode}
        credential={selectedCredential}
        onClose={() => setIsModalOpen(false)}
        onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete storage credential?"
        message={
          deleteTarget && deleteTarget.org_id === 'default' && deleteTarget.app_id === 'default'
            ? 'This is the global default row — after deleting it, requests with no more-specific row will fall back to .env only (nothing configured there yet means uploads will fail until a new default is added).'
            : 'Requests for this provider/app will fall back to the default row (or .env, if no default exists).'
        }
        detail={deleteTarget ? `${deleteTarget.provider} · ${deleteTarget.org_id} · ${deleteTarget.app_id}` : undefined}
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

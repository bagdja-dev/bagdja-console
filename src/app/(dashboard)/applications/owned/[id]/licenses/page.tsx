'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getClientApps } from '@/lib/api';
import { getLicenses, createLicense, updateLicense, deleteLicense } from '@/lib/licenses-api';
import type { ClientApp, ApiError, License, LicenseStatus, CreateLicenseRequest, UpdateLicenseRequest } from '@/types';
import { ArrowLeft, Plus, Edit, Trash2, Copy, Check } from 'lucide-react';
import LicenseModal from '@/components/LicenseModal';

export default function LicensesPage() {
  const params = useParams();
  const appId = params?.id as string;

  const [app, setApp] = useState<ClientApp | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const activeOrgId = typeof window !== 'undefined' ? sessionStorage.getItem('activeOrganizationId') : null;
        if (!activeOrgId) {
          setError('Please select an organization first');
          setLoading(false);
          return;
        }

        // Fetch app
        const apps = await getClientApps();
        const foundApp = apps.find((a) => a.id === appId);
        if (!foundApp) {
          setError('App not found');
          setLoading(false);
          return;
        }
        setApp(foundApp);

        // Fetch licenses
        const data = await getLicenses(foundApp.id);
        setLicenses(data);
        setLoading(false);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch data');
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (appId) {
      fetchData();
    }
  }, [appId]);

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) + ' BP';
  };

  const getStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case 'available':
        return 'bg-blue-500/10 text-blue-600';
      case 'purchased':
        return 'bg-green-500/10 text-green-600';
      case 'revoked':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const refreshLicenses = async () => {
    if (!app?.id) return;
    try {
      const data = await getLicenses(app.id);
      setLicenses(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch licenses');
      console.error('Failed to fetch licenses:', err);
    }
  };

  const handleCreateLicense = async (data: CreateLicenseRequest) => {
    if (!app?.id) return;
    await createLicense(app.id, data);
    await refreshLicenses();
  };

  const handleUpdateLicense = async (data: UpdateLicenseRequest) => {
    if (!editingLicense) return;
    await updateLicense(editingLicense.id, data);
    await refreshLicenses();
    setEditingLicense(null);
  };

  const handleLicenseSubmit = async (data: CreateLicenseRequest | UpdateLicenseRequest) => {
    if (editingLicense) {
      await handleUpdateLicense(data as UpdateLicenseRequest);
    } else {
      await handleCreateLicense(data as CreateLicenseRequest);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this license? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteLicense(id);
      await refreshLicenses();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to delete license');
      console.error('Failed to delete license:', err);
    }
  };

  const openCreateModal = () => {
    setEditingLicense(null);
    setLicenseModalOpen(true);
  };

  const openEditModal = (license: License) => {
    if (license.status !== 'available') {
      alert('Only available licenses can be edited');
      return;
    }
    setEditingLicense(license);
    setLicenseModalOpen(true);
  };

  const closeLicenseModal = () => {
    setLicenseModalOpen(false);
    setEditingLicense(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="space-y-4">
        <Link
          href={`/applications/owned/${appId}`}
          className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to App
        </Link>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-[var(--text-danger)]">{error || 'App not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href={`/applications/owned/${appId}`}
        className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to App
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Licenses</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage licenses for {app.appName}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          onClick={openCreateModal}
        >
          <Plus className="h-4 w-4" />
          Create License
        </button>
      </div>

      {/* Licenses Table */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        {licenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-secondary)]">No licenses found. Create your first license!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    License Key
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    Max Users
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    Price
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    Organization
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    Expires
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {licenses.map((license) => (
                  <tr key={license.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-[var(--text-primary)]">
                          {license.licenseKey}
                        </code>
                        <button
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-colors"
                          onClick={() => handleCopyKey(license.licenseKey)}
                          title="Copy license key"
                        >
                          {copiedKey === license.licenseKey ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                      {license.type.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                      {license.maxUsers}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                      {formatCurrency(Number(license.price))}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(license.status)}`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                      {license.organizationName || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                      {formatDate(license.expiresAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {license.status === 'available' && (
                          <>
                            <button
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-colors"
                              onClick={() => openEditModal(license)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] transition-colors"
                              onClick={() => handleDelete(license.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* License Modal */}
      {app && (
        <LicenseModal
          isOpen={licenseModalOpen}
          onClose={closeLicenseModal}
          onSubmit={handleLicenseSubmit}
          license={editingLicense}
          appId={app.id}
        />
      )}
    </div>
  );
}


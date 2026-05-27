'use client';

import { useState, useEffect } from 'react';
import { X, Globe, Lock, Clock, AlertCircle, Link2, FileText, Search, Copy, Check, List } from 'lucide-react';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { getAvailableEvents } from '@/lib/api';
import DataGrid from './DataGrid';

interface EventSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contractId: string, webhookUrl?: string, label?: string) => Promise<void>;
  initialData?: {
    id: string;
    contractId: string;
    webhookUrl?: string;
    label?: string;
    eventName: string;
    contract?: any;
  };
}

export default function EventSubscribeModal({ isOpen, onClose, onSubmit, initialData }: EventSubscribeModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [label, setLabel] = useState('default');
  const [viewingContract, setViewingContract] = useState<any | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSelectedContractId(initialData.contractId);
        setWebhookUrl(initialData.webhookUrl || '');
        setLabel(initialData.label || 'default');
        // Note: selectedContract object will be null until we find it or if we're editing
        // But since we use initialData.eventName, it's fine for the UI
      } else {
        setSelectedContractId(null);
        setSelectedContract(null);
        setWebhookUrl('');
        setLabel('default');
      }
      setViewingContract(null);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) return;

    setSubmitting(true);
    try {
      await onSubmit(selectedContractId, webhookUrl || undefined, label || 'default');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopySchema = async (schema: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch (err) {
      console.error('Failed to copy schema:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Subscribe to Events</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600 text-sm flex-shrink-0">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!selectedContractId || initialData ? (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {initialData ? (
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Editing Subscription</p>
                      <h4 className="text-md font-bold text-[var(--text-primary)]">
                        {initialData.eventName}
                      </h4>
                    </div>
                  </div>
                  {initialData.contract && (
                    <button
                      type="button"
                      onClick={() => setViewingContract(initialData.contract)}
                      className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Contract
                    </button>
                  )}
                </div>
              ) : (
                <DataGrid
                  title="Available Events"
                  description="Browse and select events available for subscription."
                  fetchData={getAvailableEvents}
                  isScrollable={true}
                  fullHeight={true}
                  onRowClick={(row) => {
                    setSelectedContractId(row.id);
                    setSelectedContract(row);
                  }}
                  columns={[
                    {
                      key: 'eventName',
                      label: 'Event Name',
                      sortable: true,
                      render: (val, row) => (
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-primary)]">{val}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-tight">ID: {row.id.split('-')[0]}...</span>
                        </div>
                      )
                    },
                    {
                      key: 'appId',
                      label: 'Service',
                      sortable: true,
                      render: (_, row) => (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tighter">{row.app?.appId}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase">{row.app?.orgSlug}</span>
                        </div>
                      )
                    },
                    {
                      key: 'isPublic',
                      label: 'Privacy',
                      sortable: true,
                      render: (val) => val ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase border border-blue-500/20">
                          <Globe className="h-3 w-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase border border-amber-500/20">
                          <Lock className="h-3 w-3" /> Private
                        </span>
                      )
                    },
                    {
                      key: 'actions',
                      label: 'Action',
                      render: (_, row) => (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingContract(row);
                          }}
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-primary/30 px-2 py-1 rounded-lg bg-[var(--bg-surface)]"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Contract
                        </button>
                      )
                    }
                  ]}
                  filterFields={[
                    { key: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. user.created' },
                    { key: 'appId', label: 'Service Slug', type: 'text', placeholder: 'e.g. auth-service' }
                  ]}
                  emptyState={{
                    title: "No events available",
                    description: "No events were found that you can subscribe to.",
                    icon: <Globe className="h-8 w-8 text-[var(--text-secondary)] opacity-50" />
                  }}
                />
              )}

              {initialData && (
                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
                        <List className="h-4 w-4" /> Subscription Label
                      </label>
                      <Input
                        placeholder="e.g. Production, Development"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        required
                      />
                      <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                        Use labels to distinguish between multiple endpoints (e.g. dev, prod).
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
                        <Link2 className="h-4 w-4" /> Webhook URL (Optional)
                      </label>
                      <Input
                        placeholder="https://api.yourdomain.com/webhooks/events"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                      <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                        If provided, Bagdja will push events to this URL as POST requests.
                        If left empty, you can still receive events via WebSockets.
                      </p>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-primary font-bold uppercase tracking-wider">Subscribing to</p>
                    <h4 className="text-md font-bold text-[var(--text-primary)]">
                      {selectedContract?.eventName}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewingContract(selectedContract)}
                    className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Schema
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedContractId(null);
                      setSelectedContract(null);
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Change
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
                    <List className="h-4 w-4" /> Subscription Label
                  </label>
                  <Input
                    placeholder="e.g. Production, Development"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                      />
                  <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                    Use labels to distinguish between multiple endpoints (e.g. dev, prod).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> Webhook URL (Optional)
                  </label>
                  <Input
                    placeholder="https://api.yourdomain.com/webhooks/events"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                    If provided, Bagdja will push events to this URL as POST requests.
                    If left empty, you can still receive events via WebSockets.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="p-6 border-t border-[var(--border-default)] flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          {selectedContractId && (
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Subscribing...' : 'Confirm Subscription'}
            </Button>
          )}
        </div>
      </div>

      {viewingContract && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{viewingContract.eventName}</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                    Service: {viewingContract.app?.appId} • {viewingContract.isPublic ? 'Public' : 'Private'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingContract(null)}
                className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-xl border border-[var(--border-default)] bg-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Schema</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      {viewingContract.id}
                    </span>
                    <button
                      onClick={() => handleCopySchema(viewingContract.schema)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      title="Copy Schema"
                    >
                      {copiedSchema ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <pre className="p-4 text-xs text-[var(--text-primary)] font-mono overflow-x-auto leading-relaxed scrollbar-thin">
                  {JSON.stringify(viewingContract.schema ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-default)] flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setViewingContract(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


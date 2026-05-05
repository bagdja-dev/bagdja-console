'use client';

import { useState, useEffect } from 'react';
import { X, Search, Globe, Lock, CheckCircle, Clock, AlertCircle, Link2, FileText } from 'lucide-react';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { getAvailableEvents } from '@/lib/api';

interface EventSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contractId: string, webhookUrl?: string) => Promise<void>;
  initialData?: {
    id: string;
    contractId: string;
    webhookUrl?: string;
    eventName: string;
  };
}

export default function EventSubscribeModal({ isOpen, onClose, onSubmit, initialData }: EventSubscribeModalProps) {
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [viewingContract, setViewingContract] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
      if (initialData) {
        setSelectedContractId(initialData.contractId);
        setWebhookUrl(initialData.webhookUrl || '');
      } else {
        setSelectedContractId(null);
        setWebhookUrl('');
      }
      setViewingContract(null);
      setError(null);
    }
  }, [isOpen, initialData]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getAvailableEvents();
      setAvailableEvents(data);
    } catch (err: any) {
      setError('Failed to load available events');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = availableEvents.filter(event =>
    event.eventName.toLowerCase().includes(search.toLowerCase()) ||
    event.app?.appId.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) return;

    setSubmitting(true);
    try {
      await onSubmit(selectedContractId, webhookUrl || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedContract = selectedContractId
    ? availableEvents.find((e) => e.id === selectedContractId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!selectedContractId || initialData ? (
            <div className="space-y-4">
              {initialData ? (
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Editing Subscription</p>
                      <h4 className="text-md font-bold text-[var(--text-primary)]">
                        {initialData.eventName}
                      </h4>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search events or services..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              )}

              {!initialData && (
                <div className="grid grid-cols-1 gap-3">
                  {loading ? (
                    <div className="text-center py-12 text-[var(--text-secondary)] text-sm italic">Searching for events...</div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-secondary)] text-sm italic">No events found</div>
                  ) : (
                    filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedContractId(event.id)}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)] hover:border-primary/50 hover:bg-primary/5 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] group-hover:border-primary/30">
                            {event.isPublic ? (
                              <Globe className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">{event.eventName}</h4>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-tight">
                              Service: {event.app?.appId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingContract(event);
                            }}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-primary/30 px-2 py-1 rounded-lg bg-[var(--bg-surface)]"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View Contract
                          </button>
                          {event.isPublic ? (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase">Public</span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">Private</span>
                          )}
                          <CheckCircle className="h-4 w-4 text-gray-200 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {initialData && (
                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                  <div className="space-y-4">
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
                    View Contract
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedContractId(null)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="space-y-4">
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
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                    {viewingContract.id}
                  </span>
                </div>
                <pre className="p-4 text-xs text-[var(--text-primary)] font-mono overflow-x-auto leading-relaxed">
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

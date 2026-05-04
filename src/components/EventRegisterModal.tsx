'use client';

import { useState, useEffect } from 'react';
import { X, Code2, AlertCircle, Info } from 'lucide-react';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';

interface EventRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { eventName: string; schema: any; isPublic: boolean; isActive?: boolean }) => Promise<void>;
  appId: string;
  initialData?: {
    id?: string;
    eventName: string;
    schema: any;
    isPublic: boolean;
    isActive: boolean;
  };
}

const DEFAULT_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    timestamp: { type: "string", format: "date-time" }
  },
  required: ["id"]
};

export default function EventRegisterModal({ isOpen, onClose, onSubmit, appId, initialData }: EventRegisterModalProps) {
  const [eventName, setEventName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [schemaJson, setSchemaJson] = useState(JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setEventName(initialData.eventName);
        setIsPublic(initialData.isPublic);
        setIsActive(initialData.isActive);
        setSchemaJson(JSON.stringify(initialData.schema, null, 2));
      } else {
        setEventName('');
        setIsPublic(false);
        setIsActive(true);
        setSchemaJson(JSON.stringify(DEFAULT_SCHEMA, null, 2));
      }
      setError(null);
      setJsonError(null);
    }
  }, [isOpen, initialData]);

  const validateJson = (jsonString: string): any | null => {
    try {
      const parsed = JSON.parse(jsonString);
      setJsonError(null);
      return parsed;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const schema = validateJson(schemaJson);
    if (!schema) {
      setError('Please fix JSON errors in schema');
      return;
    }

    if (!eventName.trim()) {
      setError('Event name is required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ eventName, schema, isPublic, isActive });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register event');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Code2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {initialData ? 'Update Event Contract' : 'Register New Event'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                  Event Name
                </label>
                <Input
                  placeholder="e.g. user.created"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col justify-end pb-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isPublic" className="text-sm font-medium text-[var(--text-primary)]">
                      Public
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-[var(--text-primary)]">
                      Active
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[var(--text-primary)]">
                  JSON Schema (Payload Validation)
                </label>
                <button
                  type="button"
                  onClick={() => setSchemaJson(JSON.stringify(validateJson(schemaJson), null, 2))}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Format JSON
                </button>
              </div>
              <div className="relative">
                <textarea
                  className={`w-full h-64 bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-xl border ${jsonError ? 'border-red-500' : 'border-gray-800'
                    } focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  value={schemaJson}
                  onChange={(e) => setSchemaJson(e.target.value)}
                  placeholder="{ ... }"
                />
                {jsonError && (
                  <div className="absolute bottom-4 left-4 right-4 p-2 bg-red-500/90 text-white text-[10px] rounded border border-red-400">
                    {jsonError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-[var(--border-default)] flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Processing...' : (initialData ? 'Update Event' : 'Register Event')}
          </Button>
        </div>
      </div>
    </div>
  );
}

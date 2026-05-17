'use client';

import { useState, useEffect } from 'react';
import { X, Shield, Server, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { ChannelType, ProviderType } from '@/types';
import { testConnection } from '@/lib/messages-api';

interface ChannelSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { channelType: ChannelType; providerType: ProviderType; config: any }) => Promise<void>;
  channelType: ChannelType;
  initialData?: {
    providerType: ProviderType;
    config: any;
  };
}

const DEFAULT_SMTP_CONFIG = {
  host: '',
  port: 587,
  user: '',
  pass: '',
  from: '',
  secure: false,
};

export default function ChannelSetupModal({ isOpen, onClose, onSubmit, channelType, initialData }: ChannelSetupModalProps) {
  const [providerType, setProviderType] = useState<ProviderType>(ProviderType.SMTP);
  const [config, setConfig] = useState<any>(DEFAULT_SMTP_CONFIG);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setProviderType(initialData.providerType || ProviderType.SMTP);
        setConfig(initialData.config || (initialData.providerType === ProviderType.SMTP ? DEFAULT_SMTP_CONFIG : {}));
      } else {
        setProviderType(ProviderType.SMTP);
        setConfig(DEFAULT_SMTP_CONFIG);
      }
      setError(null);
      setTestResult(null);
    }
  }, [isOpen, initialData]);

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await testConnection({
        to: config.from || 'test@example.com',
        providerType,
        config,
      });
      setTestResult(res);
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({ channelType, providerType, config });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Server className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Configure {channelType.charAt(0).toUpperCase() + channelType.slice(1)} Provider
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-600 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {testResult && (
            <div className={`p-4 border rounded-xl flex items-start gap-3 text-sm ${testResult.success ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
              {testResult.success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <p>{testResult.message}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                Provider Type
              </label>
              <select
                value={providerType}
                onChange={(e) => setProviderType(e.target.value as ProviderType)}
                className="w-full px-4 py-2 bg-white/5 border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value={ProviderType.SMTP}>Custom SMTP</option>
                <option value={ProviderType.SENDGRID}>SendGrid API</option>
                <option value={ProviderType.MAILGUN}>Mailgun API</option>
                <option value={ProviderType.SYSTEM}>System Default (noreply@bagdja.com)</option>
              </select>
            </div>

            {providerType === ProviderType.SMTP && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">SMTP Host</label>
                  <Input
                    placeholder="smtp.example.com"
                    value={config.host}
                    onChange={(e) => handleConfigChange('host', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Port</label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={config.port}
                    onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="secure"
                    checked={config.secure}
                    onChange={(e) => handleConfigChange('secure', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary"
                  />
                  <label htmlFor="secure" className="text-sm font-medium text-[var(--text-primary)]">Use SSL/TLS</label>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Username</label>
                  <Input
                    placeholder="user@example.com"
                    value={config.user}
                    onChange={(e) => handleConfigChange('user', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={config.pass}
                    onChange={(e) => handleConfigChange('pass', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">From Address</label>
                  <Input
                    placeholder="noreply@yourdomain.com"
                    value={config.from}
                    onChange={(e) => handleConfigChange('from', e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {(providerType === ProviderType.SENDGRID || providerType === ProviderType.MAILGUN) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">API Key</label>
                  <Input
                    type="password"
                    placeholder="SG.xxxxxxxx..."
                    value={config.apiKey}
                    onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">From Address</label>
                  <Input
                    placeholder="noreply@yourdomain.com"
                    value={config.from}
                    onChange={(e) => handleConfigChange('from', e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {providerType === ProviderType.SYSTEM && (
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-blue-400 text-sm">
                <p>Using the system default provider requires no additional configuration. All emails will be sent from <strong>noreply@bagdja.com</strong>.</p>
              </div>
            )}
          </div>
        </form>

        <div className="p-6 border-t border-[var(--border-default)] flex flex-col gap-3">
          {providerType !== ProviderType.SYSTEM && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleTestConnection}
              disabled={testing || loading}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading || testing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || testing}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

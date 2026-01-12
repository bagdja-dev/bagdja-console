'use client';

import { useState, useEffect } from 'react';
import type { Plan, CreatePlanRequest, UpdatePlanRequest, ApiError } from '@/types';
import { PlanStatus, PlanDuration } from '@/types';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import { X, Plus, Trash2, Code2, AlertCircle } from 'lucide-react';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlanRequest | UpdatePlanRequest) => Promise<void>;
  plan?: Plan | null;
  appId: string;
}

export default function PlanModal({ isOpen, onClose, onSubmit, plan, appId: _appId }: PlanModalProps) {
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: '',
    description: '',
    price: 0,
    duration: PlanDuration.MONTHLY,
    durationValue: 30,
    features: [],
    status: PlanStatus.ACTIVE,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState<string>('');
  const [metadataJson, setMetadataJson] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: Number(plan.price),
        duration: plan.duration,
        durationValue: plan.durationValue || undefined,
        features: plan.features || [],
        metadata: plan.metadata || {},
        status: plan.status,
        isActive: plan.isActive,
      });
      // Format metadata as JSON string
      const metadata = plan.metadata || {};
      setMetadataJson(JSON.stringify(metadata, null, 2));
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        duration: PlanDuration.MONTHLY,
        durationValue: 30,
        features: [],
        metadata: {},
        status: PlanStatus.ACTIVE,
        isActive: true,
      });
      setMetadataJson('{}');
    }
    setFeatureInput('');
    setError(null);
    setJsonError(null);
  }, [plan, isOpen]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateJson = (jsonString: string): Record<string, any> | null => {
    if (!jsonString.trim()) {
      return {};
    }
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Metadata must be a JSON object');
        return null;
      }
      setJsonError(null);
      return parsed;
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  };

  const formatJson = () => {
    const parsed = validateJson(metadataJson);
    if (parsed !== null) {
      setMetadataJson(JSON.stringify(parsed, null, 2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate and parse JSON metadata
      const metadata = validateJson(metadataJson);
      if (metadata === null) {
        setError('Please fix JSON errors in metadata');
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        features: formData.features && formData.features.length > 0 ? formData.features : undefined,
        durationValue: formData.durationValue || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      await onSubmit(submitData);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures.splice(index, 1);
    setFormData({
      ...formData,
      features: newFeatures,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {plan ? 'Edit Plan' : 'Create Plan'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Input
            label="Plan Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={loading}
            placeholder="e.g., Premium Plan"
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent placeholder:text-[var(--text-muted)]"
              placeholder="Plan description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (BP)"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
              disabled={loading}
            />

            <Select
              label="Duration Type"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value as PlanDuration })}
              required
              disabled={loading}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>

          <Input
            label="Duration Value"
            type="number"
            min="1"
            value={formData.durationValue || ''}
            onChange={(e) => setFormData({ ...formData, durationValue: parseInt(e.target.value) || undefined })}
            disabled={loading}
            placeholder="e.g., 30 for 30 days"
            helpText="Number of units (days, weeks, months, or years) based on duration type"
          />

          <div className="border-t border-[var(--border-default)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Metadata (Optional)</h3>
              <button
                type="button"
                onClick={formatJson}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors disabled:opacity-50"
                title="Format JSON"
              >
                <Code2 className="h-3 w-3" />
                Format
              </button>
            </div>
            <div className="mb-4">
              <textarea
                value={metadataJson}
                onChange={(e) => {
                  setMetadataJson(e.target.value);
                  // Clear error when user starts typing
                  if (jsonError) {
                    validateJson(e.target.value);
                  }
                }}
                onBlur={() => validateJson(metadataJson)}
                disabled={loading}
                rows={6}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  bg-[var(--bg-surface)] text-[var(--text-primary)]
                  border-[var(--border-default)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent
                  placeholder:text-[var(--text-muted)]
                  font-mono text-sm
                  disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50
                  ${jsonError ? 'border-[var(--brand-error)]' : ''}
                `}
                placeholder='{\n  "maxExams": 100,\n  "storageGB": 50\n}'
                spellCheck={false}
              />
              {jsonError && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-600 text-xs">{jsonError}</p>
                </div>
              )}
              {!jsonError && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Enter valid JSON object. Example: <code className="px-1 py-0.5 bg-[var(--bg-sidebar)] rounded">&#123;&quot;maxExams&quot;: 100, &quot;storageGB&quot;: 50&#125;</code>
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--border-default)] pt-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Features
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  disabled={loading}
                  placeholder="Enter a feature and press Enter or click Add"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  disabled={loading || !featureInput.trim()}
                  className="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              {formData.features && formData.features.length > 0 && (
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-[var(--bg-sidebar)] rounded-lg"
                    >
                      <span className="text-sm text-[var(--text-primary)]">{feature}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        disabled={loading}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PlanStatus })}
              disabled={loading}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>

            <div>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={loading}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Is Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


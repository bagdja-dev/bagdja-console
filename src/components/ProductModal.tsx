'use client';

import { useState, useEffect } from 'react';
import type { Product, CreateProductRequest, UpdateProductRequest, ApiError } from '@/types';
import { ProductStatus } from '@/types';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import { X, Code2, AlertCircle, HelpCircle, PlusCircle, Trash2 } from 'lucide-react';

interface ProductPriceInput {
  currency: string;
  price: number;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
  product?: Product | null;
  appId: string;
}

export default function ProductModal({ isOpen, onClose, onSubmit, product, appId: _appId }: ProductModalProps) {
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    description: '',
    price: 0,
    type: 'other',
    metadata: {},
    status: ProductStatus.ACTIVE,
    isActive: true,
    isDynamic: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataJson, setMetadataJson] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [multiPrices, setMultiPrices] = useState<ProductPriceInput[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['IDR']);

  useEffect(() => {
    // Mock fetching supported currencies from config
    // In real app, this should come from an API
    setSupportedCurrencies(['IDR', 'MYR', 'USD', 'SGD']);

    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        type: product.type,
        metadata: product.metadata || {},
        status: product.status,
        isActive: product.isActive,
        isDynamic: product.isDynamic || false,
      });
      // Set initial multi-prices if any (assuming product.prices exists in your type)
      // @ts-ignore - price data might be nested
      if (product.prices) {
        // @ts-ignore
        setMultiPrices(product.prices);
      } else {
        setMultiPrices([{ currency: 'IDR', price: Number(product.price) }]);
      }
      // Format metadata as JSON string
      const metadata = product.metadata || {};
      setMetadataJson(JSON.stringify(metadata, null, 2));
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        type: 'other',
        metadata: {},
        status: ProductStatus.ACTIVE,
        isActive: true,
        isDynamic: false,
      });
      setMultiPrices([{ currency: 'IDR', price: 0 }]);
      setMetadataJson('{}');
    }
    setError(null);
    setJsonError(null);
  }, [product, isOpen]);

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

  const addPriceRow = () => {
    const remaining = supportedCurrencies.filter(c => !multiPrices.find(p => p.currency === c));
    if (remaining.length > 0) {
      setMultiPrices([...multiPrices, { currency: remaining[0], price: 0 }]);
    }
  };

  const removePriceRow = (index: number) => {
    setMultiPrices(multiPrices.filter((_, i) => i !== index));
  };

  const updatePriceRow = (index: number, field: keyof ProductPriceInput, value: string | number) => {
    const updated = [...multiPrices];
    updated[index] = { ...updated[index], [field]: value };
    setMultiPrices(updated);
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
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        // @ts-ignore - injecting multi-prices
        prices: !formData.isDynamic ? multiPrices : [],
      };

      await onSubmit(submitData);
      onClose();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {product ? 'Edit Product' : 'Create Product'}
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
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={loading}
            placeholder="e.g., Mathematics Practice Test"
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
              placeholder="Product description"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Product Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
              disabled={loading}
              placeholder="e.g., Exam, Course, E-Book, Quiz"
            />
          </div>

          {!formData.isDynamic && (
            <div className="border border-[var(--border-default)] rounded-lg p-4 space-y-3 bg-[var(--bg-sidebar)]/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Price List (Multi-Currency)</h3>
                <button
                  type="button"
                  onClick={addPriceRow}
                  disabled={loading || multiPrices.length >= supportedCurrencies.length}
                  className="flex items-center gap-1 text-xs text-[var(--action-primary)] hover:opacity-80 disabled:opacity-50"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Currency
                </button>
              </div>

              <div className="space-y-2">
                {multiPrices.map((priceRow, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-1/3">
                      <select
                        value={priceRow.currency}
                        onChange={(e) => updatePriceRow(index, 'currency', e.target.value)}
                        disabled={loading}
                        className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                      >
                        {supportedCurrencies.map(c => (
                          <option
                            key={c}
                            value={c}
                            disabled={multiPrices.some((p, i) => p.currency === c && i !== index)}
                          >
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceRow.price}
                        onChange={(e) => updatePriceRow(index, 'price', parseFloat(e.target.value) || 0)}
                        disabled={loading}
                        placeholder="Price"
                        className="w-full h-9 px-3 py-1 text-sm border rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                      />
                    </div>
                    {multiPrices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePriceRow(index)}
                        disabled={loading}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {multiPrices.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] italic">No prices defined. Please add at least one.</p>
              )}
            </div>
          )}

          <div className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-sidebar)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">Pricing Mode</h3>
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 text-[var(--text-muted)] cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-xs text-[var(--text-secondary)] leading-relaxed">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Dynamic vs Fixed Pricing</p>
                    <ul className="space-y-1 list-disc pl-3">
                      <li><span className="font-medium">Fixed:</span> Price is locked to the value defined above. Good for standard store items.</li>
                      <li><span className="font-medium">Dynamic:</span> Allows client apps to define custom prices and items via API metadata. Ideal for retail/POS integrations.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDynamic}
                  onChange={(e) => setFormData({ ...formData, isDynamic: e.target.checked })}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--bg-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--action-primary)]"></div>
                <span className="ml-3 text-sm font-medium text-[var(--text-secondary)]">
                  {formData.isDynamic ? 'Dynamic Pricing' : 'Fixed Pricing'}
                </span>
              </label>
            </div>
          </div>

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
            <div>
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
                rows={8}
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
                placeholder='{\n  "questions": 50,\n  "duration": 120\n}'
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
                  Enter valid JSON object. Example: <code className="px-1 py-0.5 bg-[var(--bg-sidebar)] rounded">&#123;&quot;questions&quot;: 50, &quot;duration&quot;: 120&#125;</code>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })}
              disabled={loading}
            >
              <option value={ProductStatus.ACTIVE}>Active</option>
              <option value={ProductStatus.INACTIVE}>Inactive</option>
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
              {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


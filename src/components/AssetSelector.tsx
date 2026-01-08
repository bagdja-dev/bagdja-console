'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAssets, getAssetGroups } from '@/lib/assets-api';
import type { Asset, AssetGroup } from '@/types';
import { Image as ImageIcon, X, Search } from 'lucide-react';
import { CustomSelect } from '@/ui/custom-select';
import { cn } from '@/lib/utils';

interface AssetSelectorProps {
  value?: string; // publicUrl of selected asset
  onChange?: (publicUrl: string) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  error?: string;
  helpText?: string;
  filterByGroup?: string; // Optional: filter assets by group name (e.g., 'logo')
}

export function AssetSelector({
  value,
  onChange,
  disabled = false,
  label,
  error,
  helpText,
  filterByGroup,
}: AssetSelectorProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await getAssetGroups();
      setGroups(data);
      
      // If filterByGroup is specified, find and select that group
      if (filterByGroup) {
        const logoGroup = data.find(g => g.name.toLowerCase() === filterByGroup.toLowerCase());
        if (logoGroup) {
          setSelectedGroupId(logoGroup.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch asset groups:', err);
      setGroups([]);
    }
  }, [filterByGroup]);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAssets(selectedGroupId || undefined);
      // Filter only image assets
      const imageAssets = result.data.filter(asset => asset.mimeType.startsWith('image/'));
      setAssets(imageAssets);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, fetchAssets]);

  // Refresh when organization changes
  useEffect(() => {
    const handleOrganizationChange = () => {
      fetchGroups();
      if (isOpen) {
        fetchAssets();
      }
    };

    window.addEventListener('organizationChanged', handleOrganizationChange);
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange);
    };
  }, [isOpen, fetchGroups, fetchAssets]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedAsset = assets.find(asset => asset.publicUrl === value);

  const filteredAssets = searchQuery
    ? assets.filter(asset => 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  const handleSelectAsset = (asset: Asset) => {
    if (asset.publicUrl) {
      onChange?.(asset.publicUrl);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange?.('');
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          {label}
        </label>
      )}
      <div ref={selectorRef} className="relative">
        {/* Selected Asset Display */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-2 rounded-lg border text-left',
            'bg-[var(--bg-surface)] text-[var(--text-primary)]',
            'border-[var(--border-default)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent',
            'disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50',
            'flex items-center gap-3',
            isOpen && 'border-[var(--action-primary)] ring-2 ring-[var(--action-primary)]',
            error && 'border-[var(--brand-error)]'
          )}
        >
          {selectedAsset ? (
            <>
              {selectedAsset.publicUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAsset.publicUrl}
                  alt={selectedAsset.name}
                  className="h-10 w-10 object-cover rounded border border-[var(--border-default)]"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {selectedAsset.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {selectedAsset.publicUrl}
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="h-10 w-10 flex items-center justify-center rounded border border-[var(--border-default)] bg-[var(--bg-sidebar)]">
                <ImageIcon className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
              <span className="text-[var(--text-muted)]">Select an asset</span>
            </>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {/* Filter Section */}
            <div className="p-3 border-b border-[var(--border-default)]">
              <div className="mb-2">
                <CustomSelect
                  value={selectedGroupId}
                  onChange={(groupId) => setSelectedGroupId(groupId)}
                  options={[
                    { value: '', label: 'All Groups' },
                    ...groups.map((group) => ({
                      value: group.id,
                      label: group.name,
                      description: group.description,
                    })),
                  ]}
                  placeholder="Filter by group"
                  className="w-full"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[var(--border-default)] bg-[var(--bg-main)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                />
              </div>
            </div>

            {/* Assets List */}
            <div className="py-1 max-h-60 overflow-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  Loading assets...
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  {searchQuery ? 'No assets found' : 'No image assets available'}
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const isSelected = value === asset.publicUrl;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleSelectAsset(asset)}
                      className={cn(
                        'block w-full px-4 py-3 text-left transition-colors',
                        'hover:bg-[var(--bg-hover)]',
                        isSelected && 'bg-[var(--bg-hover)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {asset.publicUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.publicUrl}
                            alt={asset.name}
                            className="h-12 w-12 object-cover rounded border border-[var(--border-default)] flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            'text-sm font-medium truncate',
                            isSelected ? 'text-[var(--action-primary)]' : 'text-[var(--text-primary)]'
                          )}>
                            {asset.name}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                            {asset.publicUrl}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-[var(--action-primary)]" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-[var(--brand-error)]" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {helpText}
        </p>
      )}
    </div>
  );
}


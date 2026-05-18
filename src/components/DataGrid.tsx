import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  Filter,
  X,
  ChevronUp,
  ChevronDown,
  History,
  Clock,
  Settings,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';

export interface GridColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface GridAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

interface DataGridProps {
  title: string;
  description?: string;
  columns: GridColumn[];
  fetchData: (params: any) => Promise<{ data: any[]; meta: any }>;
  filterFields?: FilterField[];
  actions?: GridAction[];
  onRowClick?: (row: any) => void;
  emptyState?: {
    title: string;
    description: string;
    icon?: React.ReactNode;
  };
  refreshTrigger?: any;
  isScrollable?: boolean;
  fullHeight?: boolean;
  defaultSort?: string;
}

const DataGrid: React.FC<DataGridProps> = ({
  title,
  description,
  columns,
  fetchData,
  filterFields = [],
  actions = [],
  onRowClick,
  emptyState,
  refreshTrigger,
  isScrollable = false,
  fullHeight = false,
  defaultSort = 'createdAt:desc',
}) => {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Grid State
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filter, setLogFilter] = useState<Record<string, string>>({});
  const [tempFilter, setTempFilter] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(defaultSort);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [localIsScrollable, setLocalIsScrollable] = useState(isScrollable);

  // Sync local scrollable state with prop
  useEffect(() => {
    setLocalIsScrollable(isScrollable);
  }, [isScrollable]);

  // Initialize visible columns
  useEffect(() => {
    const initialVisible: Record<string, boolean> = {};
    columns.forEach(col => {
      initialVisible[col.key] = true;
    });
    setVisibleColumns(initialVisible);
  }, [columns]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchData({
        page,
        size,
        search,
        filter,
        sort
      });
      setData(res.data || []);
      setMeta(res.meta || null);
    } catch (error) {
      console.error('DataGrid fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, size, search, filter, sort, refreshTrigger]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (key: string) => {
    const [sortKey, sortDir] = sort.split(':');
    const isSorted = sortKey === key;
    const nextDir = isSorted && sortDir === 'asc' ? 'desc' : 'asc';
    setSort(`${key}:${nextDir}`);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearch('');
    setLogFilter({});
    setTempFilter({});
    setPage(1);
  };

  return (
    <div className={`flex flex-col space-y-4 ${fullHeight ? 'flex-1 h-full min-h-0' : ''}`}>
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-md font-medium text-[var(--text-primary)]">{title}</h3>
            {description && <p className="text-sm text-[var(--text-secondary)]">{description}</p>}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-[300px] group">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 pr-12 py-2.5 bg-white/5 border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50 w-full transition-all"
                />
                {filterFields.length > 0 && (
                  <button
                    onClick={() => {
                      setTempFilter(filter);
                      setIsFilterPanelOpen(!isFilterPanelOpen);
                      setIsSettingsPanelOpen(false);
                    }}
                    className={`absolute right-2 p-1.5 rounded-lg transition-all ${isFilterPanelOpen ? 'bg-primary text-white' : 'text-[var(--text-secondary)] hover:bg-white/10'}`}
                    title="Advanced Filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Popover */}
              {isFilterPanelOpen && (
                <div className="absolute right-0 md:right-auto md:left-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] md:w-[450px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      Advanced Filters
                    </h4>
                    <button onClick={() => setIsFilterPanelOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {filterFields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1">{field.label}</label>
                        {field.type === 'text' ? (
                          <input
                            type="text"
                            placeholder={field.placeholder}
                            value={tempFilter[field.key] || ''}
                            onChange={(e) => setTempFilter({ ...tempFilter, [field.key]: e.target.value })}
                            className="w-full px-4 py-2 bg-white/5 border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        ) : (
                          <select
                            value={tempFilter[field.key] || ''}
                            onChange={(e) => setTempFilter({ ...tempFilter, [field.key]: e.target.value })}
                            className="w-full px-4 py-2 bg-white/5 border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            <option value="">All {field.label}</option>
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                    <button
                      onClick={() => {
                        setTempFilter({});
                        setLogFilter({});
                        setIsFilterPanelOpen(false);
                        setPage(1);
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wider"
                    >
                      Reset All
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsFilterPanelOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setLogFilter(tempFilter);
                          setIsFilterPanelOpen(false);
                          setPage(1);
                        }}
                        className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadData()}
              disabled={loading}
              className={`p-2.5 rounded-xl border border-[var(--border-default)] bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all ${loading ? 'opacity-50' : ''}`}
              title="Refresh Data"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Settings Trigger */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => {
                  setIsSettingsPanelOpen(!isSettingsPanelOpen);
                  setIsFilterPanelOpen(false);
                }}
                className={`p-2.5 rounded-xl border border-[var(--border-default)] transition-all ${isSettingsPanelOpen ? 'bg-primary text-white border-primary' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
                title="Grid Settings"
              >
                <Settings className={`h-4 w-4 ${isSettingsPanelOpen ? 'animate-spin-slow' : ''}`} />
              </button>

              {/* Settings Popover */}
              {isSettingsPanelOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-[300px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Settings className="h-4 w-4 text-primary" />
                      Grid Settings
                    </h4>
                    <button onClick={() => setIsSettingsPanelOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Column Visibility */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1 tracking-widest">Show/Hide Columns</label>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                        {columns.map(col => (
                          <label key={col.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
                            <span className="text-sm text-[var(--text-primary)] group-hover:text-primary transition-colors">{col.label}</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleColumns[col.key] !== false}
                                onChange={() => {
                                  setVisibleColumns(prev => ({
                                    ...prev,
                                    [col.key]: !prev[col.key]
                                  }));
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Page Size */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1 tracking-widest">Rows per page</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[10, 20, 50, 100].map(v => (
                          <button
                            key={v}
                            onClick={() => {
                              setSize(v);
                              setPage(1);
                            }}
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${size === v ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 border border-transparent'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scrollable Toggle */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1 tracking-widest">Layout Options</label>
                      <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
                        <span className="text-sm text-[var(--text-primary)] group-hover:text-primary transition-colors">Scrollable Table</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localIsScrollable}
                            onChange={() => setLocalIsScrollable(!localIsScrollable)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
                    <button
                      onClick={() => setIsSettingsPanelOpen(false)}
                      className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Apply Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Actions */}
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap shadow-lg pointer-events-auto ${action.variant === 'danger'
                  ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600'
                  : action.variant === 'secondary'
                    ? 'bg-white/5 text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-white/10'
                    : action.variant === 'ghost'
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                      : 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {action.icon}
                {action.label && <span className="hidden sm:inline">{action.label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Row */}
        {(Object.keys(filter).length > 0 || search) && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mr-2">Active Filters:</span>

            {search && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium group transition-all hover:bg-primary/20">
                <span>Search: {search}</span>
                <button onClick={() => setSearch('')} className="hover:bg-primary/30 rounded-full p-0.5 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {Object.entries(filter).map(([key, value]) => {
              if (!value) return null;
              const field = filterFields.find(f => f.key === key);
              const displayValue = field?.type === 'select'
                ? field.options?.find(o => o.value === value)?.label || value
                : value;

              return (
                <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-[var(--border-default)] rounded-full text-xs text-[var(--text-primary)] font-medium group transition-all hover:bg-white/10">
                  <span className="text-[var(--text-secondary)] capitalize">{field?.label || key}:</span>
                  <span>{displayValue}</span>
                  <button
                    onClick={() => {
                      const newFilter = { ...filter };
                      delete newFilter[key];
                      setLogFilter(newFilter);
                      setPage(1);
                    }}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={clearAllFilters}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider ml-2"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--text-secondary)] animate-pulse">Loading data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-white/5 min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
          <div className="p-4 bg-[var(--bg-surface)] rounded-full border border-[var(--border-default)] mb-4">
            {emptyState?.icon || <History className="h-8 w-8 text-[var(--text-secondary)] opacity-50" />}
          </div>
          <h4 className="text-[var(--text-primary)] font-medium mb-1">{emptyState?.title || 'No data found'}</h4>
          <p className="text-[var(--text-secondary)] text-sm max-w-[300px]">
            {search || Object.keys(filter).length > 0
              ? "No results match your current filters."
              : (emptyState?.description || "There is no data to display at the moment.")}
          </p>
          {(search || Object.keys(filter).length > 0) && (
            <button
              onClick={clearAllFilters}
              className="mt-4 text-primary text-sm font-medium hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className={`flex flex-col min-h-0 ${fullHeight ? 'flex-1 h-full min-h-0' : ''}`}>
          <div className={`rounded-xl border border-[var(--border-default)] ${localIsScrollable ? 'overflow-auto scrollbar-thin flex-1' : 'overflow-hidden'}`}>
            <table className="min-w-full divide-y divide-[var(--border-default)]">
              <thead className={`border-b border-[var(--border-default)] bg-[var(--bg-surface)] ${localIsScrollable ? 'sticky top-0 z-[5]' : ''}`}>
                <tr>
                  {columns.filter(col => visibleColumns[col.key] !== false).map((col) => {
                    const [sortKey, sortDir] = sort.split(':');
                    const isSorted = sortKey === col.key;

                    return (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={`px-6 py-4 text-left text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider transition-colors group ${col.sortable ? 'cursor-pointer hover:bg-white/5' : ''} ${localIsScrollable ? 'bg-[var(--bg-surface)]' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.sortable && (
                            <div className={`flex flex-col transition-opacity ${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                              {isSorted && sortDir === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {data.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    onClick={() => onRowClick?.(row)}
                    className={`transition-colors ${onRowClick ? 'hover:bg-white/5 cursor-pointer' : ''}`}
                  >
                    {columns.filter(col => visibleColumns[col.key] !== false).map((col) => (
                      <td key={col.key} className="px-6 py-5 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : (
                          <span className="text-sm text-[var(--text-primary)]">{row[col.key]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && (
            <div className="flex items-center justify-between px-2 py-4 flex-shrink-0 border-t border-[var(--border-default)] mt-2">
              <div className="text-sm text-[var(--text-secondary)]">
                Showing <span className="font-medium text-[var(--text-primary)]">{(meta.currentPage - 1) * meta.itemsPerPage + 1}</span> to <span className="font-medium text-[var(--text-primary)]">{Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems)}</span> of <span className="font-medium text-[var(--text-primary)]">{meta.totalItems}</span> entries
              </div>
              {(() => {
                const totalPages = meta.totalPages || Math.ceil(meta.totalItems / meta.itemsPerPage) || 1;
                if (totalPages <= 1) return null;

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={meta.currentPage === 1}
                      className="px-4 py-2 bg-white/5 border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${meta.currentPage === pageNum
                              ? 'bg-primary text-white shadow-lg shadow-primary/20'
                              : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && <span className="text-[var(--text-secondary)] px-2">...</span>}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={meta.currentPage === totalPages}
                      className="px-4 py-2 bg-white/5 border border-[var(--border-default)] rounded-xl text-sm font-medium text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                    >
                      Next
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataGrid;

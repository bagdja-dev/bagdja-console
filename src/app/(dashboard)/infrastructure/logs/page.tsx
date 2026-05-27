'use client';

import { useState, useEffect, useRef } from 'react';
import { getLogs } from '@/lib/logs-api';
import { 
  List, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Terminal,
  Clock,
  ExternalLink,
  Search,
  RefreshCcw,
  X,
  Code
} from 'lucide-react';
import DataGrid, { GridColumn, FilterField } from '@/components/DataGrid';
import { useLayout } from '@/context/LayoutContext';

export default function LogsPage() {
  const { setTopbarContent } = useLayout();
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderVisibleRef = useRef(true);

  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Topbar content logic similar to app detail
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentlyVisible = entry.isIntersecting;

        if (currentlyVisible !== isHeaderVisibleRef.current) {
          isHeaderVisibleRef.current = currentlyVisible;

          if (!currentlyVisible) {
            setTopbarContent(
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Terminal className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold text-[var(--text-primary)] leading-none">Platform Logs</h1>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium">Real-time infrastructure logs</p>
                </div>
              </div>
            );
          } else {
            setTopbarContent(null);
          }
        }
      },
      {
        threshold: 0,
        rootMargin: '-64px 0px 0px 0px'
      }
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => {
      observer.disconnect();
      setTopbarContent(null);
    };
  }, [setTopbarContent]);

  const columns: GridColumn[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <Clock className="w-3 h-3" />
          {new Date(value).toLocaleString()}
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (value) => {
        const lvl = value.toLowerCase();
        switch (lvl) {
          case 'error':
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full border border-red-500/20 uppercase tracking-wider"><XCircle className="w-3 h-3" /> Error</span>;
          case 'warn':
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-full border border-amber-500/20 uppercase tracking-wider"><AlertTriangle className="w-3 h-3" /> Warn</span>;
          case 'debug':
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-500/10 text-gray-500 text-[10px] font-bold rounded-full border border-gray-500/20 uppercase tracking-wider"><Terminal className="w-3 h-3" /> Debug</span>;
          default:
            return <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-full border border-blue-500/20 uppercase tracking-wider"><Info className="w-3 h-3" /> Info</span>;
        }
      },
    },
    {
      key: 'service',
      label: 'Service',
      render: (value, row) => (
        <div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
          <div className="text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-tighter opacity-70">{row.appId}</div>
        </div>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (value, row) => (
        <div className="max-w-xl">
          <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
            {value}
          </p>
          {row.tags && row.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {row.tags.map((tag: string) => (
                <span key={tag} className="px-1.5 py-0.5 bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[10px] font-mono rounded border border-[var(--border-default)] opacity-80">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          className="p-2 text-[var(--text-secondary)] hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
          title="View Details"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      ),
    }
  ];

  const filterFields: FilterField[] = [
    {
      key: 'level',
      label: 'Log Level',
      type: 'select',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warn' },
        { label: 'Error', value: 'error' },
        { label: 'Debug', value: 'debug' },
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'text',
      placeholder: 'e.g. auth, login',
    },
    {
      key: 'appId',
      label: 'App ID',
      type: 'text',
      placeholder: 'Filter by App ID',
    }
  ];

  const fetchData = async (params: any) => {
    const { page, size, search, filter } = params;
    const offset = (page - 1) * size;
    
    const response = await getLogs({
      search: search || undefined,
      level: filter.level || undefined,
      tags: filter.tags || undefined,
      appId: filter.appId || undefined,
      limit: size,
      offset,
    });

    return {
      data: response.items,
      meta: {
        totalItems: response.total,
        currentPage: page,
        itemsPerPage: size,
        totalPages: Math.ceil(response.total / size)
      }
    };
  };

  return (
    <div className="flex flex-col min-h-full space-y-6">
      {/* Header Section */}
      <div ref={headerRef} className="flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <Terminal className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform Logs</h1>
            <p className="text-[var(--text-secondary)]">Real-time infrastructure and service logs across the platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm font-bold border border-[var(--border-default)] hover:bg-white/5 transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Grid Section - Optimized for scrollable behavior and topbar transition */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-120px)] ">
        <div className="p-6 flex-1 flex flex-col min-h-0">
          <DataGrid
            title="Log Entries"
            description="Browse and filter through system-wide logs"
            columns={columns}
            fetchData={fetchData}
            filterFields={filterFields}
            refreshTrigger={refreshTrigger}
            onRowClick={(row) => setSelectedLog(row)}
            emptyState={{
              title: 'No logs found',
              description: 'Logs from your services will appear here once they start reporting.',
              icon: <Terminal className="w-12 h-12 text-[var(--text-secondary)] opacity-20" />
            }}
            isScrollable={true}
            fullHeight={true}
          />
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">Log Details</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider">{selectedLog.id || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Status & Quick Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Timestamp</span>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedLog.timestamp).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZoneName: 'shortOffset'
                    })}
                  </p>
                </div>
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Level</span>
                  <div>
                    {(() => {
                      const lvl = selectedLog.level.toLowerCase();
                      switch (lvl) {
                        case 'error':
                          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">Error</span>;
                        case 'warn':
                          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">Warning</span>;
                        default:
                          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase">{lvl}</span>;
                      }
                    })()}
                  </div>
                </div>
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">Service</span>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{selectedLog.service}</p>
                </div>
                <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block">App ID</span>
                  <p className="text-sm font-mono text-[var(--text-primary)]">{selectedLog.appId}</p>
                </div>
              </div>

              {/* Message Banner */}
              <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Message</span>
                </div>
                <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                  {selectedLog.message}
                </p>
              </div>

              {/* Tags */}
              {selectedLog.tags && selectedLog.tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-1">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedLog.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-primary/5 text-primary text-xs font-medium rounded-full border border-primary/10">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data/Meta Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Structured Data</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog.data || selectedLog.meta || {}, null, 2));
                    }}
                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                  >
                    Copy JSON
                  </button>
                </div>
                <div className="bg-gray-900 rounded-2xl p-6 overflow-hidden border border-white/5 shadow-inner">
                  <pre className="text-xs text-green-400 font-mono overflow-x-auto custom-scrollbar leading-relaxed">
                    {JSON.stringify(selectedLog.data || selectedLog.meta || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-default)] flex justify-end flex-shrink-0 bg-white/5">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-8 py-2.5 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm font-bold border border-[var(--border-default)] hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

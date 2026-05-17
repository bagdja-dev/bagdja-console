'use client';

import React from 'react';
import { X, Mail, Clock, Shield, AlertCircle, CheckCircle2, Copy, History, Server } from 'lucide-react';
import { generateCurl } from '@/lib/utils';

interface MessageLogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: any;
  onResend: (e: React.MouseEvent, logId: string) => Promise<void>;
  resendingId: string | null;
}

export default function MessageLogDetailModal({
  isOpen,
  onClose,
  log,
  onResend,
  resendingId
}: MessageLogDetailModalProps) {
  if (!isOpen || !log) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You might want to trigger a toast/alert here, but since this is a child component, 
    // we assume the parent handles alerts or we just copy silently.
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Message Detail</h3>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-mono tracking-wider">{log.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onResend(e, log.id)}
              disabled={resendingId === log.id}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all uppercase disabled:opacity-50"
            >
              {resendingId === log.id ? <History className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
              {resendingId === log.id ? 'Resending...' : 'Resend Email'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Recipient</span>
              <p className="text-sm font-bold text-[var(--text-primary)] break-all">{log.recipient}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Status</span>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${log.status === 'sent' || log.status === 'delivered'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : log.status === 'failed'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                  {log.status}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Template Name</span>
              <p className="text-sm text-[var(--text-primary)] font-mono">{log.templateName || '-'}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Provider</span>
              <div className="flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <p className="text-sm text-[var(--text-primary)] uppercase">{log.providerType || 'SYSTEM'}</p>
              </div>
            </div>
            <div className="col-span-full p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Subject</span>
              <p className="text-sm font-medium text-[var(--text-primary)]">{log.subject || '(No Subject)'}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Timestamp</span>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Clock className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <p className="text-sm">
                  {new Date(log.createdAt).toLocaleString(undefined, {
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
            </div>
          </div>

          {/* Error Details */}
          {log.errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[10px] font-bold text-red-400 uppercase">Error Message</span>
              </div>
              <p className="text-xs text-red-200/80 italic">{log.errorMessage}</p>
            </div>
          )}

          {/* Message Content Preview */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1">Message Content (HTML)</span>
            <div className="relative group rounded-xl border border-[var(--border-default)] overflow-hidden bg-white">
              <div className="h-[300px] overflow-y-auto p-4">
                <div dangerouslySetInnerHTML={{ __html: log.content }} />
              </div>
              <button
                onClick={() => handleCopy(log.content, 'Content')}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg border border-white/20 text-white transition-all opacity-0 group-hover:opacity-100"
                title="Copy HTML Content"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

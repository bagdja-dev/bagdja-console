'use client';

import React from 'react';
import { X, FileText, Clock, Info, CheckCircle2, Copy } from 'lucide-react';
import type { WalletLedgerEntry } from '@/lib/payment-api';

interface WalletTransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: WalletLedgerEntry | null;
  currency: string;
}

export default function WalletTransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  currency,
}: WalletTransactionDetailModalProps) {
  if (!isOpen || !transaction) return null;

  const isCredit = transaction.direction === 'credit' || Number(transaction.amount) >= 0;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: transaction.currency || currency,
      currencyDisplay: 'code',
      maximumFractionDigits: (transaction.currency || currency) === 'IDR' ? 0 : 2,
    }).format(Math.abs(amount));
  };

  const signedAmount = isCredit
    ? `+${formatMoney(Number(transaction.amount))}`
    : `-${formatMoney(Number(transaction.amount))}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Transaction Detail</h3>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-mono tracking-wider">{transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center justify-center py-4">
             <div className={`text-4xl font-bold tracking-tight tabular-nums ${isCredit ? 'text-emerald-500' : 'text-red-500'}`}>
                {signedAmount}
             </div>
             <div className="text-sm font-medium text-[var(--text-secondary)] mt-1 uppercase tracking-wider">
               {transaction.type.replace(/_/g, ' ')}
             </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Description</span>
              <p className="text-sm font-bold text-[var(--text-primary)]">{transaction.description || '-'}</p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Invoice / External Ref</span>
              <div className="flex items-center gap-2">
                 <p className="text-sm text-[var(--text-primary)] font-mono">{transaction.external_id || '-'}</p>
                 {transaction.external_id && (
                   <button onClick={() => handleCopy(transaction.external_id!)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                     <Copy className="h-3 w-3" />
                   </button>
                 )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Internal Ref ID</span>
              <div className="flex items-center gap-2">
                 <p className="text-sm text-[var(--text-primary)] font-mono">{transaction.reference_id || '-'}</p>
                 {transaction.reference_id && (
                   <button onClick={() => handleCopy(transaction.reference_id!)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                     <Copy className="h-3 w-3" />
                   </button>
                 )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Timestamp</span>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Clock className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <p className="text-sm">
                  {new Date(transaction.created_at).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
             <div className="space-y-2">
               <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1">Metadata</span>
               <div className="p-4 rounded-xl bg-black/40 border border-[var(--border-default)] overflow-x-auto">
                 <pre className="text-xs text-[var(--text-secondary)] font-mono">
                   {JSON.stringify(transaction.metadata, null, 2)}
                 </pre>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

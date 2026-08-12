'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';

/**
 * "My Subscriptions" ditampilkan lewat data `Subscription` di bagdja-auth,
 * yang sudah dihapus sepenuhnya sebagai bagian dari refactoring Product/
 * Plan/License ke bagdja-payment-service (lihat
 * refactoring-payment-service.md Fase 1.D). Belum ada pengganti di
 * payment-service utk kasus "user berlangganan Plan sebuah app pihak
 * ke-3" — halaman ini dinonaktifkan sementara sampai ada penggantinya.
 */
export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
        <CreditCard className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
          Subscriptions temporarily unavailable
        </h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          This feature relied on the legacy `Subscription` entity in bagdja-auth,
          which has been removed as part of the Product/Plan/License refactor to
          bagdja-payment-service. It will return once an equivalent is implemented there.
        </p>
      </div>
    </div>
  );
}

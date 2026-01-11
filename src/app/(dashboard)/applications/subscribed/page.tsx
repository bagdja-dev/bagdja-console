'use client';

import { Package } from 'lucide-react';

export default function SubscribedAppsPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Subscribed Apps
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Apps you have subscribed to
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-12 text-center">
        <Package className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <h3 className="mt-4 text-lg font-medium text-[var(--text-primary)]">
          Coming Soon
        </h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Subscribed apps feature will be available soon.
        </p>
      </div>
    </>
  );
}


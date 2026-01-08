'use client';

export default function AssetsPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          My Assets
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Manage your organization assets
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <p className="text-[var(--text-secondary)]">
          Assets list will be displayed here.
        </p>
      </div>
    </>
  );
}


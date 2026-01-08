'use client';

export default function EmailServicePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          My Email Services
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Manage your email service configurations
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <p className="text-[var(--text-secondary)]">
          No email services configured yet. Create a new service to get started.
        </p>
      </div>
    </>
  );
}


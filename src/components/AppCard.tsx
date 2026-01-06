interface AppCardProps {
  title: string;
  description: string;
  status: 'coming soon' | 'available' | 'maintenance';
  onClick?: () => void;
}

export function AppCard({ title, description, status, onClick }: AppCardProps) {
  const statusColors = {
    'coming soon': 'bg-[var(--brand-warning)]/20 text-[var(--brand-warning)]',
    available: 'bg-[var(--brand-success)]/20 text-[var(--brand-success)]',
    maintenance: 'bg-[var(--brand-error)]/20 text-[var(--brand-error)]',
  };

  const isClickable = status === 'available' && onClick;

  return (
    <div
      className={`
        rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6
        transition-all hover:shadow-lg
        ${isClickable ? 'cursor-pointer hover:border-[var(--action-primary)]' : 'cursor-default'}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={`
            inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
            ${statusColors[status]}
          `}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {isClickable && (
          <span className="text-sm text-[var(--action-primary)] font-medium">Open →</span>
        )}
      </div>
    </div>
  );
}






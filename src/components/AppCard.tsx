interface AppCardProps {
  title: string;
  description: string;
  status: 'coming soon' | 'available' | 'maintenance';
  onClick?: () => void;
}

export function AppCard({ title, description, status, onClick }: AppCardProps) {
  const statusColors = {
    'coming soon': 'bg-yellow-100 text-yellow-800',
    available: 'bg-green-100 text-green-800',
    maintenance: 'bg-red-100 text-red-800',
  };

  const isClickable = status === 'available' && onClick;

  return (
    <div
      className={`
        rounded-lg border border-gray-200 bg-white p-6 shadow-sm
        transition-all hover:shadow-md
        ${isClickable ? 'cursor-pointer hover:border-blue-300' : 'cursor-default'}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
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
          <span className="text-sm text-blue-600 font-medium">Open →</span>
        )}
      </div>
    </div>
  );
}


import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helpText, id, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || `select-${generatedId}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full px-4 py-2 border rounded-lg
            bg-[var(--bg-surface)] text-[var(--text-primary)]
            border-[var(--border-default)]
            focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent
            disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-[var(--brand-error)]' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-[var(--brand-error)]" role="alert">
            {error}
          </p>
        )}
        {!error && helpText && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';


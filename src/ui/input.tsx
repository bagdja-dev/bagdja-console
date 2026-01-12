import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

// Generate unique ID using useId hook (React 18+)
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helpText, id, type, ...props }, ref) => {
    // Use useId for stable ID generation instead of Math.random
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`
            w-full px-4 py-2 border rounded-lg
            bg-[var(--bg-surface)] text-[var(--text-primary)]
            border-[var(--border-default)]
            focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent
            disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50
            placeholder:text-[var(--text-muted)]
            ${type === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}
            ${error ? 'border-[var(--brand-error)]' : ''}
            ${className}
          `}
          {...props}
        />
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

Input.displayName = 'Input';





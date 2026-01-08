'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface CustomSelectProps {
  label?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  emptyText?: string;
  loading?: boolean;
}

export function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error,
  helpText,
  className,
  emptyText = 'No options available',
  loading = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const generatedId = React.useId();
  const selectId = `custom-select-${generatedId}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-[var(--text-primary)] mb-1"
        >
          {label}
        </label>
      )}
      <div ref={selectRef} className="relative">
        <button
          type="button"
          id={selectId}
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={cn(
            'w-full px-4 py-2 rounded-lg border text-left',
            'bg-[var(--bg-surface)] text-[var(--text-primary)]',
            'border-[var(--border-default)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent',
            'disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50',
            'flex items-center justify-between',
            isOpen && 'border-[var(--action-primary)] ring-2 ring-[var(--action-primary)]',
            error && 'border-[var(--brand-error)]'
          )}
        >
          <span className="truncate flex-1 text-left">
            {loading ? (
              <span className="text-[var(--text-secondary)]">Loading...</span>
            ) : selectedOption ? (
              selectedOption.label
            ) : (
              <span className="text-[var(--text-muted)]">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 ml-2 flex-shrink-0 text-[var(--text-secondary)] transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && !disabled && !loading && (
          <div className="absolute z-50 w-full mt-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1 max-h-60 overflow-auto">
              {options.length === 0 ? (
                <div className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                  {emptyText}
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-[var(--bg-hover)] text-[var(--action-primary)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                              {option.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 ml-2 flex-shrink-0 text-[var(--action-primary)]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
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


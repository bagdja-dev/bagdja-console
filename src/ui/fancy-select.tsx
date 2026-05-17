'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Check, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FancySelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export interface FancySelectProps {
  label?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  options: FancySelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  emptyText?: string;
  loading?: boolean;
  searchable?: boolean;
}

export function FancySelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  disabled = false,
  error,
  helpText,
  className,
  emptyText = 'No options found',
  loading = false,
  searchable = true,
}: FancySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const generatedId = React.useId();
  const selectId = `fancy-select-${generatedId}`;

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
    if (!isOpen) {
      setActiveIndex(-1);
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || loading) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && activeIndex >= 0) {
        handleSelect(filteredOptions[activeIndex].value);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && optionsRef.current) {
      const activeElement = optionsRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const toggleDropdown = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div
      className={cn('w-full group', className)}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 transition-colors group-focus-within:text-[var(--action-primary)]"
        >
          {label}
        </label>
      )}
      <div ref={selectRef} className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          id={selectId}
          onClick={toggleDropdown}
          disabled={disabled || loading}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border text-left transition-all duration-200',
            'bg-[var(--bg-surface)] text-[var(--text-primary)]',
            'border-[var(--border-default)] shadow-sm',
            'hover:border-[var(--border-hover)] hover:shadow-md',
            'focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]/20 focus:border-[var(--action-primary)]',
            'disabled:bg-[var(--bg-sidebar)] disabled:cursor-not-allowed disabled:opacity-50',
            'flex items-center justify-between gap-2',
            isOpen && 'border-[var(--action-primary)] ring-2 ring-[var(--action-primary)]/20 shadow-lg',
            error && 'border-[var(--brand-error)] focus:ring-[var(--brand-error)]/20 focus:border-[var(--brand-error)]'
          )}
        >
          <div className="flex items-center gap-2 truncate flex-1">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
                <span className="text-[var(--text-secondary)]">Loading...</span>
              </>
            ) : selectedOption ? (
              <>
                {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                <div className="flex flex-col truncate">
                  <span className="font-medium truncate">{selectedOption.label}</span>
                </div>
              </>
            ) : (
              <span className="text-[var(--text-secondary)]">{placeholder}</span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200",
              isOpen && "rotate-180 text-[var(--action-primary)]"
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={cn(
              "absolute z-[100] mt-2 w-full min-w-[200px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-200",
              "origin-top"
            )}
          >
            {/* Search Box */}
            {searchable && (
              <div className="p-2 border-b border-[var(--border-default)] sticky top-0 bg-[var(--bg-surface)] z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-[var(--bg-sidebar)] border-none focus:ring-1 focus:ring-[var(--action-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveIndex(-1);
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--bg-surface)] rounded-md text-[var(--text-secondary)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div
              ref={optionsRef}
              className="max-h-[300px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-[var(--border-default)]"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
                      "group/item",
                      (value === option.value || activeIndex === index) ? "bg-[var(--bg-sidebar)]" : "",
                      value === option.value ? "text-[var(--action-primary)]" : "text-[var(--text-primary)]"
                    )}
                  >
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="font-medium truncate">{option.label}</span>
                      {option.description && (
                        <span className={cn(
                          "text-xs truncate",
                          value === option.value ? "text-[var(--action-primary)]/70" : "text-[var(--text-secondary)]"
                        )}>
                          {option.description}
                        </span>
                      )}
                    </div>
                    {value === option.value && (
                      <Check className="w-4 h-4 shrink-0 animate-in zoom-in duration-200" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">{emptyText}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-[var(--brand-error)] flex items-center gap-1 animate-in slide-in-from-top-1" role="alert">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          {helpText}
        </p>
      )}
    </div>
  );
}

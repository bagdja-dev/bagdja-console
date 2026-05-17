'use client';

import type { ReactNode } from 'react';
import {
  getCurrencyAmountPlaceholder,
  getCurrencyAmountStep,
  getCurrencyDecimals,
  sanitizeAmountInput,
  sanitizePercentInput,
} from '@/lib/billing-format';

type FieldShellProps = {
  label: string;
  htmlFor: string;
  helpText?: string;
  children: ReactNode;
};

function FieldShell({ label, htmlFor, helpText, children }: FieldShellProps) {
  return (
    <div className="w-full">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--text-primary)] mb-1">
        {label}
      </label>
      {children}
      {helpText ? (
        <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">{helpText}</p>
      ) : null}
    </div>
  );
}

type CurrencyAmountInputProps = {
  id: string;
  label: string;
  currency: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
};

export function CurrencyAmountInput({
  id,
  label,
  currency,
  value,
  onChange,
  disabled,
  required,
  helpText,
  placeholder,
}: CurrencyAmountInputProps) {
  const decimals = getCurrencyDecimals(currency);
  const currencyLabel = currency === 'DEFAULT' ? '—' : currency;

  return (
    <FieldShell
      label={label}
      htmlFor={id}
      helpText={
        helpText ??
        (currency !== 'DEFAULT'
          ? `Amount in ${currency} for this rule.`
          : 'Applies in each transaction’s currency.')
      }
    >
      <div className="relative flex items-stretch">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          required={required && value.length > 0}
          value={value}
          placeholder={placeholder ?? getCurrencyAmountPlaceholder(currency)}
          step={getCurrencyAmountStep(currency)}
          onChange={(e) => onChange(sanitizeAmountInput(e.target.value, decimals))}
          className={[
            'w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]',
            'py-2 pl-4 pr-[4.25rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        />
        <span
          className={[
            'pointer-events-none absolute right-0 top-0 bottom-0 flex items-center',
            'rounded-r-lg border-l border-[var(--border-default)] bg-[var(--bg-main)]',
            'px-3 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]',
          ].join(' ')}
          aria-hidden
        >
          {currencyLabel}
        </span>
      </div>
    </FieldShell>
  );
}

type PercentFeeInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
};

export function PercentFeeInput({
  id,
  label = 'Percentage fee',
  value,
  onChange,
  disabled,
  required,
  helpText,
}: PercentFeeInputProps) {
  return (
    <FieldShell
      label={label}
      htmlFor={id}
      helpText={
        helpText ??
        'Used when transaction amount is above the threshold. Example: enter 2.5 for 2.5%.'
      }
    >
      <div className="relative flex items-stretch">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          required={required && value.length > 0}
          value={value}
          placeholder="2.5"
          onChange={(e) => onChange(sanitizePercentInput(e.target.value))}
          className={[
            'w-full min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]',
            'py-2 pl-4 pr-10 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        />
        <span
          className={[
            'pointer-events-none absolute right-0 top-0 bottom-0 flex items-center',
            'px-3 text-sm font-semibold text-[var(--text-secondary)]',
          ].join(' ')}
          aria-hidden
        >
          %
        </span>
      </div>
    </FieldShell>
  );
}

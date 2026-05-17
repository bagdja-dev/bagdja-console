/** Decimal places for money inputs by currency code */
export function getCurrencyDecimals(currency: string): number {
  if (currency === 'DEFAULT' || !currency) return 0;
  return currency === 'IDR' ? 0 : 2;
}

export function getCurrencyAmountStep(currency: string): string {
  return getCurrencyDecimals(currency) === 0 ? '1' : '0.01';
}

export function getCurrencyAmountPlaceholder(currency: string): string {
  if (currency === 'IDR') return '1.000';
  if (currency === 'DEFAULT') return '1000';
  return '10.00';
}

/** Strip non-numeric except one decimal point */
export function sanitizeAmountInput(raw: string, maxDecimals: number): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  const intPart = parts[0];
  const decPart = parts.slice(1).join('').slice(0, maxDecimals);
  return decPart.length > 0 ? `${intPart}.${decPart}` : `${intPart}.`;
}

export function sanitizePercentInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) {
    const n = parseFloat(cleaned);
    if (!Number.isNaN(n) && n > 100) return '100';
    return cleaned;
  }
  const intPart = parts[0];
  const decPart = parts.slice(1).join('').slice(0, 2);
  const combined = decPart.length > 0 ? `${intPart}.${decPart}` : `${intPart}.`;
  const n = parseFloat(combined);
  if (!Number.isNaN(n) && n > 100) return '100';
  return combined;
}

export function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

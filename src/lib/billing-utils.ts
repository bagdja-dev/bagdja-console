/**
 * Billing fee helpers — API stores percentage_fee as decimal (0.01 = 1%).
 * UI uses whole percent points (user enters 1 for 1%).
 */

/** Display label e.g. "2.5%" or "1%" */
export function formatPercentageFeeForDisplay(stored: number): string {
  if (!Number.isFinite(stored)) return '0%';

  // Standard decimal storage (e.g. 0.025 → 2.5%)
  if (stored > 0 && stored < 1) {
    return `${trimTrailingZeros(stored * 100)}%`;
  }

  // Legacy rows saved as whole percent (e.g. 1 stored meaning 1%)
  if (stored >= 1 && stored <= 100) {
    return `${trimTrailingZeros(stored)}%`;
  }

  return `${trimTrailingZeros(stored * 100)}%`;
}

/** Form input value from API decimal (or legacy whole percent) */
export function percentageFeeToInput(stored: number): number {
  if (!Number.isFinite(stored)) return 0;
  if (stored > 0 && stored < 1) return roundTo(stored * 100, 6);
  if (stored >= 1 && stored <= 100) return stored;
  return roundTo(stored * 100, 6);
}

/** API decimal from form percent input (1 → 0.01) */
export function percentageFeeFromInput(inputPercent: number): number {
  if (!Number.isFinite(inputPercent)) return 0;
  return roundTo(inputPercent / 100, 6);
}

function trimTrailingZeros(value: number): string {
  const fixed = value.toFixed(4);
  return fixed.replace(/\.?0+$/, '');
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

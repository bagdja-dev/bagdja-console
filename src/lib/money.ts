/** Format nominal dengan kode mata uang (IDR tanpa desimal). */
export function formatMoney(amount: number | null | undefined, currency = 'IDR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(Number(amount) || 0);
}

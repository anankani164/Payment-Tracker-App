/**
 * Number formatting helpers for consistent, readable figures.
 * - Thousand separators
 * - Fixed decimal places
 * - Currency support (default GHS)
 */

export function fmtNumber(value, { decimals = 2 } = {}){
  const n = Number(value);
  if (!isFinite(n)) return (0).toFixed(decimals);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n);
}

export function fmtMoney(value, currency = 'GHS', { decimals = 2, useSymbol = false } = {}){
  const n = Number(value);
  if (!isFinite(n)) return `${useSymbol ? '' : currency + ' '}${(0).toFixed(decimals)}`;
  const s = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: useSymbol ? 'symbol' : 'code',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n);
  return s;
}

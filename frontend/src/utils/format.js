/**
 * Number formatting helpers with enforced thousand separators (commas) and dot decimals.
 */
export function fmtNumber(value, { decimals = 2 } = {}){
  const n = Number(value);
  if (!isFinite(n)) return (0).toFixed(decimals);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  }).format(n);
}

export function fmtMoney(value, currency = 'GHS', { decimals = 2, useSymbol = false } = {}){
  const n = Number(value);
  if (!isFinite(n)) {
    const zero = (0).toFixed(decimals);
    return useSymbol ? zero : `${currency} ${zero}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: useSymbol ? 'symbol' : 'code',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  }).format(n);
}

/**
 * Currency Formatting Utilities
 * Clean utilities for Iranian Toman and USD formatting
 */

/**
 * Format Toman currency with consistent English formatting
 */
export function formatTomanCurrency(
  amount: number,
  options: {
    showFree?: boolean;
    showUnit?: boolean;
    compact?: boolean;
  } = {},
): string {
  const { showFree = true, showUnit = true, compact = false } = options;

  if (amount === 0 && showFree) {
    return 'Free';
  }

  if (amount === 0) {
    return '0';
  }

  // Compact formatting
  if (compact) {
    if (amount < 1000) {
      const formatted = Math.round(amount).toLocaleString('en-US');
      return showUnit ? `${formatted} Toman` : formatted;
    }

    if (amount < 1000000) {
      const thousands = Math.round(amount / 1000 * 10) / 10;
      return `${thousands}K${showUnit ? ' Toman' : ''}`;
    }

    if (amount < 1000000000) {
      const millions = Math.round(amount / 1000000 * 10) / 10;
      return `${millions}M${showUnit ? ' Toman' : ''}`;
    }

    const billions = Math.round(amount / 1000000000 * 10) / 10;
    return `${billions}B${showUnit ? ' Toman' : ''}`;
  }

  // Standard formatting
  const formatted = Math.round(amount).toLocaleString('en-US');
  return showUnit ? `${formatted} Toman` : formatted;
}

/**
 * Format currency with general options
 */
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'IRR' | 'TOMAN' = 'USD',
  locale = 'en-US',
): string {
  if (currency === 'TOMAN') {
    return formatTomanCurrency(amount);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === 'IRR' ? 'IRR' : 'USD',
    minimumFractionDigits: currency === 'IRR' ? 0 : 2,
    maximumFractionDigits: currency === 'IRR' ? 0 : 2,
  }).format(amount);
}

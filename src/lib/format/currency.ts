/**
 * Enhanced Currency Formatting Utilities
 * Production-ready utilities for USD to Iranian Toman conversion and formatting
 * Supports both English and Persian locales with proper number formatting
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type CurrencyType = 'USD' | 'IRR' | 'TOMAN';
export type LocaleType = 'en' | 'fa';

export type CurrencyFormatOptions = {
  showFree?: boolean;
  showUnit?: boolean;
  compact?: boolean;
  showSymbol?: boolean;
  locale?: LocaleType;
  precision?: number;
};

// =============================================================================
// CORE CURRENCY FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format Toman currency with enhanced localization and Persian number support
 */
export function formatTomanCurrency(
  amount: number,
  options: CurrencyFormatOptions = {},
): string {
  const {
    showFree = true,
    showUnit = true,
    compact = false,
    locale = 'en',
    precision = 0,
  } = options;

  if (amount === 0 && showFree) {
    return locale === 'fa' ? 'رایگان' : 'Free';
  }

  if (amount === 0) {
    return '0';
  }

  // Compact formatting
  if (compact) {
    return formatCompactCurrency(amount, 'TOMAN', locale, showUnit);
  }

  // Standard formatting with locale support
  const localeString = locale === 'fa' ? 'fa-IR' : 'en-US';
  const formatted = Math.round(amount * 10 ** precision) / 10 ** precision;
  const numberString = formatted.toLocaleString(localeString, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  if (!showUnit) {
    return numberString;
  }

  const unitLabel = locale === 'fa' ? 'تومان' : 'Toman';
  return locale === 'fa' ? `${numberString} ${unitLabel}` : `${numberString} ${unitLabel}`;
}

/**
 * Format currency with comprehensive options and USD to Toman conversion support
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyType = 'USD',
  locale: LocaleType = 'en',
  options: CurrencyFormatOptions = {},
): string {
  const { showFree = true, compact = false, precision } = options;

  if (amount === 0 && showFree) {
    return locale === 'fa' ? 'رایگان' : 'Free';
  }

  if (currency === 'TOMAN') {
    return formatTomanCurrency(amount, { ...options, locale });
  }

  if (compact) {
    return formatCompactCurrency(amount, currency, locale);
  }

  const localeString = locale === 'fa' ? 'fa-IR' : 'en-US';
  const actualCurrency = currency === 'IRR' ? 'IRR' : 'USD';

  return new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency: actualCurrency,
    minimumFractionDigits: precision ?? (currency === 'IRR' ? 0 : 2),
    maximumFractionDigits: precision ?? (currency === 'IRR' ? 0 : 2),
  }).format(amount);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format compact currency (K, M, B suffixes)
 */
function formatCompactCurrency(
  amount: number,
  currency: CurrencyType,
  locale: LocaleType,
  showUnit = true,
): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  let value: number;
  let suffix: string;

  if (absAmount < 1000) {
    value = absAmount;
    suffix = '';
  } else if (absAmount < 1000000) {
    value = absAmount / 1000;
    suffix = locale === 'fa' ? 'هزار' : 'K';
  } else if (absAmount < 1000000000) {
    value = absAmount / 1000000;
    suffix = locale === 'fa' ? 'میلیون' : 'M';
  } else {
    value = absAmount / 1000000000;
    suffix = locale === 'fa' ? 'میلیارد' : 'B';
  }

  const localeString = locale === 'fa' ? 'fa-IR' : 'en-US';
  const roundedValue = Math.round(value * 10) / 10;
  const formatted = roundedValue.toLocaleString(localeString, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  if (!showUnit || currency === 'USD') {
    return `${sign}${formatted}${suffix}`;
  }

  const unitLabel = currency === 'TOMAN'
    ? (locale === 'fa' ? 'تومان' : 'Toman')
    : (locale === 'fa' ? 'ریال' : 'Rial');

  return locale === 'fa'
    ? `${sign}${formatted}${suffix} ${unitLabel}`
    : `${sign}${formatted}${suffix} ${unitLabel}`;
}

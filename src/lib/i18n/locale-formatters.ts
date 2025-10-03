/**
 * Locale formatters for currency, numbers, and dates
 * English-only application (locale defaults to 'en-US')
 */

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

/**
 * Currency formatter
 * @param amount - Amount to format
 * @param options - Formatting options
 * @param options.showFree - Show "Free" for zero amounts (default: true)
 * @param options.compact - Use compact notation (not implemented yet)
 * @param locale - Locale to use (defaults to 'en-US')
 */
export function formatCurrencyLocale(
  amount: number,
  options: {
    showFree?: boolean;
    compact?: boolean;
  } = {},
  locale: string = DEFAULT_LOCALE,
): string {
  const { showFree = true } = options;

  // Handle free/zero amounts
  if (amount === 0 && showFree) {
    return 'Free';
  }

  if (amount === 0) {
    return '$0.00';
  }

  // Standard currency formatting
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Client-side currency formatter (for use in components)
 * @param amount - Amount to format
 * @param options - Formatting options
 * @param options.showFree - Show "Free" for zero amounts (default: true)
 * @param options.compact - Use compact notation (not implemented yet)
 * @param locale - Locale to use (defaults to 'en-US')
 */
export function formatCurrencyClient(
  amount: number,
  options: {
    showFree?: boolean;
    compact?: boolean;
  } = {},
  locale: string = DEFAULT_LOCALE,
): string {
  return formatCurrencyLocale(amount, options, locale);
}

/**
 * Number formatter
 * @param number - Number to format
 * @param options - Formatting options
 * @param locale - Locale to use (defaults to 'en-US')
 */
export function formatNumberLocale(
  number: number,
  options?: Intl.NumberFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, options).format(number);
}

/**
 * Date formatter
 * @param date - Date to format
 * @param options - Formatting options
 * @param locale - Locale to use (defaults to 'en-US')
 */
export function formatDateLocale(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Relative time formatter (e.g., "2 days ago")
 * @param date - Date to format
 * @param locale - Locale to use (defaults to 'en-US')
 */
export function formatRelativeTimeLocale(
  date: string | Date,
  locale: string = DEFAULT_LOCALE,
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return rtf.format(-minutes, 'minute');
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return rtf.format(-hours, 'hour');
  }
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return rtf.format(-days, 'day');
  }

  const months = Math.floor(diffInSeconds / 2592000);
  return rtf.format(-months, 'month');
}

/**
 * Format percentage
 * @param value - Percentage value to format
 * @param options - Formatting options
 * @param locale - Locale to use (defaults to 'en-US')
 */
export function formatPercentageLocale(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(value / 100);
}

/**
 * Create formatters for client components
 * @param locale - Locale to use (defaults to 'en-US')
 */
export function createLocaleFormatters(locale: string = DEFAULT_LOCALE) {
  return {
    currency: (amount: number, options?: { showFree?: boolean; compact?: boolean }) =>
      formatCurrencyClient(amount, options, locale),

    number: (number: number, options?: Intl.NumberFormatOptions) =>
      formatNumberLocale(number, options, locale),

    date: (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateLocale(date, options, locale),

    relativeTime: (date: string | Date) =>
      formatRelativeTimeLocale(date, locale),

    percentage: (value: number, options?: Intl.NumberFormatOptions) =>
      formatPercentageLocale(value, options, locale),
  };
}

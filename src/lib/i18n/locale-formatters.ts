/**
 * Next.js Intl Locale-Aware Formatters
 * Uses next-intl for proper locale-aware formatting of currency, numbers, and dates
 */

import { getLocale } from 'next-intl/server';

// Persian digit mapping
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert English digits to Persian digits
 */
function toPersianDigits(str: string): string {
  return str.replace(/\d/g, d => persianDigits[Number.parseInt(d)] || d);
}

/**
 * Get current locale (fallback for client components)
 */
async function getCurrentLocale(): Promise<string> {
  try {
    return await getLocale();
  } catch {
    // Fallback for client components - detect from document or default to en
    if (typeof window !== 'undefined') {
      return document.documentElement.lang || 'en';
    }
    return 'en';
  }
}

/**
 * Locale-aware currency formatter
 */
export async function formatCurrencyLocale(
  amount: number,
  currency: 'USD' | 'IRR' | 'TOMAN' = 'USD',
  options: {
    showFree?: boolean;
    compact?: boolean;
    locale?: string;
  } = {},
): Promise<string> {
  const { showFree = true, locale } = options;
  const currentLocale = locale || await getCurrentLocale();
  const isPersian = currentLocale === 'fa';

  // Handle free/zero amounts
  if (amount === 0 && showFree) {
    return isPersian ? 'رایگان' : 'Free';
  }

  if (amount === 0) {
    return '0';
  }

  // Handle Toman currency
  if (currency === 'TOMAN') {
    const formatted = new Intl.NumberFormat(currentLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));

    const unit = isPersian ? 'تومان' : 'Toman';
    const result = `${formatted} ${unit}`;

    return isPersian ? toPersianDigits(result) : result;
  }

  // Standard currency formatting
  const formatted = new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency: currency === 'IRR' ? 'IRR' : 'USD',
    minimumFractionDigits: currency === 'IRR' ? 0 : 2,
    maximumFractionDigits: currency === 'IRR' ? 0 : 2,
  }).format(amount);

  return isPersian ? toPersianDigits(formatted) : formatted;
}

/**
 * Client-side currency formatter (for use in components with useLocale)
 */
export function formatCurrencyClient(
  amount: number,
  locale: string,
  currency: 'USD' | 'IRR' | 'TOMAN' = 'USD',
  options: {
    showFree?: boolean;
    compact?: boolean;
  } = {},
): string {
  const { showFree = true } = options;
  const isPersian = locale === 'fa';

  // Handle free/zero amounts
  if (amount === 0 && showFree) {
    return isPersian ? 'رایگان' : 'Free';
  }

  if (amount === 0) {
    return '0';
  }

  // Handle Toman currency
  if (currency === 'TOMAN') {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));

    const unit = isPersian ? 'تومان' : 'Toman';
    const result = `${formatted} ${unit}`;

    return isPersian ? toPersianDigits(result) : result;
  }

  // Standard currency formatting
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === 'IRR' ? 'IRR' : 'USD',
    minimumFractionDigits: currency === 'IRR' ? 0 : 2,
    maximumFractionDigits: currency === 'IRR' ? 0 : 2,
  }).format(amount);

  return isPersian ? toPersianDigits(formatted) : formatted;
}

/**
 * Locale-aware number formatter
 */
export function formatNumberLocale(
  number: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  const formatted = new Intl.NumberFormat(locale, options).format(number);
  return locale === 'fa' ? toPersianDigits(formatted) : formatted;
}

/**
 * Locale-aware date formatter
 */
export function formatDateLocale(
  date: string | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  const formatted = new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  return locale === 'fa' ? toPersianDigits(formatted) : formatted;
}

/**
 * Locale-aware relative time formatter (e.g., "2 days ago")
 */
export function formatRelativeTimeLocale(
  date: string | Date,
  locale: string,
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    const result = rtf.format(-diffInSeconds, 'second');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    const result = rtf.format(-minutes, 'minute');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    const result = rtf.format(-hours, 'hour');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    const result = rtf.format(-days, 'day');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }

  const months = Math.floor(diffInSeconds / 2592000);
  const result = rtf.format(-months, 'month');
  return locale === 'fa' ? toPersianDigits(result) : result;
}

/**
 * Format percentage with locale awareness
 */
export function formatPercentageLocale(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(value / 100);

  return locale === 'fa' ? toPersianDigits(formatted) : formatted;
}

/**
 * Hook-compatible formatters for client components
 */
export function createLocaleFormatters(locale: string) {
  return {
    currency: (amount: number, currency: 'USD' | 'IRR' | 'TOMAN' = 'USD', options?: { showFree?: boolean; compact?: boolean }) =>
      formatCurrencyClient(amount, locale, currency, options),

    number: (number: number, options?: Intl.NumberFormatOptions) =>
      formatNumberLocale(number, locale, options),

    date: (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateLocale(date, locale, options),

    relativeTime: (date: string | Date) =>
      formatRelativeTimeLocale(date, locale),

    percentage: (value: number, options?: Intl.NumberFormatOptions) =>
      formatPercentageLocale(value, locale, options),
  };
}

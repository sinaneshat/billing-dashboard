/**
 * Date Formatting Utilities
 * Enhanced utilities for date and time formatting with Persian/Iranian calendar support
 */

// Persian digit mapping for consistency
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert English digits to Persian digits
 */
export function toPersianDigits(str: string): string {
  return str.replace(/\d/g, d => persianDigits[Number.parseInt(d, 10)] || d);
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: Date | string | number): boolean {
  const dateObj = new Date(date);
  return !Number.isNaN(dateObj.getTime());
}

/**
 * Format date with enhanced locale support and Persian digits
 * Internal utility function used by other date formatting functions
 */
function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-US',
): string {
  const dateObj = new Date(date);

  if (!isValidDate(dateObj)) {
    return locale === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  const formatted = new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);

  // Convert to Persian digits for Persian locale
  return locale === 'fa' ? toPersianDigits(formatted) : formatted;
}

/**
 * Format billing dates specifically for subscription cards
 */
export function formatBillingDate(
  date: Date | string | number,
  locale = 'en-US',
  format: 'short' | 'medium' | 'long' = 'medium',
): string {
  if (!isValidDate(date)) {
    return locale === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
  }

  const options: Record<'short' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    medium: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    },
  };

  return formatDate(date, options[format], locale);
}

/**
 * Format next billing date with contextual information
 */
export function formatNextBillingDate(
  date: Date | string | number,
  locale = 'en-US',
): string {
  if (!isValidDate(date)) {
    return locale === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
  }

  const dateObj = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // If it's today
  if (diffDays === 0) {
    return locale === 'fa' ? 'امروز' : 'Today';
  }

  // If it's tomorrow
  if (diffDays === 1) {
    return locale === 'fa' ? 'فردا' : 'Tomorrow';
  }

  // If it's within this week (next 7 days)
  if (diffDays > 0 && diffDays <= 7) {
    const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    const formatted = weekdayFormat.format(dateObj);
    return locale === 'fa' ? toPersianDigits(formatted) : formatted;
  }

  // For dates further out, use standard formatting
  return formatBillingDate(date, locale, 'medium');
}

/**
 * Get relative time with Persian support
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale = 'en-US',
): string {
  if (!isValidDate(date)) {
    return locale === 'fa' ? 'تاریخ نامعتبر' : 'Invalid Date';
  }

  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Use Intl.RelativeTimeFormat for proper localization
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffMins < 1) {
    const result = rtf.format(0, 'minute');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }

  if (diffMins < 60) {
    const result = rtf.format(-diffMins, 'minute');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }

  if (diffHours < 24) {
    const result = rtf.format(-diffHours, 'hour');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }

  if (diffDays < 7) {
    const result = rtf.format(-diffDays, 'day');
    return locale === 'fa' ? toPersianDigits(result) : result;
  }

  // For older dates, show formatted date
  return formatDate(target, {}, locale);
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: Date | string | number): boolean {
  if (!isValidDate(date)) {
    return false;
  }

  const dateObj = new Date(date);
  const now = new Date();
  return dateObj.getTime() < now.getTime();
}

/**
 * Get days until a date (positive = future, negative = past)
 */
export function getDaysUntil(date: Date | string | number): number {
  if (!isValidDate(date)) {
    return 0;
  }

  const dateObj = new Date(date);
  const now = new Date();
  const diffTime = dateObj.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

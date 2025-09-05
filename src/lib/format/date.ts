/**
 * Date Formatting Utilities
 * Clean utilities for date and time formatting
 */

/**
 * Format date with locale support
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-US',
): string {
  const dateObj = new Date(date);

  if (Number.isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | string | number,
  locale = 'en-US',
): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }, locale);
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string | number,
  locale = 'en-US',
): string {
  return formatDate(date, {
    hour: '2-digit',
    minute: '2-digit',
  }, locale);
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1)
    return 'Just now';
  if (diffMins < 60)
    return `${diffMins}m ago`;
  if (diffHours < 24)
    return `${diffHours}h ago`;
  if (diffDays < 7)
    return `${diffDays}d ago`;

  return formatDate(target);
}

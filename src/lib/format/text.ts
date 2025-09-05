/**
 * Text Formatting Utilities
 * Clean utilities for text manipulation and formatting
 */

/**
 * Format numbers with locale support
 */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format percentage values
 */
export function formatPercent(
  value: number,
  decimals = 1,
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Create URL-safe slug from text
 */
export function formatSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate slug from name with fallback
 */
export function generateSlugFromName(name: string, fallback = 'item'): string {
  const slug = formatSlug(name);
  return slug || fallback;
}

/**
 * Capitalize first letter of each word
 */
export function formatTitle(text: string): string {
  return text.replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength)
    return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

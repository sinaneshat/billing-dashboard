/**
 * Iranian Currency and Date Formatting Utilities
 * Utilities for formatting Iranian currency (IRR) and Persian dates
 */

// Persian number mapping
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Convert English digits to Persian digits
 */
export function toPersianDigits(str: string): string {
  return str.replace(/\d/g, d => persianDigits[Number.parseInt(d)] || d);
}

/**
 * Convert Persian digits to English digits
 */
export function toEnglishDigits(str: string): string {
  let result = str;

  // Convert Persian digits
  persianDigits.forEach((persian, index) => {
    const regex = new RegExp(persian, 'g');
    result = result.replace(regex, index.toString());
  });

  // Convert Arabic digits
  arabicDigits.forEach((arabic, index) => {
    const regex = new RegExp(arabic, 'g');
    result = result.replace(regex, index.toString());
  });

  return result;
}

/**
 * Format currency in Persian style
 */
export function formatPersianCurrency(amount: number, currency: string = 'IRR'): string {
  const formatted = new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return toPersianDigits(formatted);
}

/**
 * Format currency in Toman (divide by 10)
 */
export function formatTomanCurrency(amount: number): string {
  const tomanAmount = amount / 10;
  const formatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(tomanAmount);

  return `${toPersianDigits(formatted)} تومان`;
}

/**
 * Format date in Persian (Jalali calendar would require additional library)
 */
export function formatPersianDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  const formatted = new Intl.DateTimeFormat('fa-IR', defaultOptions).format(new Date(dateString));
  return toPersianDigits(formatted);
}

/**
 * Format date and time in Persian
 */
export function formatPersianDateTime(dateString: string): string {
  const formatted = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

  return toPersianDigits(formatted);
}

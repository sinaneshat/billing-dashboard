/**
 * Iranian Currency Formatting Utilities
 * Utilities for formatting Iranian currency (IRR) with Persian digits
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
 * Format currency with Persian digits
 */
export function formatPersianCurrency(amount: number, currency: string = 'IRR'): string {
  const formatted = new Intl.NumberFormat('en-US', {
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
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(tomanAmount);

  return `${toPersianDigits(formatted)} Toman`;
}

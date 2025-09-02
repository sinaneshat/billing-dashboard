/**
 * Currency formatting utilities for Iranian Toman
 * All text in English, only "Toman" unit allowed in local language
 */

/**
 * Format Toman amount with English formatting
 * @param amount - Amount in Toman
 * @param options - Formatting options
 * @param options.showFree - Show "Free" for 0 amounts
 * @param options.showUnit - Show "Toman" unit
 * @param options.useEnglishDigits - Always use English digits
 * @returns Formatted string
 */
export function formatTomanCurrency(
  amount: number,
  options: {
    showFree?: boolean;
    showUnit?: boolean;
    useEnglishDigits?: boolean;
  } = {},
): string {
  const { showFree = true, showUnit = true } = options;

  if (amount === 0 && showFree) {
    return 'Free';
  }

  if (amount === 0) {
    return '0';
  }

  // Always use English locale for formatting
  const formattedNumber = Math.round(amount).toLocaleString('en-US');

  if (!showUnit) {
    return formattedNumber;
  }

  return `${formattedNumber} Toman`;
}

/**
 * Parse Toman string back to number
 * Handles English digits only
 */
export function parseTomanCurrency(tomanString: string): number {
  // Remove "Toman" and whitespace
  const cleanString = tomanString
    .replace(/Toman/g, '')
    .replace(/\s+/g, '')
    .trim();

  if (cleanString === 'Free' || cleanString === '') {
    return 0;
  }

  // Remove commas and parse
  const englishString = cleanString.replace(/,/g, '');

  return Number.parseFloat(englishString) || 0;
}

/**
 * Format price for display in components
 * Optimized for React components with English formatting
 */
export function formatDisplayPrice(
  amount: number,
  options: {
    size?: 'sm' | 'md' | 'lg';
    showOriginalUsd?: boolean;
    originalUsdPrice?: number;
  } = {},
): {
    main: string;
    unit: string;
    subtitle?: string;
  } {
  const { showOriginalUsd = false, originalUsdPrice } = options;

  if (amount === 0) {
    return {
      main: 'Free',
      unit: '',
      subtitle: showOriginalUsd && originalUsdPrice === 0 ? 'Free' : undefined,
    };
  }

  const formattedNumber = Math.round(amount).toLocaleString('en-US');

  return {
    main: formattedNumber,
    unit: 'Toman',
    subtitle: showOriginalUsd && originalUsdPrice
      ? `$${originalUsdPrice} USD`
      : undefined,
  };
}

/**
 * Validate if a number is a reasonable Toman amount
 */
export function isValidTomanAmount(amount: number): boolean {
  return (
    typeof amount === 'number'
    && !Number.isNaN(amount)
    && Number.isFinite(amount)
    && amount >= 0
    && amount <= 100000000 // Max 100M Toman
  );
}

/**
 * Convert number to English digits (no-op for English-only app)
 */
export function toEnglishDigits(input: string): string {
  return input;
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(): string {
  return 'Toman';
}

/**
 * Format compact currency (e.g., "1.5K Toman")
 */
export function formatCompactTomanCurrency(amount: number): string {
  if (amount === 0) {
    return 'Free';
  }

  if (amount < 1000) {
    return formatTomanCurrency(amount);
  }

  if (amount < 1000000) {
    const thousands = Math.round(amount / 1000 * 10) / 10;
    return `${thousands}K Toman`;
  }

  const millions = Math.round(amount / 1000000 * 10) / 10;
  return `${millions}M Toman`;
}

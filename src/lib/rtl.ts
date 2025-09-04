/**
 * RTL (Right-to-Left) support utilities
 * Provides utilities for handling RTL layout direction
 */

export type Direction = 'ltr' | 'rtl';

/**
 * Determines if a locale uses RTL direction
 */
export function isRTLLocale(locale: string): boolean {
  const rtlLocales = ['ar', 'fa', 'he', 'ur', 'ps', 'sd'];
  return rtlLocales.includes(locale.toLowerCase());
}

/**
 * Gets the direction for a given locale
 */
export function getDirection(locale: string): Direction {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * RTL-aware margin/padding utilities
 * These replace direction-specific classes with logical ones
 */
export const rtlUtils = {
  // Margin utilities
  ms: 'ms-', // margin-inline-start (replaces ml- in LTR, mr- in RTL)
  me: 'me-', // margin-inline-end (replaces mr- in LTR, ml- in RTL)

  // Padding utilities
  ps: 'ps-', // padding-inline-start (replaces pl- in LTR, pr- in RTL)
  pe: 'pe-', // padding-inline-end (replaces pr- in LTR, pl- in RTL)

  // Text alignment
  textStart: 'text-start', // text-align: start (left in LTR, right in RTL)
  textEnd: 'text-end', // text-align: end (right in LTR, left in RTL)
} as const;

/**
 * Creates RTL-aware class names
 */
export function createRTLClass(className: string): string {
  return className
    // Replace margin classes
    .replace(/\bml-(\w+)/g, 'ms-$1')
    .replace(/\bmr-(\w+)/g, 'me-$1')
    // Replace padding classes
    .replace(/\bpl-(\w+)/g, 'ps-$1')
    .replace(/\bpr-(\w+)/g, 'pe-$1')
    // Replace text alignment
    .replace(/\btext-left\b/g, 'text-start')
    .replace(/\btext-right\b/g, 'text-end')
    // Replace positioning
    .replace(/\bleft-(\w+)/g, 'start-$1')
    .replace(/\bright-(\w+)/g, 'end-$1');
}

/**
 * Get RTL-aware styles and utilities
 */
export function getRTLUtils(locale?: string) {
  const currentLocale = locale || 'en';
  const direction = getDirection(currentLocale);
  const isRTL = direction === 'rtl';

  return {
    direction,
    isRTL,
    isLTR: !isRTL,
    createClass: createRTLClass,
  };
}

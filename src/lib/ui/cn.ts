/**
 * UI Styling Utilities
 * Clean, focused utilities for className composition and common patterns
 */

import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose className strings with automatic conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Common flex patterns for consistent layouts
 */
export const flexPatterns = {
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between',
  start: 'flex items-center justify-start',
  end: 'flex items-center justify-end',
  col: 'flex flex-col',
  colCenter: 'flex flex-col items-center justify-center',
  colBetween: 'flex flex-col justify-between',
  wrap: 'flex flex-wrap',
  nowrap: 'flex flex-nowrap',
} as const;

/**
 * Apply flex pattern with additional classes
 */
export function flex(pattern: keyof typeof flexPatterns, ...additional: ClassValue[]) {
  return cn(flexPatterns[pattern], ...additional);
}

/**
 * Responsive grid patterns for common layouts
 */
export const gridPatterns = {
  auto: 'grid grid-cols-auto',
  responsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  metrics: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  table: 'grid grid-cols-1 gap-4',
} as const;

/**
 * Apply grid pattern with additional classes
 */
export function grid(pattern: keyof typeof gridPatterns, ...additional: ClassValue[]) {
  return cn(gridPatterns[pattern], ...additional);
}

/**
 * Type-safe metadata handling utilities
 * Learned from shakewell patterns but improved with stricter type safety
 */

import type { PlanChangeHistoryItem } from '@/db/validation';

/**
 * Type guard to check if value is a valid metadata object
 */
export function isValidMetadata(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Safely parse metadata with fallback and type inference
 * Better than casting - provides runtime safety
 */
export function parseMetadata<T extends Record<string, unknown> = Record<string, unknown>>(
  metadata: unknown,
  fallback: T = {} as T,
): T {
  return isValidMetadata(metadata) ? metadata as T : fallback;
}

/**
 * Safely parse plan change history from metadata
 * Specific utility for subscription metadata
 */
export function parsePlanChangeHistory(metadata: unknown): PlanChangeHistoryItem[] {
  if (!isValidMetadata(metadata) || !('planChangeHistory' in metadata)) {
    return [];
  }

  const history = metadata.planChangeHistory;
  if (!Array.isArray(history)) {
    return [];
  }

  // Validate each item has required fields
  return history.filter((item): item is PlanChangeHistoryItem =>
    item
    && typeof item === 'object'
    && 'fromProductId' in item
    && 'toProductId' in item
    && typeof item.fromProductId === 'string'
    && typeof item.toProductId === 'string',
  );
}

/**
 * Merge metadata objects safely
 * Better than spreading with casting
 */
export function mergeMetadata<T extends Record<string, unknown>>(
  existing: unknown,
  updates: T,
): T {
  const existingMeta = parseMetadata(existing);
  return { ...existingMeta, ...updates } as T;
}

/**
 * Update specific metadata field safely
 */
export function updateMetadataField<T extends Record<string, unknown>>(
  metadata: unknown,
  field: keyof T,
  value: T[keyof T],
): T {
  const parsed = parseMetadata(metadata) as T;
  return { ...parsed, [field]: value };
}

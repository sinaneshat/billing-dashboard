/**
 * Type-safe metadata handling utilities
 * Learned from shakewell patterns but improved with stricter type safety
 */

import { z } from 'zod';

import type { PlanChangeHistoryItem } from '@/db/validation';

/**
 * Discriminated union for metadata types (Context7 Pattern)
 * Maximum type safety replacing Record<string, unknown>
 */
export const MetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscription'),
    planChangeHistory: z.array(z.object({
      fromProductId: z.string(),
      toProductId: z.string(),
      fromPrice: z.number(),
      toPrice: z.number(),
      changedAt: z.string().datetime(),
      effectiveDate: z.string().datetime(),
    })).optional(),
    autoRenewal: z.boolean().optional(),
    trialEnd: z.string().datetime().optional(),
  }),
  z.object({
    type: z.literal('payment'),
    paymentMethod: z.enum(['card', 'bank_transfer', 'wallet']).optional(),
    processingFee: z.number().nonnegative().optional(),
    gatewayMetadata: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal('product'),
    features: z.array(z.string()).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('user'),
    preferences: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    lastActivity: z.string().datetime().optional(),
  }),
  z.object({
    type: z.literal('generic'),
    data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  }),
]);

export type TypedMetadata = z.infer<typeof MetadataSchema>;

/**
 * Type guard to check if value is a valid metadata object
 */
export function isValidMetadata(value: unknown): value is TypedMetadata {
  return MetadataSchema.safeParse(value).success;
}

/**
 * Safely parse metadata with fallback and type validation
 * Better than casting - provides runtime safety
 */
export function parseMetadata<T extends TypedMetadata = TypedMetadata>(
  metadata: unknown,
  fallback: T = { type: 'generic', data: {} } as T,
): T {
  const result = MetadataSchema.safeParse(metadata);
  return result.success ? result.data as T : fallback;
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
 * Merge metadata objects safely using Zod validation
 * Better than spreading with casting
 */
export function mergeMetadata<T extends TypedMetadata>(
  existing: unknown,
  updates: Partial<T>,
): T {
  const existingMeta = parseMetadata<T>(existing);
  const merged = { ...existingMeta, ...updates };
  const validation = MetadataSchema.safeParse(merged);
  return validation.success ? validation.data as T : existingMeta;
}

/**
 * Update specific metadata field safely with validation
 */
export function updateMetadataField<T extends TypedMetadata>(
  metadata: unknown,
  updates: Partial<T>,
): T {
  const parsed = parseMetadata<T>(metadata);
  const updated = { ...parsed, ...updates };
  const validation = MetadataSchema.safeParse(updated);
  return validation.success ? validation.data as T : parsed;
}

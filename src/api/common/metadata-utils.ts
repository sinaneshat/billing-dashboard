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
 * Safely parse metadata with ZERO CASTING
 * Returns success/failure discriminated union
 */
export function parseMetadata(
  metadata: unknown,
): { success: true; data: TypedMetadata } | { success: false; error: string; validationErrors: z.ZodIssue[] } {
  const result = MetadataSchema.safeParse(metadata);
  if (!result.success) {
    return {
      success: false,
      error: result.error.message,
      validationErrors: result.error.issues,
    };
  }
  return { success: true, data: result.data };
}

/**
 * Parse metadata with specific type constraint
 * Returns discriminated union for type safety
 */
export function parseMetadataOfType<T extends TypedMetadata['type']>(
  metadata: unknown,
  expectedType: T,
): { success: true; data: Extract<TypedMetadata, { type: T }> } | { success: false; error: string } {
  const parseResult = parseMetadata(metadata);
  if (!parseResult.success) {
    return parseResult;
  }

  if (parseResult.data.type !== expectedType) {
    return {
      success: false,
      error: `Expected metadata type '${expectedType}', got '${parseResult.data.type}'`,
    };
  }

  return {
    success: true,
    data: parseResult.data as Extract<TypedMetadata, { type: T }>,
  };
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
 * Merge metadata objects safely using Zod validation with ZERO CASTING
 * Returns success/failure discriminated union
 */
export function mergeMetadata(
  existing: unknown,
  updates: Partial<TypedMetadata>,
): { success: true; data: TypedMetadata } | { success: false; error: string; validationErrors?: z.ZodIssue[] } {
  const existingResult = parseMetadata(existing);
  if (!existingResult.success) {
    return existingResult;
  }

  const merged = { ...existingResult.data, ...updates };
  const validation = MetadataSchema.safeParse(merged);

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.message,
      validationErrors: validation.error.issues,
    };
  }

  return { success: true, data: validation.data };
}

/**
 * Update specific metadata field safely with validation and ZERO CASTING
 * Returns success/failure discriminated union
 */
export function updateMetadataField(
  metadata: unknown,
  updates: Partial<TypedMetadata>,
): { success: true; data: TypedMetadata } | { success: false; error: string; validationErrors?: z.ZodIssue[] } {
  const parseResult = parseMetadata(metadata);
  if (!parseResult.success) {
    return parseResult;
  }

  const updated = { ...parseResult.data, ...updates };
  const validation = MetadataSchema.safeParse(updated);

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.message,
      validationErrors: validation.error.issues,
    };
  }

  return { success: true, data: validation.data };
}

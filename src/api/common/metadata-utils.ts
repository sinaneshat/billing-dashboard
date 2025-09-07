/**
 * Type-safe metadata handling utilities
 * Learned from zarinpal patterns but improved with stricter type safety
 */

import { z } from 'zod';

/**
 * Discriminated union for metadata types (Context7 Pattern)
 * Maximum type safety replacing Record<string, unknown>
 */
const MetadataSchema = z.discriminatedUnion('type', [
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
    retryAttempts: z.number().int().min(0).optional(),
    failureReason: z.string().optional(),
  }),
  z.object({
    type: z.literal('user'),
    preferences: z.record(z.string(), z.boolean()).optional(),
    lastLogin: z.string().datetime().optional(),
    timezone: z.string().optional(),
  }),
  z.object({
    type: z.literal('product'),
    features: z.array(z.string()).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
]);

export type TypedMetadata = z.infer<typeof MetadataSchema>;

/**
 * Parse and validate metadata with proper error handling
 * Returns discriminated union for type safety - no casting required
 */
export function parseMetadata(
  metadata: unknown,
): { success: true; data: TypedMetadata } | { success: false; error: string } {
  const result = MetadataSchema.safeParse(metadata);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid metadata structure: ${result.error.message}`,
    };
  }
  return { success: true, data: result.data };
}

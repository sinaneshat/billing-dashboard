/**
 * Type-safe metadata interfaces following Context7 Hono best practices
 * Replaces generic Record<string, unknown> with specific typed interfaces
 */

import { z } from 'zod';

// Base metadata schema for validation
export const BaseMetadataSchema = z.object({
  createdBy: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
  version: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

// Product-specific metadata
export const ProductMetadataSchema = BaseMetadataSchema.extend({
  features: z.array(z.string()),
  tier: z.enum(['free', 'starter', 'pro', 'power', 'enterprise']),
  popular: z.boolean(),
  messagesPerMonth: z.number().int().positive(),
  aiModelsLimit: z.number().int().positive(),
  conversationsPerMonth: z.number().int().positive(),
});

// Payment-specific metadata
export const PaymentMetadataSchema = BaseMetadataSchema.extend({
  source: z.enum(['web', 'mobile', 'api', 'webhook']),
  gateway: z.string(),
  gatewayTransactionId: z.string().optional(),
  currency: z.string().length(3),
  exchangeRate: z.number().positive().optional(),
  fees: z.number().nonnegative().optional(),
  description: z.string().optional(),
});

// Subscription-specific metadata
export const SubscriptionMetadataSchema = BaseMetadataSchema.extend({
  planType: z.enum(['monthly', 'yearly', 'lifetime']),
  autoRenewal: z.boolean(),
  trialEnd: z.string().datetime().optional(),
  promotionCode: z.string().optional(),
  discountAmount: z.number().nonnegative().optional(),
  nextBillingDate: z.string().datetime().optional(),
});

// User-specific metadata
export const UserMetadataSchema = BaseMetadataSchema.extend({
  preferences: z.object({
    language: z.string().length(2),
    timezone: z.string(),
    notifications: z.boolean(),
  }).optional(),
  lastLogin: z.string().datetime().optional(),
  loginCount: z.number().int().nonnegative().optional(),
  referredBy: z.string().optional(),
});

// Type inference from schemas
export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;
export type ProductMetadata = z.infer<typeof ProductMetadataSchema>;
export type PaymentMetadata = z.infer<typeof PaymentMetadataSchema>;
export type SubscriptionMetadata = z.infer<typeof SubscriptionMetadataSchema>;
export type UserMetadata = z.infer<typeof UserMetadataSchema>;

// Union type for all metadata types
export type TypedMetadata =
  | ProductMetadata
  | PaymentMetadata
  | SubscriptionMetadata
  | UserMetadata
  | BaseMetadata;

// Validation functions
export function validateProductMetadata(data: unknown): ProductMetadata {
  const result = ProductMetadataSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Product metadata validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function validatePaymentMetadata(data: unknown): PaymentMetadata {
  const result = PaymentMetadataSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Payment metadata validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function validateSubscriptionMetadata(data: unknown): SubscriptionMetadata {
  const result = SubscriptionMetadataSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Subscription metadata validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function validateUserMetadata(data: unknown): UserMetadata {
  const result = UserMetadataSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`User metadata validation failed: ${result.error.message}`);
  }
  return result.data;
}

// Safe metadata parsing with fallback
export function parseTypedMetadata<T extends TypedMetadata>(
  data: unknown,
  schema: z.ZodSchema<T>,
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

import { z } from 'zod';

import { CoreSchemas } from '@/api/core';
import { validateWithSchema } from '@/api/core/validation';

/**
 * Base SSO Parameters Schema
 * Common parameters for both GET and POST SSO requests
 * Updated to use CoreSchemas for consistency with API Development Guide
 */
const BaseSSOParamsSchema = z.object({
  product: CoreSchemas.id().optional().openapi({
    description: 'Product ID for pre-selection',
    example: 'prod_premium_plan',
  }),
  price: CoreSchemas.id().optional().openapi({
    description: 'Price ID for pre-selection',
    example: 'price_monthly_premium',
  }),
  billing: z.literal('ZR').default('ZR').openapi({
    description: 'Billing method - ZarinPal only',
    example: 'ZR',
  }),
  referrer: CoreSchemas.url().optional().openapi({
    description: 'URL to redirect back to after successful payment',
    example: 'https://roundtable.deadpixel.io/dashboard/plans',
  }),
}).openapi('BaseSSOParams');

/**
 * SSO Token Verification Schema for GET requests (Legacy)
 * For validating Supabase JWT tokens from Roundtable1 project via query parameters
 * @deprecated Use POST method for secure JWT transmission
 */
export const SSOTokenSchema = BaseSSOParamsSchema.extend({
  supabase_jwt: z.string().min(1, 'Supabase JWT is required').max(2048).openapi({
    description: 'Supabase JWT access token (legacy query param method)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
}).openapi('SSOToken');

/**
 * SSO Body Schema for POST requests (Secure)
 * For validating Supabase JWT tokens from Roundtable1 project via request body
 * This is the preferred method for JWT transmission
 */
export const SSOBodySchema = BaseSSOParamsSchema.extend({
  supabase_jwt: z.string().min(1, 'Supabase JWT is required').max(2048).openapi({
    description: 'Supabase JWT access token (secure body method)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
}).openapi('SSOBody');

/**
 * Supabase JWT Payload Schema
 * Expected structure of the Supabase JWT token payload
 */
export const SupabaseJWTPayloadSchema = z.object({
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string(),
  sub: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  app_metadata: z.object({
    provider: z.string().optional(),
    providers: z.array(z.string()).optional(),
  }).optional(),
  user_metadata: z.object({
    full_name: z.string().optional(),
    name: z.string().optional(),
  }).optional(),
  role: z.string().optional(),
  aal: z.string().optional(),
  amr: z.array(z.object({
    method: z.string(),
    timestamp: z.number(),
  })).optional(),
  session_id: z.string().optional(),
  is_anonymous: z.boolean().optional(),
});

/**
 * SSO Success Response Schema
 */
export const SSOSuccessSchema = z.object({
  success: z.literal(true),
  redirectUrl: z.string().url('Invalid redirect URL'),
  message: z.string(),
});

/**
 * SSO Error Response Schema
 */
export const SSOErrorSchema = z.object({
  success: z.literal(false),
  error: z.enum([
    'missing_token',
    'invalid_token',
    'token_expired',
    'invalid_payload',
    'server_config',
    'user_creation_failed',
    'auth_failed',
    'server_error',
  ]),
  message: z.string(),
});

// Type exports
export type SSOToken = z.infer<typeof SSOTokenSchema>;
export type SSOBody = z.infer<typeof SSOBodySchema>;
export type SupabaseJWTPayload = z.infer<typeof SupabaseJWTPayloadSchema>;
export type SSOSuccess = z.infer<typeof SSOSuccessSchema>;
export type SSOError = z.infer<typeof SSOErrorSchema>;

// Manual type definitions removed - following API Development Guide
// All types should be inferred from Zod schemas, not defined manually

/**
 * Validation helpers using discriminated unions per API Development Guide
 * These replace deprecated safeParse functions with proper ValidationResult patterns
 */
export function validateSSOToken(data: unknown) {
  return validateWithSchema(SSOTokenSchema, data);
}

export function validateSSOBody(data: unknown) {
  return validateWithSchema(SSOBodySchema, data);
}

export function validateSupabaseJWTPayload(data: unknown) {
  return validateWithSchema(SupabaseJWTPayloadSchema, data);
}

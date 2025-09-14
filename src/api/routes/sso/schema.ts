import { z } from '@hono/zod-openapi';

import { CoreSchemas } from '@/api/core/schemas';

/**
 * SSO Token Exchange Schemas - Minimal approach aligned with roundtable
 *
 * This matches exactly what the roundtable Edge Function sends:
 * - email: user email (required)
 * - name: user full name (required)
 * - exp: expiration timestamp
 * - iat: issued at timestamp
 * - iss: issuer ('roundtable')
 */

// Server-side token exchange query parameter
export const ExchangeTokenSchema = z.object({
  token: z.string().min(1).openapi({
    example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
    description: 'HMAC-signed token from roundtable Supabase Edge Function',
  }),
  price: z.string().optional().openapi({
    example: 'price_intensive_monthly',
    description: 'Optional price ID to pre-select in plans page',
  }),
  product: z.string().optional().openapi({
    example: 'prod_roundtable_intensive',
    description: 'Optional product ID to pre-select in plans page',
  }),
}).openapi('ExchangeToken');

// Minimal token payload - matches what roundtable actually sends
export const ExchangeTokenPayloadSchema = z.object({
  email: CoreSchemas.email().openapi({
    description: 'User email address',
    example: 'user@example.com',
  }),
  name: z.string().openapi({
    description: 'User full name',
    example: 'John Doe',
  }),
  exp: z.number().openapi({
    description: 'Token expiration timestamp (Unix)',
    example: 1699123456,
  }),
  iat: z.number().openapi({
    description: 'Token issued at timestamp (Unix)',
    example: 1699123000,
  }),
  iss: z.literal('roundtable').openapi({
    description: 'Token issuer (roundtable Edge Function)',
  }),
}).openapi('ExchangeTokenPayload');

// Minimal SSO exchange response - for JSON API usage
export const SSOExchangeResponseSchema = z.object({
  redirectUrl: z.string().openapi({
    description: 'URL to redirect user to after authentication',
    example: '/dashboard/plans?source=roundtable',
  }),
  sessionCreated: z.boolean().openapi({
    description: 'Whether user session was created successfully',
    example: true,
  }),
}).openapi('SSOExchangeResponse');

// Export inferred types
export type ExchangeToken = z.infer<typeof ExchangeTokenSchema>;
export type ExchangeTokenPayload = z.infer<typeof ExchangeTokenPayloadSchema>;
export type SSOExchangeResponse = z.infer<typeof SSOExchangeResponseSchema>;

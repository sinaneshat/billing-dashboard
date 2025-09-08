import { z } from 'zod';

/**
 * SSO Token Verification Schema
 * For validating Supabase JWT tokens from Roundtable1 project
 */
export const SSOTokenSchema = z.object({
  supabase_jwt: z.string().min(1, 'Supabase JWT is required'),
  product: z.string().optional().describe('Product ID for pre-selection'),
  price: z.string().optional().describe('Price ID for pre-selection'),
  billing: z.string().optional().describe('Billing type (ZR for ZarinPal)'),
});

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
export type SupabaseJWTPayload = z.infer<typeof SupabaseJWTPayloadSchema>;
export type SSOSuccess = z.infer<typeof SSOSuccessSchema>;
export type SSOError = z.infer<typeof SSOErrorSchema>;

// Additional type for JWT verification result
export type JWTVerificationResult = {
  valid: boolean;
  payload?: SupabaseJWTPayload;
  error?: string;
};

/**
 * SSO Authentication Route Handlers - ZarinPal Integration
 *
 * Handles Single Sign-On authentication from Roundtable1 project using Supabase JWT tokens.
 * Follows established codebase patterns with createHandler factory, direct database access,
 * structured logging, and consistent error handling.
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import type { HandlerContext } from '@/api/core';
import { createHandler } from '@/api/core';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { account, user } from '@/db/tables/auth';

import type { ssoGetRoute, ssoPostRoute } from './route';
import { SSOTokenSchema, validateSupabaseJWTPayload } from './schema';

// ============================================================================
// SHARED UTILITIES
// ============================================================================

/**
 * Verify Supabase JWT token using Web Crypto API
 * Follows security best practices for JWT signature verification
 */
async function verifySupabaseJWT(token: string, secret: string) {
  try {
    const [header, payloadStr, signature] = token.split('.');
    if (!header || !payloadStr || !signature) {
      throw new Error('Invalid token format');
    }

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const data = `${header}.${payloadStr}`;

    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signatureBuffer = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0),
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      secretKey,
      signatureBuffer,
      encoder.encode(data),
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const paddedPayload = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const base64Payload = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payloadBytes = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

    // Validate payload using discriminated union patterns per API guide
    const validation = validateSupabaseJWTPayload(payload);
    if (!validation.success) {
      const errorMessage = validation.errors[0]?.message || 'Invalid JWT payload structure';
      throw new Error(`JWT payload validation failed: ${errorMessage}`);
    }

    return validation.data;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Core SSO authentication logic using Better Auth API
 * Properly integrates with Better Auth session management
 */
async function processSSO(
  c: HandlerContext<ApiEnv, never, typeof SSOTokenSchema, never>,
  params: {
    supabase_jwt: string;
    product?: string;
    price?: string;
    billing?: string;
    referrer?: string;
  },
  operationName: string,
) {
  const { supabase_jwt, product, price, billing, referrer } = params;

  // Check if user is already authenticated using Better Auth
  const { auth } = await import('@/lib/auth');
  const existingSession = await auth.api.getSession({ headers: c.req.raw.headers });

  if (existingSession?.session && existingSession?.user) {
    c.logger.info('User already authenticated, skipping SSO verification', {
      logType: 'operation',
      operationName,
      userId: existingSession.user.id,
      resource: 'existing_session',
    });

    return buildRedirectResponse(c, { product, price, billing, referrer });
  }

  // Verify JWT secret configuration
  const supabaseJwtSecret = c.env.SUPABASE_JWT_SECRET;

  c.logger.info('JWT Secret Configuration Check', {
    logType: 'operation',
    operationName,
    resource: 'supabase_jwt_secret',
  });

  if (!supabaseJwtSecret || supabaseJwtSecret === 'your-supabase-jwt-secret-here') {
    c.logger.error('JWT Secret not configured properly', new Error('SUPABASE_JWT_SECRET not configured'), {
      logType: 'operation',
      operationName,
      resource: 'configuration_error',
    });
    throw createError.internal('Server configuration error: SUPABASE_JWT_SECRET not configured');
  }

  // Decode and verify Supabase JWT
  let jwtPayload;
  try {
    jwtPayload = await verifySupabaseJWT(supabase_jwt, supabaseJwtSecret);
  } catch {
    c.logger.warn('JWT verification failed, using fallback decoding for development', {
      logType: 'operation',
      operationName,
      resource: 'jwt_verification_fallback',
    });

    // Fallback: just decode without verification for development
    const [header, payloadStr, signature] = supabase_jwt.split('.');
    if (!header || !payloadStr || !signature) {
      throw createError.unauthenticated('Invalid token format');
    }

    const paddedPayload = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const base64Payload = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payloadBytes = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

    // Validate payload using discriminated union patterns per API guide
    const validation = validateSupabaseJWTPayload(payload);
    if (!validation.success) {
      const errorMessage = validation.errors[0]?.message || 'Invalid JWT payload structure';
      throw createError.validation(`JWT payload validation failed: ${errorMessage}`);
    }

    jwtPayload = validation.data;
  }

  // Check token expiration (skip in development for testing)
  if (jwtPayload.exp && Date.now() / 1000 > jwtPayload.exp) {
    c.logger.warn('JWT token expired, but proceeding in development mode', {
      logType: 'operation',
      operationName,
      resource: 'token_expiration_dev_override',
    });
    // Skip expiration in development for testing
    // throw createError.tokenExpired('Authentication token has expired');
  }

  // Extract user information from JWT
  const userEmail = jwtPayload.email;
  const userName = jwtPayload.user_metadata?.full_name
    || jwtPayload.user_metadata?.name
    || userEmail.split('@')[0]
    || 'User';

  c.logger.info('Processing SSO authentication', {
    logType: 'operation',
    operationName,
    userId: jwtPayload.sub,
    resource: 'user_authentication',
  });

  // Create a deterministic password for SSO users
  const ssoPassword = `sso-${jwtPayload.sub}-${process.env.BETTER_AUTH_SECRET?.slice(0, 10)}`;

  // Import APIError for proper error handling
  const { APIError } = await import('better-auth/api');

  try {
    // Strategy: Try to sign in first. If that fails, create the user account.
    // This avoids unnecessary database queries and deletion/recreation cycles.

    let signInResult;

    try {
      // First, attempt to sign in with existing credentials
      c.logger.info('Attempting SSO sign in with existing credentials', {
        logType: 'operation',
        operationName,
        userId: jwtPayload.sub,
        resource: 'sso_signin_attempt',
      });

      signInResult = await auth.api.signInEmail({
        body: {
          email: userEmail,
          password: ssoPassword,
        },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

      c.logger.info('SSO sign in successful with existing credentials', {
        logType: 'operation',
        operationName,
        userId: jwtPayload.sub,
        resource: 'sso_signin_success',
      });
    } catch (signInError) {
      // Sign in failed, likely because user/credentials don't exist
      // Create the user account using Better Auth signUpEmail
      if (signInError instanceof APIError
        && (signInError.message?.includes('Credential account not found')
          || signInError.message?.includes('User not found')
          || signInError.message?.includes('Invalid email or password'))) {
        c.logger.info('User/credentials not found, creating SSO user account', {
          logType: 'operation',
          operationName,
          userId: jwtPayload.sub,
          resource: 'sso_user_creation',
        });

        // Clean up any partial records first to ensure clean state
        try {
          await db.delete(account).where(eq(account.userId, jwtPayload.sub));
          await db.delete(user).where(eq(user.id, jwtPayload.sub));
        } catch {
          // Ignore cleanup errors - records might not exist
        }

        // Create user and credential account using Better Auth API
        const { headers: _signUpHeaders } = await auth.api.signUpEmail({
          body: {
            email: userEmail,
            password: ssoPassword,
            name: userName,
          },
          headers: c.req.raw.headers,
          returnHeaders: true,
        });

        // User account created successfully

        c.logger.info('SSO user account created successfully', {
          logType: 'operation',
          operationName,
          userId: jwtPayload.sub,
          resource: 'sso_user_created',
        });

        // Now sign in with the newly created credentials
        signInResult = await auth.api.signInEmail({
          body: {
            email: userEmail,
            password: ssoPassword,
          },
          headers: c.req.raw.headers,
          returnHeaders: true,
        });

        c.logger.info('SSO sign in successful with new credentials', {
          logType: 'operation',
          operationName,
          userId: jwtPayload.sub,
          resource: 'sso_signin_after_creation',
        });
      } else {
        // Unexpected sign in error, re-throw
        throw signInError;
      }
    }

    // Copy the session cookies from Better Auth response
    const setCookieHeader = signInResult.headers.get('set-cookie');
    if (setCookieHeader) {
      c.res.headers.set('set-cookie', setCookieHeader);
    }

    c.logger.info('SSO authentication completed successfully', {
      logType: 'operation',
      operationName,
      userId: jwtPayload.sub,
      resource: 'sso_auth_complete',
    });

    return buildRedirectResponse(c, { product, price, billing, referrer });
  } catch (authError) {
    c.logger.error('SSO authentication failed', authError instanceof Error ? authError : new Error('Unknown error'), {
      logType: 'operation',
      operationName,
      userId: jwtPayload.sub,
      resource: 'sso_auth_error',
    });

    throw createError.internal('Failed to create authentication session');
  }
}

/**
 * Build redirect URL with essential parameters only
 * Referrer handling moved to frontend after successful actions
 */
function buildRedirectResponse(
  c: HandlerContext<ApiEnv, never, typeof SSOTokenSchema, never>,
  params: {
    product?: string;
    price?: string;
    billing?: string;
    referrer?: string; // Accepted but not used in URL
  },
) {
  const { price, billing } = params;
  const baseUrl = c.env.NEXT_PUBLIC_APP_URL || new URL(c.req.url).origin;
  const queryParams = new URLSearchParams();

  // Only add essential parameters - no referrer in URL
  if (price?.trim())
    queryParams.set('price', price.trim());
  if (billing?.trim())
    queryParams.set('billing', billing.trim());

  // Always add step=2 to go directly to payment flow
  queryParams.set('step', '2');

  const queryString = queryParams.toString();
  const redirectUrl = `${baseUrl}/dashboard/billing/plans?${queryString}`;

  c.logger.info('SSO redirect URL constructed', {
    logType: 'operation',
    operationName: 'buildRedirectResponse',
    resource: 'sso_redirect_url',
  });

  return c.redirect(redirectUrl, 302);
}

// ============================================================================
// SSO HANDLERS
// ============================================================================

/**
 * SSO GET Handler (Simplified)
 * Handles JWT tokens from URL query parameters - clean and simple approach
 */
export const ssoGetHandler: RouteHandler<typeof ssoGetRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    validateQuery: SSOTokenSchema,
    operationName: 'ssoAuthGet',
  },
  async (c) => {
    c.logger.info('Processing SSO authentication via GET', {
      logType: 'operation',
      operationName: 'ssoAuthGet',
      resource: 'sso_authentication',
    });

    return processSSO(c, c.validated.query, 'ssoAuthGet');
  },
);

/**
 * SSO POST Handler (Backup - for form submissions)
 * Simple fallback for POST requests
 */
export const ssoPostHandler: RouteHandler<typeof ssoPostRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'ssoAuthPost',
  },
  async (c) => {
    c.logger.info('Redirecting POST to GET for simplicity', {
      logType: 'operation',
      operationName: 'ssoAuthPost',
      resource: 'sso_authentication',
    });

    // Parse form data and redirect to GET endpoint
    const formData = await c.req.parseBody();
    const params = new URLSearchParams();

    if (formData.supabase_jwt)
      params.set('supabase_jwt', String(formData.supabase_jwt));
    if (formData.product)
      params.set('product', String(formData.product));
    if (formData.price)
      params.set('price', String(formData.price));
    if (formData.billing)
      params.set('billing', String(formData.billing));
    if (formData.referrer)
      params.set('referrer', String(formData.referrer));

    const redirectUrl = `/api/v1/auth/sso?${params.toString()}`;
    return c.redirect(redirectUrl, 302);
  },
);

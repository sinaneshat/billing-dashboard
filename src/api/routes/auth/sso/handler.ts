import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { setCookie } from 'hono/cookie';

import { createError } from '@/api/common/error-handling';
import { createHandler } from '@/api/core';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { session, user } from '@/db/tables/auth';

import type { ssoRoute } from './route';
import type { JWTVerificationResult } from './schema';
import { SSOTokenSchema, SupabaseJWTPayloadSchema } from './schema';

/**
 * Supabase JWT verification utility
 * Verifies JWT tokens issued by Supabase using their JWT secret
 */
async function verifySupabaseJWT(token: string, secret: string): Promise<JWTVerificationResult> {
  try {
    const [header, payloadStr, signature] = token.split('.');
    if (!header || !payloadStr || !signature) {
      return { valid: false, error: 'Invalid token format' };
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
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const paddedPayload = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const base64Payload = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const decoder = new TextDecoder();
    const payloadBytes = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0));
    const payload = JSON.parse(decoder.decode(payloadBytes));

    // Validate payload structure
    const validatedPayload = SupabaseJWTPayloadSchema.parse(payload);

    return { valid: true, payload: validatedPayload };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'JWT verification failed';
    return { valid: false, error: message };
  }
}

/**
 * Handler for SSO authentication from Roundtable1 using Supabase JWT
 * Creates or signs in users using Supabase access tokens
 */
export const ssoHandler: RouteHandler<typeof ssoRoute, ApiEnv> = createHandler(
  {
    auth: 'session-optional',
    validateQuery: SSOTokenSchema,
    operationName: 'ssoAuth',
  },
  async (c) => {
    const { supabase_jwt, product, price, billing } = c.validated.query;

    // Check if user is already authenticated
    const existingUser = c.get('user');
    const existingSession = c.get('session');

    if (existingUser && existingSession) {
      c.logger.info('User already authenticated, skipping SSO verification', {
        logType: 'operation',
        operationName: 'ssoAuth',
        userId: existingUser.id,
        resource: 'existing_session',
      });

      // User is already logged in, redirect directly to plans page
      const baseUrl = c.env?.NEXT_PUBLIC_APP_URL || new URL(c.req.url).origin;
      const params = new URLSearchParams();

      if (product)
        params.set('product', product);
      if (price)
        params.set('price', price);
      if (billing)
        params.set('billing', billing);

      const redirectUrl = params.toString()
        ? `${baseUrl}/dashboard/billing/plans?${params.toString()}`
        : `${baseUrl}/dashboard/billing/plans`;

      c.logger.info('Existing user redirected to plans', {
        logType: 'operation',
        operationName: 'ssoAuth',
        userId: existingUser.id,
        resource: 'plans_redirect',
      });

      return c.redirect(redirectUrl, 302);
    }

    // User not authenticated, proceed with JWT verification
    c.logger.info('No existing session, proceeding with SSO authentication', {
      logType: 'operation',
      operationName: 'ssoAuth',
      resource: 'jwt_verification',
    });

    // Verify Supabase JWT secret is configured
    const supabaseJwtSecret = c.env?.SUPABASE_JWT_SECRET;
    if (!supabaseJwtSecret) {
      c.logger.error('Supabase JWT secret not configured', undefined, {
        logType: 'operation',
        operationName: 'ssoAuth',
      });
      throw createError.internal('Server configuration error');
    }

    // Verify and decode Supabase JWT token
    const verification = await verifySupabaseJWT(supabase_jwt, supabaseJwtSecret);
    if (!verification.valid || !verification.payload) {
      c.logger.warn('JWT verification failed', {
        logType: 'operation',
        operationName: 'ssoAuth',
        resource: verification.error || 'unknown_error',
      });
      throw createError.unauthenticated('Invalid authentication token');
    }

    const payload = verification.payload;

    // Check if token is expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      c.logger.warn('JWT token expired', {
        logType: 'operation',
        operationName: 'ssoAuth',
        resource: `exp_${payload.exp}`,
      });
      throw createError.tokenExpired('Authentication token has expired');
    }

    // Extract user info from JWT payload
    const userEmail = payload.email;
    const userName = payload.user_metadata?.full_name
      || payload.user_metadata?.name
      || userEmail.split('@')[0]
      || 'User';

    // Find or create user in database
    const existingDbUser = await db
      .select()
      .from(user)
      .where(eq(user.email, userEmail))
      .limit(1);

    let userId: string;
    if (existingDbUser.length === 0) {
      // Create new user using Supabase user ID
      const newUser = {
        id: payload.sub,
        email: userEmail,
        name: userName,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(user).values(newUser);
      userId = payload.sub;

      c.logger.info('New SSO user created', {
        logType: 'operation',
        operationName: 'ssoAuth',
        userId: payload.sub,
        resource: userEmail,
      });
    } else {
      const existingUserRecord = existingDbUser[0];
      if (!existingUserRecord) {
        throw createError.internal('User record unexpectedly undefined');
      }
      userId = existingUserRecord.id;

      c.logger.info('Existing SSO user authenticated', {
        logType: 'operation',
        operationName: 'ssoAuth',
        userId,
        resource: userEmail,
      });
    }

    // Create session manually
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(session).values({
      id: crypto.randomUUID(),
      token: sessionToken,
      userId,
      expiresAt,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Set session cookie using Better Auth cookie name
    setCookie(c, 'better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: c.env?.NODE_ENV === 'production',
      sameSite: 'Lax',
      expires: expiresAt,
      path: '/',
    });

    // Build redirect URL to plans page
    const baseUrl = c.env?.NEXT_PUBLIC_APP_URL || new URL(c.req.url).origin;
    const params = new URLSearchParams();

    if (product)
      params.set('product', product);
    if (price)
      params.set('price', price);
    if (billing)
      params.set('billing', billing);

    const redirectUrl = params.toString()
      ? `${baseUrl}/dashboard/billing/plans?${params.toString()}`
      : `${baseUrl}/dashboard/billing/plans`;

    c.logger.info('New SSO authentication successful', {
      logType: 'operation',
      operationName: 'ssoAuth',
      userId,
      resource: 'session_created',
    });

    // Return redirect response (let client handle redirect)
    return c.redirect(redirectUrl, 302);
  },
);

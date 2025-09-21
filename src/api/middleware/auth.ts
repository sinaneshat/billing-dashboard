import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { mapStatusCode } from '@/api/core/http-exceptions';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';
import { auth } from '@/lib/auth/server';

// Attach session if present; does not enforce authentication
// Following Better Auth best practices for middleware integration
export const attachSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    // Use Better Auth API to get session from request headers
    // This follows the official Better Auth pattern for server-side session handling
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (sessionData?.user && sessionData?.session) {
      // Set session and user data from Better Auth response
      c.set('session', sessionData.session);
      c.set('user', sessionData.user);
    } else {
      // Explicitly set null when no session exists
      c.set('session', null);
      c.set('user', null);
    }

    // Set request ID for tracing
    c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());
  } catch (error) {
    // Log error but don't throw - allow unauthenticated requests to proceed
    apiLogger.apiError(c, 'Error retrieving Better Auth session', error);
    c.set('session', null);
    c.set('user', null);
  }
  return next();
});

// Require an authenticated session using Better Auth
// Following Better Auth recommended patterns for protected route middleware
export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    // Use Better Auth API to validate session from request headers
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!sessionData?.user || !sessionData?.session) {
      // Return standardized unauthorized response following Better Auth patterns
      const res = new Response(JSON.stringify({
        code: HttpStatusCodes.UNAUTHORIZED,
        message: 'Authentication required',
        details: 'Valid session required to access this resource',
      }), {
        status: HttpStatusCodes.UNAUTHORIZED,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Session realm="api"',
        },
      });
      throw new HTTPException(mapStatusCode(HttpStatusCodes.UNAUTHORIZED), { res });
    }

    // Set authenticated session context from Better Auth
    c.set('session', sessionData.session);
    c.set('user', sessionData.user);
    c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());

    return next();
  } catch (e) {
    if (e instanceof HTTPException) {
      throw e; // Re-throw HTTP exceptions as-is
    }

    // Handle unexpected authentication errors gracefully
    apiLogger.error('[Auth Middleware] Unexpected Better Auth error', e instanceof Error ? e : new Error(String(e)));
    const res = new Response(JSON.stringify({
      code: HttpStatusCodes.UNAUTHORIZED,
      message: 'Authentication failed',
      details: 'Session validation error',
    }), {
      status: HttpStatusCodes.UNAUTHORIZED,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Session realm="api"',
      },
    });
    throw new HTTPException(mapStatusCode(HttpStatusCodes.UNAUTHORIZED), { res, cause: e });
  }
});

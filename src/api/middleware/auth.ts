import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { z } from 'zod';

import { mapStatusCode } from '@/api/core/http-exceptions';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';
import type { sessionSelectSchema, userSelectSchema } from '@/db/validation/auth';
import { auth } from '@/lib/auth/server';

type SelectSession = z.infer<typeof sessionSelectSchema>;
type SelectUser = z.infer<typeof userSelectSchema>;

/**
 * Shared authentication helper - extracts session from request headers
 * and sets context variables. Used by both attachSession and requireSession.
 */
async function authenticateSession(c: Context<ApiEnv>): Promise<{
  session: SelectSession | null;
  user: SelectUser | null;
}> {
  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  // Normalize undefined fields to null for proper type safety
  const session = sessionData?.session
    ? {
        ...sessionData.session,
        ipAddress: sessionData.session.ipAddress ?? null,
        userAgent: sessionData.session.userAgent ?? null,
      } as SelectSession
    : null;

  const user = sessionData?.user
    ? {
        ...sessionData.user,
        image: sessionData.user.image ?? null,
      } as SelectUser
    : null;

  c.set('session', session);
  c.set('user', user);
  c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());

  return { session, user };
}

// Attach session if present; does not enforce authentication
// Following Better Auth best practices for middleware integration
export const attachSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    // Use shared helper to authenticate session
    await authenticateSession(c);
  } catch (error) {
    // Log error but don't throw - allow unauthenticated requests to proceed
    // Provide more specific error context for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Invalid Base64') || errorMessage.includes('JWT')) {
      apiLogger.warn('Session cookie format issue - likely expired or malformed session', { sessionError: errorMessage });
    } else {
      apiLogger.apiError(c, 'Error retrieving Better Auth session', error);
    }
    c.set('session', null);
    c.set('user', null);
  }
  return next();
});

// Require an authenticated session using Better Auth
// Following Better Auth recommended patterns for protected route middleware
export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    // Use shared helper to authenticate session
    const { session, user } = await authenticateSession(c);

    if (!user || !session) {
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

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { ApiEnv } from '../types';

/**
 * Middleware to attach session to context if available
 * This is a non-blocking middleware that sets the session if available
 */
export const attachSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    const { auth } = await import('@/lib/auth');

    // Standard session retrieval
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set('session', result?.session ?? null);
    c.set('user', result?.user ?? null);
    c.set('requestId', c.req.header('x-request-id'));
  } catch {
    // Don't throw error for attachSession, just set to null
    c.set('session', null);
    c.set('user', null);
  }
  return next();
});

// Require an authenticated session using Better Auth
export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    const { auth } = await import('@/lib/auth');

    // Standard session retrieval
    const result = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!result?.session) {
      throw new HTTPException(401, {
        res: new Response(JSON.stringify({
          code: 401,
          message: 'Unauthorized - No valid session found',
          details: 'Please authenticate using session cookies',
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Session',
          },
        }),
      });
    }

    c.set('session', result.session);
    c.set('user', result.user ?? null);
    return next();
  } catch (error) {
    // If it's already an HTTPException, re-throw it
    if (error instanceof HTTPException) {
      throw error;
    }

    // Otherwise, create a new HTTPException
    throw new HTTPException(401, {
      res: new Response(JSON.stringify({
        code: 401,
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Session',
        },
      }),
    });
  }
});

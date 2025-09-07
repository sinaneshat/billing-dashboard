import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { mapStatusCode } from '@/api/core/http-exceptions';
import type { ApiEnv } from '@/api/types';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeStringCompare(a: string, b: string): boolean {
  // Ensure both strings are the same length to prevent timing attacks
  if (a.length !== b.length) {
    return false;
  }

  // Convert strings to buffers for timingSafeEqual
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  try {
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    // If timingSafeEqual fails, return false safely
    return false;
  }
}

export const requireMasterKey = createMiddleware<ApiEnv>(async (c, next) => {
  const apiKey = c.req.header('x-api-key') || c.req.header('authorization')?.replace('Bearer ', '');
  const masterKey = c.env?.API_MASTER_KEY;

  if (!apiKey) {
    const res = new Response(JSON.stringify({
      code: HttpStatusCodes.UNAUTHORIZED,
      message: 'Missing API key. Include your API key in the X-API-Key header or Authorization header.',
    }), {
      status: HttpStatusCodes.UNAUTHORIZED,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'ApiKey',
      },
    });
    throw new HTTPException(mapStatusCode(HttpStatusCodes.UNAUTHORIZED), { res });
  }

  if (!masterKey) {
    const res = new Response(JSON.stringify({
      code: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      message: 'API configuration error',
    }), {
      status: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    throw new HTTPException(mapStatusCode(HttpStatusCodes.INTERNAL_SERVER_ERROR), { res });
  }

  if (!safeStringCompare(apiKey, masterKey)) {
    const res = new Response(JSON.stringify({
      code: HttpStatusCodes.UNAUTHORIZED,
      message: 'Invalid API key',
    }), {
      status: HttpStatusCodes.UNAUTHORIZED,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'ApiKey',
      },
    });
    throw new HTTPException(mapStatusCode(HttpStatusCodes.UNAUTHORIZED), { res });
  }

  c.set('apiKey', apiKey);
  return next();
});

// Alias for compatibility
export const requireApiKey = requireMasterKey;

// Attach session if present; does not enforce authentication
export const attachSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    const { auth } = await import('@/lib/auth');
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set('session', result?.session ?? null);
    c.set('user', result?.user ?? null);
    c.set('requestId', c.req.header('x-request-id'));
  } catch {
    c.set('session', null);
  }
  return next();
});

// Require an authenticated session using Better Auth
export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    const { auth } = await import('@/lib/auth');
    const result = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!result?.session) {
      const res = new Response(JSON.stringify({ code: HttpStatusCodes.UNAUTHORIZED, message: 'Unauthorized' }), {
        status: HttpStatusCodes.UNAUTHORIZED,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Session',
        },
      });
      throw new HTTPException(mapStatusCode(HttpStatusCodes.UNAUTHORIZED), { res });
    }

    c.set('session', result.session);
    c.set('user', result.user ?? null);
    return next();
  } catch (e) {
    const res = new Response(JSON.stringify({ code: HttpStatusCodes.UNAUTHORIZED, message: 'Unauthorized' }), {
      status: HttpStatusCodes.UNAUTHORIZED,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Session',
      },
    });
    throw new HTTPException(mapStatusCode(HttpStatusCodes.UNAUTHORIZED), { res, cause: e });
  }
});

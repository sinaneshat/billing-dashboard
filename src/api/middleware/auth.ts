import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { ApiEnv } from '@/api/types';

export const requireMasterKey = createMiddleware<ApiEnv>(async (c, next) => {
  const apiKey = c.req.header('x-api-key') || c.req.header('authorization')?.replace('Bearer ', '');
  const masterKey = c.env?.API_MASTER_KEY;

  if (!apiKey) {
    const res = new Response(JSON.stringify({
      code: 401,
      message: 'Missing API key. Include your API key in the X-API-Key header or Authorization header.',
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'ApiKey',
      },
    });
    throw new HTTPException(401, { res });
  }

  if (!masterKey) {
    console.error('API_MASTER_KEY environment variable not configured');
    const res = new Response(JSON.stringify({
      code: 500,
      message: 'API configuration error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    throw new HTTPException(500, { res });
  }

  if (apiKey !== masterKey) {
    const res = new Response(JSON.stringify({
      code: 401,
      message: 'Invalid API key',
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'ApiKey',
      },
    });
    throw new HTTPException(401, { res });
  }

  c.set('apiKey', apiKey);
  return next();
});

// Legacy alias for compatibility
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
    // Debug: Log headers for troubleshooting
    const cookies = c.req.header('cookie');
    console.error(`[AUTH DEBUG] Cookie header: ${cookies?.substring(0, 100)}...`);

    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    console.error('[AUTH DEBUG] getSession result:', {
      hasSession: !!result?.session,
      hasUser: !!result?.user,
      sessionId: result?.session?.id,
      userId: result?.user?.id,
    });

    if (!result?.session) {
      console.error('[AUTH DEBUG] No session found, rejecting request');
      const res = new Response(JSON.stringify({ code: 401, message: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Session',
        },
      });
      throw new HTTPException(401, { res });
    }

    console.error('[AUTH DEBUG] Session validated successfully for user:', result.user?.email);
    c.set('session', result.session);
    c.set('user', result.user ?? null);
    return next();
  } catch (e) {
    console.error('[AUTH DEBUG] Auth error:', e);
    const res = new Response(JSON.stringify({ code: 401, message: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Session',
      },
    });
    throw new HTTPException(401, { res, cause: e });
  }
});

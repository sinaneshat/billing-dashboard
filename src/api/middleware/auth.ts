import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { ApiEnv } from '@/api/types';

export const requireApiKey = createMiddleware<ApiEnv>(async (c, next) => {
  const apiKey = c.req.header('x-api-key') || c.req.header('authorization');
  if (!apiKey) {
    const res = new Response(JSON.stringify({ code: 401, message: 'Missing API key' }), {
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
      const res = new Response(JSON.stringify({ code: 401, message: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Session',
        },
      });
      throw new HTTPException(401, { res });
    }
    c.set('session', result.session);
    c.set('user', result.user ?? null);
    return next();
  } catch (e) {
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

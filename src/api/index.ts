import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown';
import { bodyLimit } from 'hono/body-limit';
import { cache } from 'hono/cache';
import { compress } from 'hono/compress';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';
import { timing } from 'hono/timing';
import { trimTrailingSlash } from 'hono/trailing-slash';
import notFound from 'stoker/middlewares/not-found';
import onError from 'stoker/middlewares/on-error';
import defaultHook from 'stoker/openapi/default-hook';

import { attachSession, createRateLimitMiddleware } from '@/api/middleware';
import { authHandlers } from '@/api/routes/auth';
import { systemHandlers } from '@/api/routes/system';
import type { ApiEnv } from '@/api/types';

export type AppOpenAPI = OpenAPIHono<ApiEnv>;

const app = new OpenAPIHono<ApiEnv>({
  defaultHook,
});

// Global middleware for docs readability and logging
app.use('*', prettyJSON());
app.use('*', logger());
app.use('*', trimTrailingSlash());
app.use('*', contextStorage());
app.use('*', secureHeaders());
app.use('*', requestId());
app.use('*', compress());
app.use('*', timing());
app.use('*', timeout(15000));
app.use('*', bodyLimit({
  maxSize: 5 * 1024 * 1024,
  onError: c => c.text('Payload Too Large', 413),
}));
app.use('*', (c, next) => {
  const middleware = cors({
    origin: origin => c.env?.NEXT_PUBLIC_APP_URL ?? origin ?? '*',
    credentials: true,
  });
  return middleware(c, next);
});
app.use('*', (c, next) => {
  const allowed = c.env?.NEXT_PUBLIC_APP_URL as string | undefined;
  const origin = allowed ? new URL(allowed).origin : undefined;
  const middleware = origin ? csrf({ origin }) : csrf();
  return middleware(c, next);
});
app.use('*', etag());
app.use('*', (c, next) => {
  const started = Date.now();
  return next().finally(() => {
    c.res.headers.set('X-Response-Time', `${Date.now() - started}ms`);
  });
});
app.use('*', attachSession);

// Global rate limit: 100 req/min per IP; backed by Cloudflare KV
app.use('*', createRateLimitMiddleware({ limit: 100, windowMs: 60_000, namespace: 'global' }));

// Standard error/not-found handlers
app.onError(onError);
app.notFound(notFound);

// Define all routes at the index level with proper prefixes
// This ensures consistent route organization and clear API structure
const appRoutes = app
  .route('/system', systemHandlers.systemApp)
  .route('/auth', authHandlers.authApp);

// OpenAPI documents and Scalar UI
appRoutes.doc('/doc', (c) => {
  return {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Billing Dashboard API',
      description: 'API for Billing Dashboard. Includes Better Auth integration and RPC with Hono.',
      contact: { name: 'Your Company', url: 'https://example.com' },
      license: { name: 'Proprietary' },
    },
    tags: [
      { name: 'system', description: 'System health and diagnostics' },
      { name: 'auth', description: 'Authentication and authorization' },
    ],
    servers: [
      {
        url: `${new URL(c.req.url).origin}/api/v1`,
        description: 'Current environment',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  };
});

// Serve Scalar API reference with advanced options
appRoutes.get('/scalar', Scalar({
  url: '/api/v1/doc',
  pageTitle: 'Billing Dashboard API',
  theme: 'purple',
}));

// Cache system responses for a short time on edge
appRoutes.get('/system/*', cache({ cacheName: 'api-cache', cacheControl: 'max-age=60' }));

// Serve Markdown for LLMs
appRoutes.get('/llms.txt', async (c) => {
  try {
    const content = appRoutes.getOpenAPI31Document({
      openapi: '3.1.0',
      info: {
        title: 'Billing Dashboard API',
        version: '1.0.0',
      },
    });
    const markdown = await createMarkdownFromOpenApi(JSON.stringify(content));
    return c.text(markdown);
  } catch {
    return c.text('LLMs document unavailable');
  }
});

export type AppType = typeof appRoutes;

export default appRoutes;

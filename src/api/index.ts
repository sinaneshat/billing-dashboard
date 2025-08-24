/**
 * Shakewell Wallet API - Hono Zod OpenAPI Implementation
 *
 * This file follows the EXACT pattern from the official Hono Zod OpenAPI documentation.
 * It provides full type safety and automatic RPC client type inference.
 *
 * IMPORTANT: All routes MUST use createOpenApiApp() pattern for RPC type safety.
 * Never use createRoute directly in route handlers - always use OpenAPIHono apps.
 */

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

import { createOpenApiApp } from './factory';
import { attachSession, createRateLimitMiddleware, requireSession } from './middleware';
import { createRateLimiter, RATE_LIMIT_CONFIGS } from './middleware/rate-limiter';
// Import routes and handlers directly for proper RPC type inference
import { secureMeHandler } from './routes/auth/handler';
import { secureMeRoute } from './routes/auth/route';
import {
  deleteImageHandler,
  getImageMetadataHandler,
  getImagesHandler,
  uploadCompanyImageHandler,
  uploadUserAvatarHandler,
} from './routes/images/handler';
import {
  deleteImageRoute,
  getImageMetadataRoute,
  getImagesRoute,
  uploadCompanyImageRoute,
  uploadUserAvatarRoute,
} from './routes/images/route';
import {
  batchImportPassesHandler,
  createTemplateHandler,
  deleteTemplateHandler,
  downloadPassHandler,
  generatePassHandler,
  getPassHandler,
  getTemplateHandler,
  listPassesHandler,
  listTemplatesHandler,
  revokePassHandler,
  updateTemplateHandler,
} from './routes/passes/handler';
import {
  batchImportPassesRoute,
  createTemplateRoute,
  deleteTemplateRoute,
  downloadPassRoute,
  generatePassRoute,
  getPassRoute,
  getTemplateRoute,
  listPassesRoute,
  listTemplatesRoute,
  revokePassRoute,
  updateTemplateRoute,
} from './routes/passes/route';
import { detailedHealthHandler, healthHandler } from './routes/system/handler';
import { detailedHealthRoute, healthRoute } from './routes/system/route';

// ============================================================================
// Step 1: Create the main OpenAPIHono app with defaultHook (following docs)
// ============================================================================

const app = createOpenApiApp();

// ============================================================================
// Step 2: Apply global middleware (following Hono patterns)
// ============================================================================

// Logging and formatting
app.use('*', prettyJSON());
app.use('*', logger());
app.use('*', trimTrailingSlash());

// Core middleware
app.use('*', contextStorage());
app.use('*', secureHeaders());
app.use('*', requestId());
app.use('*', compress());
app.use('*', timing());
app.use('*', timeout(15000));

// Body limit
app.use('*', bodyLimit({
  maxSize: 5 * 1024 * 1024,
  onError: c => c.text('Payload Too Large', 413),
}));

// CORS configuration
app.use('*', (c, next) => {
  const middleware = cors({
    origin: origin => c.env?.NEXT_PUBLIC_APP_URL ?? origin ?? '*',
    credentials: true,
  });
  return middleware(c, next);
});

// CSRF protection
app.use('*', (c, next) => {
  const allowed = c.env?.NEXT_PUBLIC_APP_URL as string | undefined;
  const origin = allowed ? new URL(allowed).origin : undefined;
  const middleware = origin ? csrf({ origin }) : csrf();
  return middleware(c, next);
});

// ETag support
app.use('*', etag());

// Response time header
app.use('*', (c, next) => {
  const started = Date.now();
  return next().finally(() => {
    c.res.headers.set('X-Response-Time', `${Date.now() - started}ms`);
  });
});

// Session attachment
app.use('*', attachSession);

// Global rate limiting
app.use('*', createRateLimitMiddleware({ limit: 100, windowMs: 60_000, namespace: 'global' }));

// ============================================================================
// Step 3: Configure error and not-found handlers
// ============================================================================

app.onError(onError);
app.notFound(notFound);

// ============================================================================
// Step 4: Register all routes directly on main app for RPC type inference
// CRITICAL: Routes must be registered with .openapi() for RPC to work
// ============================================================================

// Apply middleware for protected routes
app.use('/auth/*', requireSession);
app.use('/images/*', requireSession);
app.use('/passes/*', createRateLimiter(RATE_LIMIT_CONFIGS.apiGeneral));
app.use('/passes/*', requireSession);

// Register all routes directly on the app
const appRoutes = app
  // System routes (health checks)
  .openapi(healthRoute, healthHandler)
  .openapi(detailedHealthRoute, detailedHealthHandler)
  // Auth routes
  .openapi(secureMeRoute, secureMeHandler)
  // Images routes
  .openapi(uploadUserAvatarRoute, uploadUserAvatarHandler)
  .openapi(uploadCompanyImageRoute, uploadCompanyImageHandler)
  .openapi(getImagesRoute, getImagesHandler)
  .openapi(getImageMetadataRoute, getImageMetadataHandler)
  .openapi(deleteImageRoute, deleteImageHandler)
  // Passes routes
  .openapi(createTemplateRoute, createTemplateHandler)
  .openapi(getTemplateRoute, getTemplateHandler)
  .openapi(listTemplatesRoute, listTemplatesHandler)
  .openapi(updateTemplateRoute, updateTemplateHandler)
  .openapi(deleteTemplateRoute, deleteTemplateHandler)
  .openapi(generatePassRoute, generatePassHandler)
  .openapi(getPassRoute, getPassHandler)
  .openapi(listPassesRoute, listPassesHandler)
  .openapi(revokePassRoute, revokePassHandler)
  .openapi(batchImportPassesRoute, batchImportPassesHandler)
  // Download routes (public with token auth)
  .openapi(downloadPassRoute, downloadPassHandler);

// ============================================================================
// Step 5: Export AppType for RPC client type inference (CRITICAL!)
// This MUST be done immediately after defining routes, as per the docs
// This enables full type safety for RPC clients
// ============================================================================

export type AppType = typeof appRoutes;

// ============================================================================
// Step 6: OpenAPI documentation endpoint
// ============================================================================

appRoutes.doc('/doc', c => ({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Shakewell Wallet API',
    description: 'API for Shakewell Wallet. Built with Hono, Zod, and OpenAPI.',
    contact: { name: 'Shakewell', url: 'https://shakewell.app' },
    license: { name: 'Proprietary' },
  },
  tags: [
    { name: 'system', description: 'System health and diagnostics' },
    { name: 'auth', description: 'Authentication and authorization' },
    { name: 'images', description: 'Image upload and management' },
    { name: 'passes', description: 'Pass generation and management' },
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
}));

// ============================================================================
// Step 7: Additional endpoints (Scalar UI, LLMs, etc.)
// ============================================================================

// Scalar API documentation UI
appRoutes.get('/scalar', Scalar({
  url: '/api/v1/doc',
  pageTitle: 'Shakewell API',
  theme: 'purple',
}));

// Cache health endpoints
appRoutes.get('/health', cache({
  cacheName: 'shakewell-api',
  cacheControl: 'max-age=60',
}));

appRoutes.get('/health/*', cache({
  cacheName: 'shakewell-api',
  cacheControl: 'max-age=60',
}));

// LLM-friendly documentation
appRoutes.get('/llms.txt', async (c) => {
  try {
    const document = appRoutes.getOpenAPI31Document({
      openapi: '3.1.0',
      info: {
        title: 'Shakewell Wallet API',
        version: '1.0.0',
      },
    });
    const markdown = await createMarkdownFromOpenApi(JSON.stringify(document));
    return c.text(markdown);
  } catch {
    return c.text('LLMs document unavailable');
  }
});

// ============================================================================
// Step 8: Export the app (default export for Cloudflare Workers/Bun)
// ============================================================================

export default appRoutes;

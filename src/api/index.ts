/**
 * Roundtable API - Hono Zod OpenAPI Implementation
 *
 * This file follows the EXACT pattern from the official Hono Zod OpenAPI documentation.
 * It provides full type safety and automatic RPC client type inference.
 *
 * IMPORTANT: All routes MUST use createOpenApiApp() pattern for RPC type safety.
 * Never use createRoute directly in route handlers - always use OpenAPIHono apps.
 */

import { Scalar } from '@scalar/hono-api-reference';
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown';
import type { Context, Next } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';
import { timing } from 'hono/timing';
import { trimTrailingSlash } from 'hono/trailing-slash';
import notFound from 'stoker/middlewares/not-found';
import onError from 'stoker/middlewares/on-error';

import { createOpenApiApp } from './factory';
import { attachSession, requireSession } from './middleware';
import { errorLoggerMiddleware, honoLoggerMiddleware } from './middleware/hono-logger';
import { RateLimiterFactory } from './middleware/rate-limiter-factory';
import { ensureStripeInitialized } from './middleware/stripe';
// Import routes and handlers directly for proper RPC type inference
import { secureMeHandler } from './routes/auth/handler';
import { secureMeRoute } from './routes/auth/route';
// Billing routes
import {
  cancelSubscriptionHandler,
  createCheckoutSessionHandler,
  createCustomerPortalSessionHandler,
  getProductHandler,
  getSubscriptionHandler,
  handleWebhookHandler,
  listProductsHandler,
  listSubscriptionsHandler,
  switchSubscriptionHandler,
  syncAfterCheckoutHandler,
} from './routes/billing/handler';
import {
  cancelSubscriptionRoute,
  createCheckoutSessionRoute,
  createCustomerPortalSessionRoute,
  getProductRoute,
  getSubscriptionRoute,
  handleWebhookRoute,
  listProductsRoute,
  listSubscriptionsRoute,
  switchSubscriptionRoute,
  syncAfterCheckoutRoute,
} from './routes/billing/route';
// System/health routes
import {
  detailedHealthHandler,
  healthHandler,
} from './routes/system/handler';
import {
  detailedHealthRoute,
  healthRoute,
} from './routes/system/route';
import type { ApiEnv } from './types';

// ============================================================================
// Step 1: Create the main OpenAPIHono app with defaultHook (following docs)
// ============================================================================

const app = createOpenApiApp();

// ============================================================================
// Step 2: Apply global middleware (following Hono patterns)
// ============================================================================

// Logging and formatting
app.use('*', prettyJSON());
app.use('*', honoLoggerMiddleware);
app.use('*', errorLoggerMiddleware);
app.use('*', trimTrailingSlash());

// Core middleware
app.use('*', contextStorage());
app.use('*', secureHeaders()); // Use default secure headers - much simpler
app.use('*', requestId());
// IMPORTANT: Compression handled natively by Cloudflare Workers
// Using Hono's compress() middleware causes binary corruption in OpenNext.js
// Let Cloudflare handle gzip/brotli compression automatically
app.use('*', timing());
app.use('*', timeout(15000));

// Body limit
app.use('*', bodyLimit({
  maxSize: 5 * 1024 * 1024,
  onError: c => c.text('Payload Too Large', 413),
}));

// CORS configuration - Use environment variables for dynamic origin configuration
app.use('*', (c, next) => {
  // Get the current environment's allowed origin from NEXT_PUBLIC_APP_URL
  const appUrl = c.env.NEXT_PUBLIC_APP_URL;
  const webappEnv = c.env.NEXT_PUBLIC_WEBAPP_ENV || 'local';
  const isDevelopment = webappEnv === 'local' || c.env.NODE_ENV === 'development';

  // Build allowed origins dynamically based on environment
  const allowedOrigins: string[] = [];

  // Only allow localhost in development environment
  if (isDevelopment) {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  // Add current environment URL if available and not localhost
  if (appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
    allowedOrigins.push(appUrl);
  }

  const middleware = cors({
    origin: (origin) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin)
        return origin;

      // Check if origin is in allowed list
      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  });
  return middleware(c, next);
});

// CSRF protection - Applied selectively to protected routes only
// Following Hono best practices: exclude public endpoints from CSRF protection
function csrfMiddleware(c: Context<ApiEnv>, next: Next) {
  // Get the current environment's allowed origin from NEXT_PUBLIC_APP_URL
  const appUrl = c.env.NEXT_PUBLIC_APP_URL;
  const webappEnv = c.env.NEXT_PUBLIC_WEBAPP_ENV || 'local';
  const isDevelopment = webappEnv === 'local' || c.env.NODE_ENV === 'development';

  // Build allowed origins dynamically based on environment
  const allowedOrigins: string[] = [];

  // Only allow localhost in development environment
  if (isDevelopment) {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  // Add current environment URL if available and not localhost
  if (appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
    allowedOrigins.push(appUrl);
  }

  const middleware = csrf({
    origin: allowedOrigins,
  });
  return middleware(c, next);
}

// ETag support
app.use('*', etag());

// Session attachment
app.use('*', attachSession);

// Stripe initialization for all billing routes and webhooks
// Using wildcard pattern to apply middleware to all /billing/* routes
app.use('/billing/*', ensureStripeInitialized);
app.use('/webhooks/stripe', ensureStripeInitialized);

// Global rate limiting
app.use('*', RateLimiterFactory.create('api'));

// ============================================================================
// Step 3: Configure error and not-found handlers
// ============================================================================

app.onError(onError);
app.notFound(notFound);

// ============================================================================
// Step 4: Register all routes directly on main app for RPC type inference
// CRITICAL: Routes must be registered with .openapi() for RPC to work
// ============================================================================

// Apply CSRF protection and authentication to protected routes
// Following Hono best practices: apply CSRF only to authenticated routes
app.use('/auth/me', csrfMiddleware, requireSession);
// Protected billing endpoints (checkout, portal, sync, subscriptions)
app.use('/billing/checkout', csrfMiddleware, requireSession);
app.use('/billing/portal', csrfMiddleware, requireSession);
app.use('/billing/sync-after-checkout', csrfMiddleware, requireSession);
app.use('/billing/subscriptions', csrfMiddleware, requireSession);
app.use('/billing/subscriptions/:id', csrfMiddleware, requireSession);
app.use('/billing/subscriptions/:id/switch', csrfMiddleware, requireSession);
app.use('/billing/subscriptions/:id/cancel', csrfMiddleware, requireSession);

// Register all routes directly on the app
const appRoutes = app
  // System/health routes
  .openapi(healthRoute, healthHandler)
  .openapi(detailedHealthRoute, detailedHealthHandler)
  // Auth routes
  .openapi(secureMeRoute, secureMeHandler)
  // Billing routes - Products (public)
  .openapi(listProductsRoute, listProductsHandler)
  .openapi(getProductRoute, getProductHandler)
  // Billing routes - Checkout (protected)
  .openapi(createCheckoutSessionRoute, createCheckoutSessionHandler)
  // Billing routes - Customer Portal (protected)
  .openapi(createCustomerPortalSessionRoute, createCustomerPortalSessionHandler)
  // Billing routes - Sync (protected)
  .openapi(syncAfterCheckoutRoute, syncAfterCheckoutHandler)
  // Billing routes - Subscriptions (protected)
  .openapi(listSubscriptionsRoute, listSubscriptionsHandler)
  .openapi(getSubscriptionRoute, getSubscriptionHandler)
  // Billing routes - Subscription Management (protected)
  .openapi(switchSubscriptionRoute, switchSubscriptionHandler)
  .openapi(cancelSubscriptionRoute, cancelSubscriptionHandler)
  // Billing routes - Webhooks (public with signature verification)
  .openapi(handleWebhookRoute, handleWebhookHandler)
;

// ============================================================================
// Step 5: Export AppType for RPC client type inference (CRITICAL!)
// This MUST be done immediately after defining routes, as per the docs
// This enables full type safety for RPC clients
// ============================================================================

export type AppType = typeof appRoutes;

// ============================================================================
// Step 6: OpenAPI documentation endpoints
// ============================================================================

// OpenAPI specification document endpoint
appRoutes.doc('/doc', c => ({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Roundtable API',
    description: 'roundtable.now API - Collaborative AI brainstorming platform. Built with Hono, Zod, and OpenAPI.',
    contact: { name: 'Roundtable', url: 'https://roundtable.now' },
    license: { name: 'Proprietary' },
  },
  tags: [
    { name: 'system', description: 'System health and diagnostics' },
    { name: 'auth', description: 'Authentication and authorization' },
    { name: 'billing', description: 'Stripe billing, subscriptions, and payments' },
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

// OpenAPI JSON endpoint (redirect to the doc endpoint)
appRoutes.get('/openapi.json', async (c) => {
  // Redirect to the existing doc endpoint which contains the full OpenAPI spec
  return c.redirect('/api/v1/doc');
});

// ============================================================================
// Step 7: Additional endpoints (Scalar UI, LLMs, etc.)
// ============================================================================

// Scalar API documentation UI
appRoutes.get('/scalar', Scalar({
  url: '/api/v1/doc',
}));

// Health endpoints are now properly registered as OpenAPI routes above

// LLM-friendly documentation
appRoutes.get('/llms.txt', async (c) => {
  try {
    const document = appRoutes.getOpenAPI31Document({
      openapi: '3.1.0',
      info: {
        title: 'Application API',
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

export default {
  fetch: appRoutes.fetch,
};

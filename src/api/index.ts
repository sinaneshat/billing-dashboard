/**
 * zarinpal API - Hono Zod OpenAPI Implementation
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
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { timeout } from 'hono/timeout';
import { timing } from 'hono/timing';
import { trimTrailingSlash } from 'hono/trailing-slash';
import notFound from 'stoker/middlewares/not-found';
import onError from 'stoker/middlewares/on-error';

import { createOpenApiApp } from './factory';
import { attachSession, requireMasterKey, requireSession } from './middleware';
import { apiLogger, errorLoggerMiddleware, honoLoggerMiddleware } from './middleware/hono-logger';
import { metricsMiddleware, performanceMiddleware } from './middleware/performance';
import { RateLimiterFactory } from './middleware/rate-limiter-factory';
// Admin routes for platform owner access
import {
  adminStatsHandler,
  adminStatsRoute,
  adminTestWebhookHandler,
  adminTestWebhookRoute,
  adminUsersHandler,
  adminUsersRoute,
} from './routes/admin';
// Import routes and handlers directly for proper RPC type inference
import { secureMeHandler } from './routes/auth/handler';
import { secureMeRoute } from './routes/auth/route';
import { ssoHandler } from './routes/auth/sso/handler';
import { ssoRoute } from './routes/auth/sso/route';
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
// Direct debit routes (ZarinPal Payman API)
import {
  initiateDirectDebitContractHandler,
  verifyDirectDebitContractHandler,
} from './routes/payment-methods/direct-debit/handler';
import {
  initiateDirectDebitContractRoute,
  verifyDirectDebitContractRoute,
} from './routes/payment-methods/direct-debit/route';
import {
  createPaymentMethodHandler,
  deletePaymentMethodHandler,
  getPaymentMethodsHandler,
  setDefaultPaymentMethodHandler,
} from './routes/payment-methods/handler';
import {
  createPaymentMethodRoute,
  deletePaymentMethodRoute,
  getPaymentMethodsRoute,
  setDefaultPaymentMethodRoute,
} from './routes/payment-methods/route';
// Payment routes including callback and history
import { getPaymentsHandler, paymentCallbackHandler } from './routes/payments/handler';
import { getPaymentsRoute, paymentCallbackRoute } from './routes/payments/route';
import { getProductsHandler } from './routes/products/handler';
import { getProductsRoute } from './routes/products/route';
// Billing routes
import {
  cancelSubscriptionHandler,
  changePlanHandler,
  createSubscriptionHandler,
  getSubscriptionHandler,
  getSubscriptionsHandler,
  resubscribeHandler,
} from './routes/subscriptions/handler';
import {
  cancelSubscriptionRoute,
  changePlanRoute,
  createSubscriptionRoute,
  getSubscriptionRoute,
  getSubscriptionsRoute,
  resubscribeRoute,
} from './routes/subscriptions/route';
import { detailedHealthHandler, healthHandler } from './routes/system/handler';
import { detailedHealthRoute, healthRoute } from './routes/system/route';
import {
  getWebhookEventsHandler,
  testWebhookHandler,
  zarinPalWebhookHandler,
} from './routes/webhooks/handler';
import {
  getWebhookEventsRoute,
  testWebhookRoute,
  zarinPalWebhookRoute,
} from './routes/webhooks/route';
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
  const allowedUrl = c.env?.NEXT_PUBLIC_APP_URL;
  const origin = allowedUrl ? new URL(allowedUrl).origin : undefined;
  const middleware = origin ? csrf({ origin }) : csrf();
  return middleware(c, next);
});

// ETag support
app.use('*', etag());

// Performance monitoring and metrics collection
app.use('*', performanceMiddleware);
app.use('*', metricsMiddleware);

// Session attachment
app.use('*', attachSession);

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

// Apply middleware for protected routes
app.use('/auth/*', requireSession);
app.use('/images/*', requireSession);
// Subscriptions require authentication
app.use('/subscriptions/*', requireSession);
// Payment methods require authentication
app.use('/payment-methods/*', requireSession);
app.use('/webhooks/events', requireSession);
app.use('/webhooks/test', requireSession);
// Admin routes require master key authentication
app.use('/admin/*', requireMasterKey);

// Register all routes directly on the app
const appRoutes = app
  // System routes (health checks)
  .openapi(healthRoute, healthHandler)
  .openapi(detailedHealthRoute, detailedHealthHandler)
  // Auth routes
  .openapi(secureMeRoute, secureMeHandler)
  .openapi(ssoRoute, ssoHandler)
  // Products routes
  .openapi(getProductsRoute, getProductsHandler)
  // Subscriptions routes
  .openapi(getSubscriptionsRoute, getSubscriptionsHandler)
  .openapi(getSubscriptionRoute, getSubscriptionHandler)
  .openapi(createSubscriptionRoute, createSubscriptionHandler)
  .openapi(cancelSubscriptionRoute, cancelSubscriptionHandler)
  .openapi(resubscribeRoute, resubscribeHandler)
  .openapi(changePlanRoute, changePlanHandler)
  // Payment methods routes
  .openapi(getPaymentMethodsRoute, getPaymentMethodsHandler)
  .openapi(createPaymentMethodRoute, createPaymentMethodHandler)
  .openapi(deletePaymentMethodRoute, deletePaymentMethodHandler)
  .openapi(setDefaultPaymentMethodRoute, setDefaultPaymentMethodHandler)
  // Payment routes
  .openapi(getPaymentsRoute, getPaymentsHandler)
  .openapi(paymentCallbackRoute, paymentCallbackHandler)
  // Direct debit contract routes (ZarinPal Payman API)
  .openapi(initiateDirectDebitContractRoute, initiateDirectDebitContractHandler)
  .openapi(verifyDirectDebitContractRoute, verifyDirectDebitContractHandler)
  // Webhooks routes
  .openapi(zarinPalWebhookRoute, zarinPalWebhookHandler)
  .openapi(getWebhookEventsRoute, getWebhookEventsHandler)
  .openapi(testWebhookRoute, testWebhookHandler)
  // Images routes
  .openapi(uploadUserAvatarRoute, uploadUserAvatarHandler)
  .openapi(uploadCompanyImageRoute, uploadCompanyImageHandler)
  .openapi(getImagesRoute, getImagesHandler)
  .openapi(getImageMetadataRoute, getImageMetadataHandler)
  .openapi(deleteImageRoute, deleteImageHandler)
  // Admin routes (master key required)
  .openapi(adminStatsRoute, adminStatsHandler)
  .openapi(adminUsersRoute, adminUsersHandler)
  .openapi(adminTestWebhookRoute, adminTestWebhookHandler);

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
    title: 'Subscription Management API',
    description: 'API for subscription billing and direct debit automation. Built with Hono, Zod, and OpenAPI.',
    contact: { name: 'zarinpal', url: 'https://zarinpal.app' },
    license: { name: 'Proprietary' },
  },
  tags: [
    { name: 'system', description: 'System health and diagnostics' },
    { name: 'auth', description: 'Authentication and authorization' },
    { name: 'products', description: 'Subscription plans and pricing' },
    { name: 'subscriptions', description: 'Subscription lifecycle management and automated billing' },
    { name: 'payment-methods', description: 'Subscription payment methods and direct debit automation' },
    { name: 'webhooks', description: 'Subscription webhooks and billing notifications' },
    { name: 'images', description: 'Image upload and management' },
    { name: 'admin', description: 'Platform administration and external API access (master key required)' },
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

// Cache health endpoints
appRoutes.get('/health', cache({
  cacheName: 'zarinpal-api',
  cacheControl: 'max-age=60',
}));

appRoutes.get('/health/*', cache({
  cacheName: 'zarinpal-api',
  cacheControl: 'max-age=60',
}));

// LLM-friendly documentation
appRoutes.get('/llms.txt', async (c) => {
  try {
    const document = appRoutes.getOpenAPI31Document({
      openapi: '3.1.0',
      info: {
        title: 'Subscription Management API',
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
  // Export scheduled handler for cron jobs
  scheduled: (event: ScheduledEvent, env: ApiEnv, ctx: ExecutionContext) => {
    // Import scheduled handlers dynamically to avoid circular imports
    import('./scheduled/monthly-billing').then(({ default: billingScheduler }) => {
      return billingScheduler.scheduled(event, env, ctx);
    }).catch((error) => {
      apiLogger.error('Failed to load billing scheduler', { error });
    });
  },
};

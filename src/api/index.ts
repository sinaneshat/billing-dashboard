/**
 * zarinpal API - Hono Zod OpenAPI Implementation
 *
 * This file follows the EXACT pattern from the official Hono Zod OpenAPI documentation.
 * It provides full type safety and automatic RPC client type inference.
 *
 * IMPORTANT: All routes MUST use createOpenApiApp() pattern for RPC type safety.
 * Never use createRoute directly in route handlers - always use OpenAPIHono apps.
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown';
import type { Context, Next } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cache } from 'hono/cache';
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

import { getDbAsync } from '@/db';

// ============================================================================
// HEALTH CHECK HANDLERS
// ============================================================================
import { createHandler, Responses } from './core';
import { createOpenApiApp } from './factory';
import { attachSession, requireSession } from './middleware';
// Enhanced middleware for optimized performance
import { enhancedErrorHandler } from './middleware/enhanced-error-handler';
import { apiLogger, errorLoggerMiddleware, honoLoggerMiddleware } from './middleware/hono-logger';
import { RateLimiterFactory } from './middleware/rate-limiter-factory';
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
// Contract status route
import { getContractStatusHandler } from './routes/payment-methods/contract-status/handler';
import { getContractStatusRoute } from './routes/payment-methods/contract-status/route';
// Direct debit routes (ZarinPal Payman API) - Enhanced with performance optimizations
import {
  cancelDirectDebitContractHandler,
  directDebitCallbackHandler,
  executeDirectDebitPaymentHandler,
  getBankListHandler,
  initiateDirectDebitContractHandler,
  verifyDirectDebitContractHandler,
} from './routes/payment-methods/direct-debit/handler';
import {
  cancelDirectDebitContractRoute,
  directDebitCallbackRoute,
  executeDirectDebitPaymentRoute,
  getBankListRoute,
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
// Contract signing routes
import {
  generateSigningUrlHandler,
  getContractSigningInfoHandler,
} from './routes/payment-methods/sign/handler';
import {
  generateSigningUrlRoute,
  getContractSigningInfoRoute,
} from './routes/payment-methods/sign/route';
// Payment routes including callback and history
import { getPaymentsHandler, paymentCallbackHandler } from './routes/payments/handler';
import { getPaymentsRoute, paymentCallbackRoute } from './routes/payments/route';
import { getProductsHandler } from './routes/products/handler';
import { getProductsRoute } from './routes/products/route';
// Billing routes - Enhanced with analytics and optimizations
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
import { detailedHealthRoute, healthRoute } from './routes/system/route';
// Enhanced webhook handlers with intelligent retry and correlation
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

/**
 * Basic health check handler
 */
export const healthHandler: RouteHandler<typeof healthRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'healthCheck',
  },
  async (c) => {
    const healthData = {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };

    return Responses.ok(c, healthData);
  },
);

/**
 * Detailed health check handler with dependency checks
 */
export const detailedHealthHandler: RouteHandler<typeof detailedHealthRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'detailedHealthCheck',
  },
  async (c) => {
    const startTime = Date.now();
    const dependencies: Record<string, { status: 'healthy' | 'degraded' | 'unhealthy'; message: string; duration?: number }> = {};

    // Check database connectivity
    try {
      const dbStart = Date.now();
      await getDbAsync();
      dependencies.database = {
        status: 'healthy',
        message: 'Database connection successful',
        duration: Date.now() - dbStart,
      };
    } catch (error) {
      dependencies.database = {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      };
    }

    // Check environment configuration
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const;
    const missingVars = requiredEnvVars.filter(varName => !c.env[varName as keyof typeof c.env]);

    dependencies.environment = {
      status: missingVars.length === 0 ? 'healthy' : 'degraded',
      message: missingVars.length === 0
        ? 'Environment configuration is valid'
        : `Missing environment variables: ${missingVars.join(', ')}`,
    };

    // Calculate summary
    const healthyCount = Object.values(dependencies).filter(dep => dep.status === 'healthy').length;
    const degradedCount = Object.values(dependencies).filter(dep => dep.status === 'degraded').length;
    const unhealthyCount = Object.values(dependencies).filter(dep => dep.status === 'unhealthy').length;
    const total = Object.keys(dependencies).length;

    const overallStatus = unhealthyCount > 0 ? 'unhealthy' : degradedCount > 0 ? 'degraded' : 'healthy';

    const healthData = {
      ok: overallStatus === 'healthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      env: {
        runtime: 'cloudflare-workers',
        version: 'workers-runtime',
        nodeEnv: c.env.NODE_ENV || 'development',
      },
      dependencies,
      summary: {
        total,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    return c.json({ success: true, data: healthData, meta: { requestId: c.get('requestId'), timestamp: new Date().toISOString() } }, statusCode);
  },
);

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

// Enhanced error handling and database optimization middleware
app.use('*', enhancedErrorHandler());

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

// Apply CSRF protection and authentication to protected routes
// Following Hono best practices: apply CSRF only to authenticated routes
app.use('/auth/me', csrfMiddleware, requireSession);
app.use('/images/*', csrfMiddleware, requireSession);
// Subscriptions require authentication and CSRF protection
app.use('/subscriptions/*', csrfMiddleware, requireSession);
// Payment methods require authentication and CSRF protection
app.use('/payment-methods/*', csrfMiddleware, requireSession);
app.use('/webhooks/events', csrfMiddleware, requireSession);
app.use('/webhooks/test', csrfMiddleware, requireSession);

// Register all routes directly on the app
const appRoutes = app
  // System routes (health checks)
  .openapi(healthRoute, healthHandler)
  .openapi(detailedHealthRoute, detailedHealthHandler)
  // Auth routes
  .openapi(secureMeRoute, secureMeHandler)
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
  .openapi(getContractStatusRoute, getContractStatusHandler)
  // Contract signing routes
  .openapi(getContractSigningInfoRoute, getContractSigningInfoHandler)
  .openapi(generateSigningUrlRoute, generateSigningUrlHandler)
  // Payment routes
  .openapi(getPaymentsRoute, getPaymentsHandler)
  .openapi(paymentCallbackRoute, paymentCallbackHandler)
  // Direct debit contract routes (ZarinPal Payman API)
  .openapi(initiateDirectDebitContractRoute, initiateDirectDebitContractHandler)
  .openapi(verifyDirectDebitContractRoute, verifyDirectDebitContractHandler)
  .openapi(getBankListRoute, getBankListHandler)
  .openapi(executeDirectDebitPaymentRoute, executeDirectDebitPaymentHandler)
  .openapi(cancelDirectDebitContractRoute, cancelDirectDebitContractHandler)
  .openapi(directDebitCallbackRoute, directDebitCallbackHandler)
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
    { name: 'analytics', description: 'Subscription analytics, revenue tracking, and business insights' },
    { name: 'payment-methods', description: 'Subscription payment methods and direct debit automation' },
    { name: 'webhooks', description: 'Subscription webhooks and billing notifications' },
    { name: 'images', description: 'Image upload and management' },
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

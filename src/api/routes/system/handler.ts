import type { RouteHandler } from '@hono/zod-openapi';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { z } from 'zod';

import type { FetchConfig } from '@/api/common/fetch-utilities';
import { fetchJSON, fetchWithRetry } from '@/api/common/fetch-utilities';
import { createHandler, Responses } from '@/api/core';
import { getEnvironmentHealthStatus } from '@/api/middleware/environment-validation';
import type { ApiEnv } from '@/api/types';

import type { detailedHealthRoute, healthRoute } from './route';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Discriminated union for health check details (Context7 Pattern)
 * Maximum type safety replacing Record<string, unknown>
 */
const _HealthCheckDetailsSchema = z.discriminatedUnion('component', [
  z.object({
    component: z.literal('database'),
    queryTime: z.number().positive(),
    connectionAvailable: z.boolean(),
    poolStatus: z.string().optional(),
  }),
  z.object({
    component: z.literal('environment'),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    missingCritical: z.array(z.string()),
    missingOptional: z.array(z.string()),
  }),
  z.object({
    component: z.literal('storage'),
    bucketAccessible: z.boolean(),
    responseTime: z.number().positive(),
    canList: z.boolean(),
    canWrite: z.boolean().optional(),
  }),
  z.object({
    component: z.literal('zarinpal'),
    apiEndpointAccessible: z.boolean(),
    responseTime: z.number().positive(),
    environment: z.enum(['sandbox', 'production']),
    credentialsValid: z.boolean().optional(),
  }),
  z.object({
    component: z.literal('webhook'),
    webhookAccessible: z.boolean(),
    responseTime: z.number().positive(),
    statusCode: z.number().int().optional(),
    endpoint: z.string().url().optional(),
  }),
  z.object({
    component: z.literal('kv'),
    kvAccessible: z.boolean(),
    responseTime: z.number().positive(),
    testResult: z.enum(['expected_null', 'unexpected_value']),
  }),
  z.object({
    component: z.literal('generic'),
    error: z.string(),
    statusCode: z.number().int().optional(),
    responseStatus: z.number().int().optional(),
  }),
]);

type HealthCheckDetails = z.infer<typeof _HealthCheckDetailsSchema>;

type HealthCheckResult = {
  status: HealthStatus;
  message: string;
  duration?: number;
  details?: HealthCheckDetails;
};

/**
 * Handler for basic health check endpoint
 * Refactored: Uses unified factory pattern
 */
export const healthHandler: RouteHandler<typeof healthRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'healthCheck',
  },
  async (c) => {
    return Responses.ok(c, {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  },
);

/**
 * Handler for detailed health check endpoint with comprehensive external dependency monitoring
 * Refactored: Uses unified factory pattern
 */
export const detailedHealthHandler: RouteHandler<typeof detailedHealthRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'detailedHealthCheck',
  },
  async (c) => {
    const healthStart = Date.now();
    const healthChecks: Record<string, HealthCheckResult> = {};

    // 1. Database connectivity check
    const { env } = getCloudflareContext();
    healthChecks.database = await checkDatabaseHealth(env.DB);

    // 2. Environment configuration check
    healthChecks.environment = checkEnvironmentHealth(env);

    // 3. Storage (R2) accessibility check
    healthChecks.storage = await checkStorageHealth(env.UPLOADS_R2_BUCKET);

    // 4. ZarinPal payment gateway connectivity check
    healthChecks.zarinpal = await checkZarinPalHealth(env);

    // 5. External webhook endpoint check (if configured)
    healthChecks.externalWebhook = await checkExternalWebhookHealth(env.NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL);

    // 6. KV store check
    healthChecks.kvStore = await checkKVHealth(env.KV);

    const healthDuration = Date.now() - healthStart;

    // Determine overall health status
    const criticalServices = ['database', 'environment'];
    const hasCriticalFailures = criticalServices.some(
      service => healthChecks[service]?.status === 'unhealthy',
    );
    const hasWarnings = Object.values(healthChecks).some(
      (check: HealthCheckResult) => check.status === 'degraded',
    );

    const overallStatus = hasCriticalFailures
      ? 'unhealthy'
      : hasWarnings
        ? 'degraded'
        : 'healthy';

    const responseData = {
      ok: overallStatus === 'healthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: healthDuration,
      env: {
        runtime: typeof globalThis.navigator !== 'undefined' ? 'cloudflare-workers' : 'node',
        version: typeof process !== 'undefined' ? process.version : 'workers-runtime',
        nodeEnv: env.NODE_ENV || 'unknown',
      },
      dependencies: healthChecks,
      summary: {
        total: Object.keys(healthChecks).length,
        healthy: Object.values(healthChecks).filter((check: HealthCheckResult) => check.status === 'healthy').length,
        degraded: Object.values(healthChecks).filter((check: HealthCheckResult) => check.status === 'degraded').length,
        unhealthy: Object.values(healthChecks).filter((check: HealthCheckResult) => check.status === 'unhealthy').length,
      },
    };

    // Return with appropriate status code based on health status
    if (overallStatus === 'unhealthy') {
      return Responses.serviceUnavailable(c, responseData, 'System health check failed');
    }
    return Responses.ok(c, responseData);
  },
);

// ============================================================================
// INDIVIDUAL HEALTH CHECK FUNCTIONS
// ============================================================================

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth(db?: D1Database): Promise<HealthCheckResult> {
  if (!db) {
    return {
      status: 'unhealthy',
      message: 'Database binding not available',
    };
  }

  const start = Date.now();
  try {
    // Test basic connectivity
    const result = await db.prepare('SELECT 1 as test').first();
    const duration = Date.now() - start;

    if (result?.test !== 1) {
      return {
        status: 'degraded',
        message: 'Database query returned unexpected result',
        duration,
      };
    }

    // Check if response time is concerning
    const status = duration > 1000 ? 'degraded' : 'healthy';
    const message = duration > 1000
      ? `Database responding slowly (${duration}ms)`
      : 'Database is healthy';

    return {
      status,
      message,
      duration,
      details: {
        component: 'database' as const,
        queryTime: duration,
        connectionAvailable: true,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
    };
  }
}

/**
 * Check environment configuration using validation middleware
 */
function checkEnvironmentHealth(env: CloudflareEnv): HealthCheckResult {
  try {
    const envHealth = getEnvironmentHealthStatus(env);

    return {
      status: envHealth.status,
      message: envHealth.status === 'healthy'
        ? 'Environment configuration is valid'
        : `Environment issues detected: ${envHealth.validation.errors.length} errors, ${envHealth.validation.warnings.length} warnings`,
      details: {
        component: 'environment' as const,
        errors: envHealth.validation.errors,
        warnings: envHealth.validation.warnings,
        missingCritical: envHealth.validation.missingCritical,
        missingOptional: envHealth.validation.missingOptional,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        component: 'generic' as const,
        error: String(error),
      },
    };
  }
}

/**
 * Check R2 storage bucket accessibility
 */
async function checkStorageHealth(bucket?: R2Bucket): Promise<HealthCheckResult> {
  if (!bucket) {
    return {
      status: 'degraded',
      message: 'R2 storage bucket not configured',
    };
  }

  const start = Date.now();
  try {
    // Test basic bucket access by listing objects (limit to 1)
    await bucket.list({ limit: 1 });
    const duration = Date.now() - start;

    const status = duration > 2000 ? 'degraded' : 'healthy';
    const message = duration > 2000
      ? `Storage responding slowly (${duration}ms)`
      : 'Storage is accessible';

    return {
      status,
      message,
      duration,
      details: {
        component: 'storage' as const,
        bucketAccessible: true,
        responseTime: duration,
        canList: true,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: 'unhealthy',
      message: `Storage access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
      details: {
        component: 'generic' as const,
        error: String(error),
      },
    };
  }
}

/**
 * Check ZarinPal payment gateway connectivity
 */
async function checkZarinPalHealth(env: CloudflareEnv): Promise<HealthCheckResult> {
  if (!env?.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID || !env?.ZARINPAL_ACCESS_TOKEN) {
    return {
      status: 'degraded',
      message: 'ZarinPal credentials not configured',
    };
  }

  const start = Date.now();
  try {
    // Test ZarinPal API endpoint connectivity with a lightweight request
    const baseUrl = env.NODE_ENV === 'development'
      ? 'https://sandbox.zarinpal.com'
      : 'https://api.zarinpal.com';

    const fetchConfig: FetchConfig = {
      timeoutMs: 10000,
      maxRetries: 1,
      correlationId: crypto.randomUUID(),
    };

    // Use a simple GET request to check API availability
    const testUrl = `${baseUrl}/pg/v4/payment/request.json`;
    const fetchResult = await fetchJSON(testUrl, fetchConfig);

    const duration = Date.now() - start;

    // We expect this to fail with auth error, but that means the service is up
    const isServiceUp = !fetchResult.success && fetchResult.response?.status === HttpStatusCodes.UNAUTHORIZED;

    if (isServiceUp) {
      const status = duration > 3000 ? 'degraded' : 'healthy';
      const message = duration > 3000
        ? `ZarinPal responding slowly (${duration}ms)`
        : 'ZarinPal API is accessible';

      return {
        status,
        message,
        duration,
        details: {
          component: 'zarinpal' as const,
          apiEndpointAccessible: true,
          responseTime: duration,
          environment: env.NODE_ENV === 'development' ? 'sandbox' : 'production',
        },
      };
    }

    return {
      status: 'degraded',
      message: 'ZarinPal API returned unexpected response',
      duration,
      details: {
        component: 'generic' as const,
        error: fetchResult.success ? 'No error' : fetchResult.error,
        responseStatus: fetchResult.response?.status,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: 'unhealthy',
      message: `ZarinPal connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
      details: {
        component: 'generic' as const,
        error: String(error),
      },
    };
  }
}

/**
 * Check external webhook endpoint (if configured)
 */
async function checkExternalWebhookHealth(webhookUrl?: string): Promise<HealthCheckResult> {
  if (!webhookUrl) {
    return {
      status: 'healthy', // Not having external webhook is not a problem
      message: 'External webhook not configured',
    };
  }

  const start = Date.now();
  try {
    // Test webhook endpoint with a HEAD request to avoid side effects
    const fetchConfig: FetchConfig = {
      timeoutMs: 5000,
      maxRetries: 1,
      correlationId: crypto.randomUUID(),
    };

    const fetchResult = await fetchWithRetry(webhookUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'DeadPixel-BillingDashboard-HealthCheck/1.0',
      },
    }, fetchConfig);

    const duration = Date.now() - start;

    if (fetchResult.success) {
      const status = duration > 3000 ? 'degraded' : 'healthy';
      const message = duration > 3000
        ? `External webhook responding slowly (${duration}ms)`
        : 'External webhook is accessible';

      return {
        status,
        message,
        duration,
        details: {
          component: 'webhook' as const,
          webhookAccessible: true,
          responseTime: duration,
          statusCode: fetchResult.response?.status,
        },
      };
    }

    // Webhook not accessible is concerning but not critical
    return {
      status: 'degraded',
      message: 'External webhook not accessible',
      duration,
      details: {
        component: 'generic' as const,
        error: fetchResult.success ? 'No error' : fetchResult.error,
        statusCode: fetchResult.response?.status,
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: 'degraded',
      message: `External webhook check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
      details: {
        component: 'generic' as const,
        error: String(error),
      },
    };
  }
}

/**
 * Check KV store availability
 */
async function checkKVHealth(kv?: KVNamespace): Promise<HealthCheckResult> {
  if (!kv) {
    return {
      status: 'degraded',
      message: 'KV namespace not configured',
    };
  }

  const start = Date.now();
  try {
    // Test KV by trying to get a non-existent key (should return null quickly)
    const testKey = `health-check-${Date.now()}`;
    const result = await kv.get(testKey);
    const duration = Date.now() - start;

    // Should return null for non-existent key
    const status = duration > 1000 ? 'degraded' : 'healthy';
    const message = duration > 1000
      ? `KV store responding slowly (${duration}ms)`
      : 'KV store is accessible';

    return {
      status,
      message,
      duration,
      details: {
        component: 'kv' as const,
        kvAccessible: true,
        responseTime: duration,
        testResult: result === null ? 'expected_null' : 'unexpected_value',
      },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: 'unhealthy',
      message: `KV store access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration,
      details: {
        component: 'generic' as const,
        error: String(error),
      },
    };
  }
}

import type { RouteHandler } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';

import type { detailedHealthRoute, healthRoute } from './route';

/**
 * Handler for basic health check endpoint
 * @param c - Hono context
 * @returns Basic health status
 */
export const healthHandler: RouteHandler<typeof healthRoute, ApiEnv> = (c) => {
  c.header('X-Route', 'system/health');
  return ok(c, {
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }, undefined, HttpStatusCodes.OK);
};

/**
 * Handler for detailed health check endpoint
 * @param c - Hono context
 * @returns Detailed health status with environment and dependencies
 */
export const detailedHealthHandler: RouteHandler<typeof detailedHealthRoute, ApiEnv> = async (c) => {
  // Test database connectivity
  let dbStatus = 'ok';
  try {
    // Try to access the database binding if available
    if (c.env?.DB) {
      await c.env.DB.prepare('SELECT 1').first();
    }
  } catch (error) {
    dbStatus = 'error';
    apiLogger.error('Database health check failed', { error });
  }

  const isHealthy = dbStatus === 'ok';

  const responseData = {
    ok: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    env: {
      runtime: typeof process !== 'undefined' ? 'node' : 'edge',
      version: typeof process !== 'undefined' ? process.version : 'edge',
    },
    dependencies: {
      database: dbStatus,
    },
  };

  if (isHealthy) {
    return ok(c, responseData);
  } else {
    return c.json({
      success: true,
      data: responseData,
    }, HttpStatusCodes.SERVICE_UNAVAILABLE);
  }
};

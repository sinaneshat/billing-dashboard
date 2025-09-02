import { createMiddleware } from 'hono/factory';

import type { ApiEnv } from '@/api/types';

import { apiLogger } from './hono-logger';

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
export const performanceMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const startTime = Date.now();

  await next();

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Add performance headers
  c.res.headers.set('X-Response-Time', `${duration}ms`);
  c.res.headers.set('X-Timestamp', new Date().toISOString());

  // Log slow requests (> 1 second)
  if (duration > 1000) {
    apiLogger.warn('Slow request detected', {
      method: c.req.method,
      url: c.req.url,
      duration,
      component: 'performance',
    });
  }

  // Log performance metrics to console in development
  if (c.env?.NODE_ENV === 'development') {
    const method = c.req.method;
    const path = new URL(c.req.url).pathname;
    const status = c.res.status;

    apiLogger.info('Request completed', {
      method,
      path,
      status,
      duration,
      component: 'performance',
    });
  }
});

/**
 * Metrics collection middleware
 * Collects basic request metrics for monitoring
 */
export const metricsMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const startTime = performance.now();

  await next();

  const endTime = performance.now();
  const duration = Math.round((endTime - startTime) * 100) / 100; // Round to 2 decimal places

  // In a production environment, you might want to collect metrics
  // and send them to a monitoring service like DataDog, New Relic, or CloudFlare Analytics
  if (c.env?.NODE_ENV === 'production') {
    const metricsData = {
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      duration: `${duration}ms`,
      userAgent: c.req.header('user-agent') || 'unknown',
    };
    // Example: await sendMetricsToService(metricsData);
    apiLogger.debug('Performance metrics', { metrics: metricsData, component: 'performance' });
  }
});

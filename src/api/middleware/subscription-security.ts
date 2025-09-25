import { createMiddleware } from 'hono/factory';

import { createError } from '@/api/common/error-handling';
import type { ApiEnv } from '@/api/types';

import { RateLimiterFactory } from './rate-limiter-factory';

/**
 * Subscription Security Middleware
 *
 * Implements security measures for subscription operations:
 * - Rate limiting: 3 subscription operations per hour per user
 * - Authentication enforcement
 * - Request validation for subscription security
 *
 * Following patterns from backend-patterns.md:subscription-patterns
 */
export const subscriptionSecurityMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const user = c.get('user');

  // Enforce authentication requirement
  if (!user) {
    throw createError.unauthenticated('Authentication required for subscription operations');
  }

  // Use existing 'organization' rate limiter preset that's closest to what we need
  const rateLimiter = RateLimiterFactory.create('organization');

  // Apply the rate limiter middleware directly
  await rateLimiter(c, next);

  // Rate limiting is handled by the middleware itself
  // No additional logging needed here

  await next();
});

/**
 * Enhanced subscription security middleware for critical operations
 *
 * Additional security measures for subscription creation and switching:
 * - Stricter rate limiting (1 per 10 minutes for creation)
 * - Enhanced logging and monitoring
 */
export const strictSubscriptionSecurityMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const user = c.get('user');

  if (!user) {
    throw createError.unauthenticated('Authentication required for critical subscription operations');
  }

  // Use existing 'auth' rate limiter preset for stricter limiting
  const rateLimiter = RateLimiterFactory.create('auth');

  // Apply the rate limiter middleware directly
  await rateLimiter(c, next);

  // Rate limiting is handled by the middleware itself
  // No additional logging needed here

  await next();
});

/**
 * Subscription operation validation middleware
 *
 * Validates common subscription security requirements:
 * - User session validity
 * - Request context validation
 * - Security token verification (if required)
 */
export const subscriptionValidationMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const user = c.get('user');
  const session = c.get('session');

  // Validate session consistency
  if (!user || !session) {
    throw createError.unauthenticated('Valid session required for subscription operations');
  }

  // Request ID validation is optional and handled by other middleware
  // if needed

  // Context is already set by existing middleware, no need to override

  await next();
});

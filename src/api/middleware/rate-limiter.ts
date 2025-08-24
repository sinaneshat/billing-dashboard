import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiEnv } from '@/api/types';

// Rate limit configuration
type RateLimitConfig = {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (c: Context<ApiEnv>) => string; // Function to generate rate limit key
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  message?: string; // Custom error message
};

// Default configurations for different operation types
export const RATE_LIMIT_CONFIGS = {
  // Storage upload limits
  storageUpload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100, // 100 uploads per hour
    message: 'Too many upload requests. Please try again later.',
  },
  // Storage read limits
  storageRead: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // 300 reads per minute
    message: 'Too many read requests. Please slow down.',
  },
  // Storage delete limits
  storageDelete: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 deletions per hour
    message: 'Too many deletion requests. Please try again later.',
  },
  // Image processing limits
  imageUpload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 image uploads per hour
    message: 'Image upload limit reached. Please try again later.',
  },
  // API general limits
  apiGeneral: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests. Please slow down.',
  },
} as const;

// Storage for rate limit counters (in production, use Redis or D1)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;

if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60 * 1000); // Clean up every minute
}

// Export cleanup function for testing
export function clearRateLimitInterval() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return createMiddleware<ApiEnv>(async (c, next) => {
    // Generate rate limit key
    const keyGenerator = config.keyGenerator || ((ctx) => {
      const user = ctx.get('user');
      const session = ctx.get('session');
      const ip = ctx.req.header('cf-connecting-ip')
        || ctx.req.header('x-forwarded-for')
        || 'unknown';

      // Prefer user ID, fall back to session ID, then IP
      if (user?.id)
        return `user:${user.id}`;
      if (session?.userId)
        return `session:${session.userId}`;
      return `ip:${ip}`;
    });

    const key = keyGenerator(c);
    const now = Date.now();
    // const _windowStart = now - config.windowMs; // Unused - kept for future debugging

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      const res = new Response(
        JSON.stringify({
          code: HttpStatusCodes.TOO_MANY_REQUESTS,
          message: config.message || 'Too many requests',
          retryAfter,
        }),
        {
          status: HttpStatusCodes.TOO_MANY_REQUESTS,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
          },
        },
      );

      throw new HTTPException(HttpStatusCodes.TOO_MANY_REQUESTS, { res });
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
    c.header('X-RateLimit-Reset', entry.resetTime.toString());

    try {
      await next();

      // Optionally skip counting successful requests
      if (config.skipSuccessfulRequests) {
        entry.count--;
      }
    } catch (error) {
      // Optionally skip counting failed requests
      if (config.skipFailedRequests) {
        entry.count--;
      }
      throw error;
    }
  });
}

/**
 * Storage-specific rate limiter that considers operation type
 */
export const storageRateLimiter = createMiddleware<ApiEnv>(async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;

  // Determine rate limit config based on operation
  let config: RateLimitConfig;

  if (path.includes('/images/')) {
    // Image uploads have stricter limits
    config = {
      ...RATE_LIMIT_CONFIGS.imageUpload,
      keyGenerator: (ctx) => {
        const u = ctx.get('user');
        return u?.id ? `image:${u.id}` : 'image:anonymous';
      },
    };
  } else if (method === 'PUT' || method === 'POST') {
    // Upload operations
    config = {
      ...RATE_LIMIT_CONFIGS.storageUpload,
      keyGenerator: (ctx) => {
        const u = ctx.get('user');
        // TODO: Organization support not implemented in Better Auth yet
        // const org = ctx.get('session')?.activeOrganizationId;
        return `upload:user:${u?.id || 'anonymous'}`;
      },
    };
  } else if (method === 'DELETE') {
    // Delete operations
    config = {
      ...RATE_LIMIT_CONFIGS.storageDelete,
      keyGenerator: (ctx) => {
        const u = ctx.get('user');
        return `delete:${u?.id || 'anonymous'}`;
      },
    };
  } else {
    // Read operations
    config = RATE_LIMIT_CONFIGS.storageRead;
  }

  // Apply the rate limiter
  const limiter = createRateLimiter(config);
  return limiter(c, next);
});

/**
 * Organization-level storage quota enforcement
 */
export const storageQuotaLimiter = createMiddleware<ApiEnv>(async (c, next) => {
  const method = c.req.method;
  const session = c.get('session');
  const fileSize = c.get('fileSize');

  // Only check for upload operations
  if (method !== 'PUT' && method !== 'POST') {
    return next();
  }

  // Skip if no organization context
  if (!session?.activeOrganizationId) {
    return next();
  }

  // In production, check organization storage quota from database
  // For now, we'll use a simple in-memory check
  const orgQuotaKey = `quota:${session.activeOrganizationId}`;
  const quotaLimit = 1024 * 1024 * 1024; // 1GB per organization

  // This would be fetched from database in production
  const currentUsage = rateLimitStore.get(orgQuotaKey)?.count || 0;

  if (currentUsage + (fileSize || 0) > quotaLimit) {
    throw new HTTPException(HttpStatusCodes.INSUFFICIENT_STORAGE, {
      message: 'Organization storage quota exceeded',
    });
  }

  // Update usage (in production, this would be done after successful upload)
  if (fileSize) {
    rateLimitStore.set(orgQuotaKey, {
      count: currentUsage + fileSize,
      resetTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  return next();
});

/**
 * IP-based rate limiter for additional security
 */
export const ipRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes per IP
  message: 'Too many requests from this IP address',
  keyGenerator: (c) => {
    const ip = c.req.header('cf-connecting-ip')
      || c.req.header('x-forwarded-for')
      || 'unknown';
    return `ip:${ip}`;
  },
});

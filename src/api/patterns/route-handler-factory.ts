/**
 * Route Handler Factory Pattern
 *
 * This factory eliminates boilerplate code and provides consistent patterns
 * for authentication, validation, transaction management, and error handling.
 *
 * Features:
 * - Type-safe handler creation
 * - Automatic authentication middleware
 * - Transaction management
 * - Standardized error handling
 * - Request/response validation
 * - Logging and observability
 */

import type { RouteConfig, RouteHandler } from '@hono/zod-openapi';
import type { Context, Env } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { z } from 'zod';

import { createError, ValidationError } from '@/api/common/error-handling';
import type { ErrorStatus } from '@/api/common/responses';
import { created, error, ok } from '@/api/common/responses';
import { safeValidate } from '@/api/common/zod-validation-utils';
import { attachSession, requireMasterKey, requireSession } from '@/api/middleware/auth';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';
import type { LogContext, TypedLogger } from '@/api/types/logger';
import { db } from '@/db';
// Based on official Drizzle ORM transaction patterns - tx parameter is inferred
// This follows the exact pattern from Drizzle docs where tx type is inferred by the transaction callback

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AuthMode = 'session' | 'api-key' | 'session-optional' | 'public';

export type CacheConfig = {
  ttl: number; // seconds
  key?: (c: Context) => string;
};

export type RateLimitConfig = {
  requests: number;
  window: number; // seconds
  key?: (c: Context) => string;
};

export type HandlerConfig<_TRoute extends RouteConfig> = {
  // Authentication
  auth?: AuthMode;

  // Validation
  validateBody?: boolean | z.ZodSchema;
  validateQuery?: boolean | z.ZodSchema;
  validateParams?: boolean | z.ZodSchema;

  // Database
  useTransaction?: boolean;

  // Performance
  cache?: CacheConfig;
  rateLimit?: RateLimitConfig;

  // Error Boundaries
  fallbackResponse?: (error: Error, context: Context) => Promise<Response> | Response;
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
    retryableErrors: string[];
  };
  circuitBreakerEnabled?: boolean;
  gracefulDegradation?: boolean;
  sizeLimits?: {
    requestBody?: number;
    responseBody?: number;
  };

  // Observability
  operationName?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics?: boolean;
};

// Type-safe validated data interface
export type ValidatedData = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

// HandlerContext extends Context with typed validated data and logger
export type HandlerContext<TEnv extends Env = ApiEnv> = Context<TEnv> & {
  validated: ValidatedData;
  logger: TypedLogger;
};

// Transaction handler with inferred tx type following Drizzle patterns
export type TransactionHandler<_TRoute extends RouteConfig, TEnv extends Env = ApiEnv> = (
  c: HandlerContext<TEnv>,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
) => Promise<Response>;

export type RegularHandler<_TRoute extends RouteConfig, TEnv extends Env = ApiEnv> = (
  c: HandlerContext<TEnv>
) => Promise<Response>;

// Error boundary types
export type ErrorBoundaryResult = {
  shouldRetry: boolean;
  shouldFallback: boolean;
  shouldCircuitBreak: boolean;
  delay?: number;
};

export type ErrorClassification = {
  type: 'validation' | 'authentication' | 'authorization' | 'external_service' | 'database' | 'internal' | 'rate_limit' | 'size_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  isClientError: boolean;
};

// ============================================================================
// ERROR BOUNDARY UTILITIES
// ============================================================================

// Unused function removed

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createLogger(c: Context, operation: string) {
  const requestId = c.get('requestId') || 'unknown';
  const userId = c.get('user')?.id || 'anonymous';

  const context = {
    requestId,
    userId,
    method: c.req.method,
    path: c.req.path,
    operation,
  };

  return {
    debug: (message: string, data?: LogContext) => {
      apiLogger.debug(`${operation}: ${message}`, { ...context, ...data });
    },
    info: (message: string, data?: LogContext) => {
      apiLogger.info(`${operation}: ${message}`, { ...context, ...data });
    },
    warn: (message: string, data?: LogContext) => {
      apiLogger.warn(`${operation}: ${message}`, { ...context, ...data });
    },
    error: (message: string, error?: Error, data?: LogContext) => {
      apiLogger.error(`${operation}: ${message}`, { ...context, ...data, error });
    },
  };
}

async function applyAuthentication(c: Context, authMode: AuthMode): Promise<void> {
  switch (authMode) {
    case 'session':
      await requireSession(c, async () => {});
      break;
    case 'api-key':
      await requireMasterKey(c, async () => {});
      break;
    case 'session-optional':
      await attachSession(c, async () => {});
      break;
    case 'public':
      // No authentication required
      break;
    default:
      throw new Error(`Unknown auth mode: ${authMode}`);
  }
}

async function validateRequest(
  c: Context,
  config: {
    validateBody?: boolean | z.ZodSchema;
    validateQuery?: boolean | z.ZodSchema;
    validateParams?: boolean | z.ZodSchema;
  },
): Promise<ValidatedData> {
  const validated: ValidatedData = {};

  // Validate body for POST/PUT/PATCH requests
  if (config.validateBody && ['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    try {
      const body = await c.req.json();
      // Only validate if a schema is provided (not just true)
      if (typeof config.validateBody === 'object') {
        const result = safeValidate(config.validateBody, body);
        if (!result.success) {
          throw new ValidationError({
            message: 'Request body validation failed',
            validationErrors: result.errors,
          });
        }
        validated.body = result.data;
      } else {
        // If validateBody is true but no schema, just store the body
        validated.body = body;
      }
    } catch (error) {
      if (error instanceof ValidationError)
        throw error;
      throw new ValidationError({
        message: 'Invalid request body format',
        validationErrors: [{ field: 'body', message: 'Unable to parse request body' }],
      });
    }
  }

  // Validate query parameters
  if (config.validateQuery) {
    const url = new URL(c.req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    if (typeof config.validateQuery === 'object') {
      const result = safeValidate(config.validateQuery, query);
      if (!result.success) {
        throw new ValidationError({
          message: 'Query parameter validation failed',
          validationErrors: result.errors,
        });
      }
      validated.query = result.data;
    } else {
      // If validateQuery is true but no schema, just store the query
      validated.query = query;
    }
  }

  // Validate path parameters
  if (config.validateParams) {
    const params = c.req.param();
    if (typeof config.validateParams === 'object') {
      const result = safeValidate(config.validateParams, params);
      if (!result.success) {
        throw new ValidationError({
          message: 'Path parameter validation failed',
          validationErrors: result.errors,
        });
      }
      validated.params = result.data;
    } else {
      // If validateParams is true but no schema, just store the params
      validated.params = params;
    }
  }

  return validated;
}

// ============================================================================
// HANDLER FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a route handler with standardized patterns
 * For handlers that need database transactions
 */
export function createHandlerWithTransaction<TRoute extends RouteConfig, TEnv extends Env = ApiEnv>(
  config: HandlerConfig<TRoute>,
  implementation: TransactionHandler<TRoute, TEnv>,
): RouteHandler<TRoute, TEnv> {
  const handler = async (c: Context<TEnv>) => {
    const operationName = config.operationName || `${c.req.method} ${c.req.path}`;
    const logger = createLogger(c, operationName);

    const startTime = Date.now();
    logger.debug('Handler started');

    try {
      // Apply authentication
      if (config.auth && config.auth !== 'public') {
        logger.debug('Applying authentication', { mode: config.auth });
        await applyAuthentication(c, config.auth);
      }

      // Validate request
      logger.debug('Validating request');
      const validated = await validateRequest(c, config);

      // Type-safe context enhancement
      const enhancedContext = Object.assign(c, {
        validated,
        logger,
      }) as HandlerContext<TEnv>;

      // Execute with transaction - cast to handle dual database setup (better-sqlite3 + D1)
      logger.debug('Starting database transaction');
      // eslint-disable-next-line ts/no-explicit-any
      const result = await (db.transaction as any)(async (tx: any) => {
        return await implementation(enhancedContext, tx);
      });

      const duration = Date.now() - startTime;
      logger.info('Handler completed successfully', { duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Handler failed', error as Error, { duration });

      if (error instanceof HTTPException) {
        throw error;
      }

      if (error instanceof ValidationError) {
        throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
          message: error.message,
          cause: error,
        });
      }

      throw createError.internal('Handler execution failed', {
        operation: operationName,
        duration,
      });
    }
  };

  return handler as unknown as RouteHandler<TRoute, TEnv>;
}

/**
 * Create a route handler with standardized patterns
 * For handlers that don't need database transactions
 */
export function createHandler<TRoute extends RouteConfig, TEnv extends Env = ApiEnv>(
  config: HandlerConfig<TRoute>,
  implementation: RegularHandler<TRoute, TEnv>,
): RouteHandler<TRoute, TEnv> {
  const handler = async (c: Context<TEnv>) => {
    const operationName = config.operationName || `${c.req.method} ${c.req.path}`;
    const logger = createLogger(c, operationName);

    const startTime = Date.now();
    logger.debug('Handler started');

    try {
      // Apply authentication
      if (config.auth && config.auth !== 'public') {
        logger.debug('Applying authentication', { mode: config.auth });
        await applyAuthentication(c, config.auth);
      }

      // Validate request
      logger.debug('Validating request');
      const validated = await validateRequest(c, config);

      // Type-safe context enhancement
      const enhancedContext = Object.assign(c, {
        validated,
        logger,
      }) as HandlerContext<TEnv>;

      // Execute handler
      logger.debug('Executing handler implementation');
      const result = await implementation(enhancedContext);

      const duration = Date.now() - startTime;
      logger.info('Handler completed successfully', { duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Handler failed', error as Error, { duration });

      if (error instanceof HTTPException) {
        throw error;
      }

      if (error instanceof ValidationError) {
        throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
          message: error.message,
          cause: error,
        });
      }

      throw createError.internal('Handler execution failed', {
        operation: operationName,
        duration,
      });
    }
  };

  return handler as unknown as RouteHandler<TRoute, TEnv>;
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Standardized response helpers that integrate with the handler factory
 */
export const Response = {
  success: <T>(c: HandlerContext, data: T, _meta?: LogContext) => {
    c.logger.debug('Returning success response');
    return ok(c, data, undefined);
  },

  created: <T>(c: HandlerContext, data: T, _meta?: LogContext) => {
    c.logger.debug('Returning created response');
    return created(c, data, undefined);
  },

  paginated: <T>(
    c: HandlerContext,
    items: T[],
    pagination: { page: number; limit: number; total: number },
  ) => {
    const paginationMeta = {
      ...pagination,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1,
    };

    c.logger.debug('Returning paginated response', {
      itemCount: items.length,
      pagination: paginationMeta,
    });

    return ok(c, {
      items,
      pagination: paginationMeta,
    });
  },

  error: (c: HandlerContext, message: string, status = HttpStatusCodes.BAD_REQUEST, details?: unknown) => {
    c.logger.warn('Returning error response', { message, status, details });
    return error(c, status as ErrorStatus, message, details);
  },
};

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

export const CommonSchemas = {
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  uuid: z.string().uuid(),

  id: z.string().min(1),

  search: z.object({
    search: z.string().min(1).optional(),
  }),
};

// ============================================================================
// USAGE EXAMPLES AND TYPES
// ============================================================================

/**
 * Example usage for a simple GET endpoint
 */
export function exampleGetHandler() {
  return createHandler(
    {
      auth: 'session',
      validateQuery: CommonSchemas.pagination,
      operationName: 'GetUserPayments',
    },
    async (c) => {
      const user = c.get('user')!;
      const { page, limit } = c.validated.query as { page: number; limit: number };

      c.logger.info('Fetching user payments', { userId: user.id, page, limit });

      // Your implementation here
      const payments: unknown[] = [];
      const total = 0;

      return Response.paginated(c, payments, { page, limit, total });
    },
  );
}

/**
 * Example usage for a POST endpoint with transaction
 */
export function exampleCreateHandler() {
  return createHandlerWithTransaction(
    {
      auth: 'session',
      validateBody: z.object({
        amount: z.number().positive(),
        description: z.string().min(1),
      }),
      operationName: 'CreatePayment',
    },
    async (c, _tx) => {
      const user = c.get('user')!;
      const { amount, description } = c.validated.body as { amount: number; description: string };

      c.logger.info('Creating payment', { userId: user.id, amount, description });

      // Your transaction implementation here
      // Use tx instead of db for all database operations

      const payment = { id: 'payment-id', amount, description };

      return Response.created(c, payment);
    },
  );
}

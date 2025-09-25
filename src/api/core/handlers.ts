/**
 * Unified Handler System - Context7 Best Practices
 *
 * Modern, type-safe route handler factory following official HONO patterns.
 * Replaces the existing route-handler-factory with improved type safety.
 *
 * Features:
 * - Maximum type safety with proper inference
 * - Integrated validation system
 * - Consistent error handling
 * - Transaction management
 * - OpenAPI compatibility
 */

import type { RouteConfig, RouteHandler } from '@hono/zod-openapi';
import type { Context, Env } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { z } from 'zod';

import type { ErrorCode } from '@/api/common/error-handling';
import { AppError } from '@/api/common/error-handling';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';
// Database access should be handled by individual handlers
import { getDbAsync } from '@/db';

import { HTTPExceptionFactory } from './http-exceptions';
import { Responses } from './responses';
import type { LoggerData } from './schemas';
import {
  IdParamSchema,
  ListQuerySchema,
  PaginationQuerySchema,
  SearchQuerySchema,
  SortingQuerySchema,
  UuidParamSchema,
} from './schemas';
import { validateWithSchema } from './validation';

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Simple performance tracking utility for request timing
 */
function createPerformanceTracker() {
  const startTime = Date.now();
  const marks: Record<string, number> = {};

  return {
    startTime,
    getElapsed: () => Date.now() - startTime,
    getDuration: () => Date.now() - startTime,
    mark: (label: string) => {
      const time = Date.now() - startTime;
      marks[label] = time;
      return { label, time };
    },
    getMarks: () => ({ ...marks }),
    now: () => Date.now(),
  };
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AuthMode = 'session' | 'session-optional' | 'public' | 'api-key';

export type HandlerConfig<
  _TRoute extends RouteConfig,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
> = {
  // Authentication
  auth?: AuthMode;

  // Validation schemas
  validateBody?: TBody;
  validateQuery?: TQuery;
  validateParams?: TParams;

  // Database
  useTransaction?: boolean;

  // Observability
  operationName?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

};

// Enhanced context with validated data and logger
export type HandlerContext<
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
> = Context<TEnv> & {
  validated: {
    body: [TBody] extends [never] ? undefined : z.infer<TBody>;
    query: [TQuery] extends [never] ? undefined : z.infer<TQuery>;
    params: [TParams] extends [never] ? undefined : z.infer<TParams>;
  };
  logger: {
    debug: (message: string, data?: LoggerData) => void;
    info: (message: string, data?: LoggerData) => void;
    warn: (message: string, data?: LoggerData) => void;
    error: (message: string, error?: Error, data?: LoggerData) => void;
  };
};

// Handler function types
export type RegularHandler<
  _TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
> = (
  c: HandlerContext<TEnv, TBody, TQuery, TParams>
) => Promise<Response>;

/**
 * @deprecated Use BatchHandler instead. D1 doesn't support transactions.
 * This is now an alias for BatchHandler for backward compatibility.
 */
export type TransactionHandler<
  TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
> = BatchHandler<TRoute, TEnv, TBody, TQuery, TParams>;

/**
 * D1 Batch Context - Provides utilities for building batch operations
 */
export type BatchContext = {
  /** Add a prepared statement to the batch */
  add: (statement: unknown) => void;
  /** Execute all statements in the batch and return results */
  execute: () => Promise<unknown[]>;
  /** Get the database instance for read operations */
  db: Awaited<ReturnType<typeof getDbAsync>>;
};

export type BatchHandler<
  _TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
> = (
  c: HandlerContext<TEnv, TBody, TQuery, TParams>,
  batch: BatchContext
) => Promise<Response>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create an enhanced logger for the operation
 */
function createOperationLogger(c: Context, operation: string) {
  const requestId = c.get('requestId') || 'unknown';
  const userId = c.get('user')?.id || 'anonymous';

  const baseContext = {
    requestId,
    userId,
    method: c.req.method,
    path: c.req.path,
    operation,
  };

  return {
    debug: (message: string, data?: LoggerData) => {
      apiLogger.debug(`${operation}: ${message}`, { ...baseContext, ...data });
    },
    info: (message: string, data?: LoggerData) => {
      apiLogger.info(`${operation}: ${message}`, { ...baseContext, ...data });
    },
    warn: (message: string, data?: LoggerData) => {
      apiLogger.warn(`${operation}: ${message}`, { ...baseContext, ...data });
    },
    error: (message: string, error?: Error, data?: LoggerData) => {
      apiLogger.error(`${operation}: ${message}`, {
        ...baseContext,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
        ...data,
      });
    },
  };
}

/**
 * Apply authentication check based on mode
 * Properly implements authentication without incorrect middleware calls
 */
async function applyAuthentication(c: Context, authMode: AuthMode): Promise<void> {
  const { auth } = await import('@/lib/auth/server');

  switch (authMode) {
    case 'session': {
      // Require valid session - throw error if not authenticated
      const sessionData = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!sessionData?.user || !sessionData?.session) {
        throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
          message: 'Authentication required',
        });
      }

      // Set authenticated session context
      c.set('session', sessionData.session);
      c.set('user', sessionData.user);
      c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());
      break;
    }
    case 'session-optional': {
      // Optional session - don't throw error if not authenticated
      try {
        const sessionData = await auth.api.getSession({
          headers: c.req.raw.headers,
        });

        if (sessionData?.user && sessionData?.session) {
          c.set('session', sessionData.session);
          c.set('user', sessionData.user);
        } else {
          c.set('session', null);
          c.set('user', null);
        }
        c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());
      } catch (error) {
        // Log error but don't throw - allow unauthenticated requests
        apiLogger.error('[Auth] Error retrieving session', error instanceof Error ? error : new Error(String(error)));
        c.set('session', null);
        c.set('user', null);
      }
      break;
    }
    case 'api-key': {
      // API key authentication for cron jobs and external services
      const apiKey = c.req.header('x-api-key') || c.req.header('authorization')?.replace('Bearer ', '');
      const expectedApiKey = process.env.CRON_SECRET || process.env.API_SECRET_KEY;

      if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
        throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
          message: 'Invalid or missing API key',
        });
      }

      // Set system context for API key authenticated requests
      c.set('session', null);
      c.set('user', null);
      c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());
      break;
    }
    case 'public':
      // No authentication required
      c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());
      break;
    default:
      throw new Error(`Unknown auth mode: ${authMode}`);
  }
}

/**
 * Validate request data using our unified validation system
 */
async function validateRequest<
  TBody extends z.ZodSchema,
  TQuery extends z.ZodSchema,
  TParams extends z.ZodSchema,
>(
  c: Context,
  config: Pick<HandlerConfig<RouteConfig, TBody, TQuery, TParams>, 'validateBody' | 'validateQuery' | 'validateParams'>,
): Promise<{
    body: [TBody] extends [never] ? undefined : z.infer<TBody>;
    query: [TQuery] extends [never] ? undefined : z.infer<TQuery>;
    params: [TParams] extends [never] ? undefined : z.infer<TParams>;
  }> {
  const validated: {
    body?: [TBody] extends [never] ? undefined : z.infer<TBody>;
    query?: [TQuery] extends [never] ? undefined : z.infer<TQuery>;
    params?: [TParams] extends [never] ? undefined : z.infer<TParams>;
  } = {};

  // Validate body for POST/PUT/PATCH requests
  if (config.validateBody && ['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    try {
      const body = await c.req.json();
      const result = validateWithSchema(config.validateBody, body);

      if (!result.success) {
        throw HTTPExceptionFactory.unprocessableEntity({
          message: 'Request body validation failed',
          details: { validationErrors: result.errors },
        });
      }

      validated.body = result.data as [TBody] extends [never] ? undefined : z.infer<TBody>;
    } catch (error) {
      if (error instanceof HTTPException)
        throw error;

      throw HTTPExceptionFactory.unprocessableEntity({
        message: 'Invalid request body format',
        details: { validationErrors: [{ field: 'body', message: 'Unable to parse request body' }] },
      });
    }
  }

  // Validate query parameters
  if (config.validateQuery) {
    const url = new URL(c.req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const result = validateWithSchema(config.validateQuery, query);

    if (!result.success) {
      throw HTTPExceptionFactory.unprocessableEntity({
        message: 'Query parameter validation failed',
        details: { validationErrors: result.errors },
      });
    }

    validated.query = result.data as [TQuery] extends [never] ? undefined : z.infer<TQuery>;
  }

  // Validate path parameters
  if (config.validateParams) {
    const params = c.req.param();
    const result = validateWithSchema(config.validateParams, params);

    if (!result.success) {
      throw HTTPExceptionFactory.unprocessableEntity({
        message: 'Path parameter validation failed',
        details: { validationErrors: result.errors },
      });
    }

    validated.params = result.data as [TParams] extends [never] ? undefined : z.infer<TParams>;
  }

  return validated as {
    body: [TBody] extends [never] ? undefined : z.infer<TBody>;
    query: [TQuery] extends [never] ? undefined : z.infer<TQuery>;
    params: [TParams] extends [never] ? undefined : z.infer<TParams>;
  };
}

// ============================================================================
// HANDLER FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a route handler without database transactions
 */
export function createHandler<
  TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
>(
  config: HandlerConfig<TRoute, TBody, TQuery, TParams>,
  implementation: RegularHandler<TRoute, TEnv, TBody, TQuery, TParams>,
): RouteHandler<TRoute, TEnv> {
  const handler = async (c: Context<TEnv>) => {
    const operationName = config.operationName || `${c.req.method} ${c.req.path}`;
    const logger = createOperationLogger(c, operationName);
    const performance = createPerformanceTracker();

    // Set start time in context for response metadata
    (c as Context & { set: (key: string, value: unknown) => void }).set('startTime', performance.startTime);

    logger.debug('Handler started');

    try {
      // Apply authentication
      if (config.auth && config.auth !== 'public') {
        logger.debug('Applying authentication', { logType: 'auth', mode: config.auth });
        await applyAuthentication(c, config.auth);
      }

      // Validate request
      logger.debug('Validating request');
      const validated = await validateRequest<TBody, TQuery, TParams>(c, config);

      // Create enhanced context
      const enhancedContext = Object.assign(c, {
        validated,
        logger,
      }) as HandlerContext<TEnv, TBody, TQuery, TParams>;

      // Execute handler implementation
      logger.debug('Executing handler implementation');
      const result = await implementation(enhancedContext);

      logger.info('Handler completed successfully');

      return result;
    } catch (error) {
      logger.error('Handler failed', error as Error);

      if (error instanceof HTTPException) {
        // Handle validation errors with our unified system
        if (error.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
          // Check for EnhancedHTTPException with details
          if ('details' in error && error.details && typeof error.details === 'object') {
            const details = error.details as { validationErrors?: Array<{ field: string; message: string; code?: string }> };
            if (details.validationErrors) {
              return Responses.validationError(c, details.validationErrors, error.message);
            }
          } else if (error.cause && typeof error.cause === 'object') {
            const cause = error.cause as { validationErrors?: Array<{ field: string; message: string; code?: string }> };
            if (cause.validationErrors) {
              return Responses.validationError(c, cause.validationErrors, error.message);
            }
          }
        }
        throw error;
      }

      if (error instanceof AppError) {
        // Convert AppError instances to appropriate HTTP responses
        switch (error.code) {
          case 'PAYMENT_METHOD_INVALID':
          case 'CONTRACT_NOT_ACTIVE':
          case 'PAYMENT_FAILED':
            return Responses.paymentError(c, error.message, 'other');
          case 'RESOURCE_NOT_FOUND':
            return Responses.notFound(c, 'Resource');
          case 'RESOURCE_CONFLICT':
          case 'RESOURCE_ALREADY_EXISTS':
            return Responses.conflict(c, error.message);
          case 'UNAUTHENTICATED':
          case 'TOKEN_EXPIRED':
          case 'TOKEN_INVALID':
            return Responses.authenticationError(c, error.message);
          case 'UNAUTHORIZED':
          case 'INSUFFICIENT_PERMISSIONS':
            return Responses.authorizationError(c, error.message);
          case 'VALIDATION_ERROR':
          case 'INVALID_INPUT':
            return Responses.badRequest(c, error.message, error.details);
          case 'DATABASE_ERROR':
            return Responses.databaseError(c, 'batch', error.message);
          case 'ZARINPAL_ERROR':
            return Responses.externalServiceError(c, 'ZarinPal', error.message);
          case 'EXTERNAL_SERVICE_ERROR':
            return Responses.externalServiceError(c, 'External Service', error.message);
          default:
            // For internal server errors and other unknown AppError codes
            return Responses.internalServerError(c, error.message, operationName);
        }
      }

      // Convert other errors to internal server error
      return Responses.internalServerError(c, 'Handler execution failed', operationName);
    }
  };

  return handler as unknown as RouteHandler<TRoute, TEnv>;
}

/**
 * Create a route handler with database batch operations
 * @deprecated Use createHandlerWithBatch instead. D1 doesn't support transactions.
 * This is now an alias for createHandlerWithBatch for backward compatibility.
 */
export function createHandlerWithTransaction<
  TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
>(
  config: HandlerConfig<TRoute, TBody, TQuery, TParams>,
  implementation: BatchHandler<TRoute, TEnv, TBody, TQuery, TParams>,
): RouteHandler<TRoute, TEnv> {
  // D1 doesn't support transactions, so redirect to batch operations
  return createHandlerWithBatch(config, implementation);
}

/**
 * Create a route handler with D1 batch operations
 *
 * CRITICAL: This is the ONLY recommended handler pattern for D1 databases.
 * D1 requires batch operations instead of transactions for optimal performance.
 *
 * Features:
 * - Atomic execution: All operations succeed or all fail
 * - Automatic rollback: No partial state on failure
 * - Single network round-trip: Optimized for edge environments
 * - Implicit transactions: No explicit BEGIN/COMMIT needed
 *
 * @see /docs/d1-batch-operations.md for comprehensive patterns
 */
export function createHandlerWithBatch<
  TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
>(
  config: HandlerConfig<TRoute, TBody, TQuery, TParams>,
  implementation: BatchHandler<TRoute, TEnv, TBody, TQuery, TParams>,
): RouteHandler<TRoute, TEnv> {
  const handler = async (c: Context<TEnv>) => {
    const operationName = config.operationName || `${c.req.method} ${c.req.path}`;
    const logger = createOperationLogger(c, operationName);
    const performance = createPerformanceTracker();

    // Set start time in context for response metadata
    (c as Context & { set: (key: string, value: unknown) => void }).set('startTime', performance.startTime);

    logger.debug('D1 batch handler started', {
      logType: 'api' as const,
      method: c.req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      path: c.req.path,
    } as LoggerData);

    try {
      // Apply authentication
      if (config.auth && config.auth !== 'public') {
        logger.debug('Applying authentication', { logType: 'auth', mode: config.auth });
        await applyAuthentication(c, config.auth);
      }

      // Validate request
      logger.debug('Validating request');
      const validated = await validateRequest<TBody, TQuery, TParams>(c, config);

      // Create enhanced context
      const enhancedContext = Object.assign(c, {
        validated,
        logger,
      }) as HandlerContext<TEnv, TBody, TQuery, TParams>;

      // Execute implementation with D1 batch operations
      logger.debug('Preparing D1 batch operations');
      const db = await getDbAsync();

      // D1 batch operations collector - follows D1 best practices
      const statements: unknown[] = [];
      const batchMetrics = {
        addedCount: 0,
        maxBatchSize: 100, // D1 recommended limit
        startTime: performance.now(),
      };

      const batchContext: BatchContext = {
        add: (statement: unknown) => {
          // Validate batch size limit
          if (statements.length >= batchMetrics.maxBatchSize) {
            throw new AppError({
              message: `Batch size limit exceeded. Maximum ${batchMetrics.maxBatchSize} operations allowed per batch.`,
              code: 'BATCH_SIZE_EXCEEDED' as ErrorCode,
              statusCode: HttpStatusCodes.BAD_REQUEST,
              details: { currentSize: statements.length },
            });
          }

          statements.push(statement);
          batchMetrics.addedCount++;

          logger.debug('Statement added to batch', {
            logType: 'database' as const,
            operation: 'batch' as const,
            affected: statements.length,
          } as LoggerData);
        },
        execute: async (): Promise<unknown[]> => {
          if (statements.length === 0) {
            logger.debug('No statements to execute in batch');
            return [];
          }

          // Validate batch isn't too large
          if (statements.length > batchMetrics.maxBatchSize) {
            throw new AppError({
              message: `Cannot execute batch with ${statements.length} statements. Maximum is ${batchMetrics.maxBatchSize}.`,
              code: 'BATCH_SIZE_EXCEEDED' as ErrorCode,
              statusCode: HttpStatusCodes.BAD_REQUEST,
            });
          }

          logger.info('Executing D1 batch operation', {
            logType: 'operation' as const,
            operationName: 'D1Batch',
            resource: `batch-${statements.length}`,
          } as LoggerData);

          const batchStartTime = performance.now();

          try {
            // Execute atomic batch operation - D1 handles implicit transaction
            // All operations succeed or all fail - automatic rollback on failure
            // @ts-expect-error - D1 batch type issue with Drizzle ORM
            const results = await db.batch(statements);

            const batchDuration = performance.now() - batchStartTime;

            logger.info('D1 batch executed successfully', {
              logType: 'performance' as const,
              duration: batchDuration,
              dbQueries: statements.length,
            } as LoggerData);

            // Clear statements after successful execution
            statements.length = 0;

            return [...results] as unknown[];
          } catch (error) {
            const batchDuration = performance.now() - batchStartTime;

            // All operations automatically rolled back by D1
            logger.error('D1 batch execution failed - all operations rolled back', error as Error, {
              logType: 'database' as const,
              operation: 'batch' as const,
              affected: statements.length,
            } as LoggerData);

            // Enhance error with batch context
            if (error instanceof Error) {
              throw new AppError({
                message: `D1 batch operation failed: ${error.message}`,
                code: 'BATCH_FAILED' as ErrorCode,
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                details: {
                  statementCount: statements.length,
                  duration: batchDuration,
                  originalError: error.message,
                },
              });
            }

            throw error;
          }
        },
        db,
      };

      // Execute the handler implementation
      const result = await implementation(enhancedContext, batchContext);

      const duration = performance.getDuration();
      logger.info('D1 batch handler completed successfully', {
        logType: 'performance' as const,
        duration,
        marks: performance.getMarks(),
      } as LoggerData);

      return result;
    } catch (error) {
      const duration = performance.getDuration();
      logger.error('D1 batch handler failed', error as Error, {
        logType: 'performance' as const,
        duration,
      } as LoggerData);

      // Handle validation errors
      if (error instanceof HTTPException) {
        if (error.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
          if ('details' in error && error.details && typeof error.details === 'object') {
            const details = error.details as { validationErrors?: Array<{ field: string; message: string; code?: string }> };
            if (details.validationErrors) {
              return Responses.validationError(c, details.validationErrors, error.message);
            }
          }
        }
        throw error;
      }

      // Handle application errors
      if (error instanceof AppError) {
        switch (error.code) {
          case 'BATCH_FAILED':
          case 'BATCH_SIZE_EXCEEDED':
            return Responses.databaseError(c, 'batch', error.message);
          case 'DATABASE_ERROR':
            return Responses.databaseError(c, 'batch', error.message);
          case 'RESOURCE_NOT_FOUND':
            return Responses.notFound(c, 'Resource');
          case 'RESOURCE_CONFLICT':
            return Responses.conflict(c, error.message);
          default:
            return HTTPExceptionFactory.create(error.statusCode || 500, { message: error.message });
        }
      }

      // Handle D1-specific database errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // D1 constraint violations
        if (errorMessage.includes('unique constraint') || errorMessage.includes('unique_constraint')) {
          return Responses.conflict(c, 'Resource already exists (unique constraint violation)');
        }

        if (errorMessage.includes('foreign key') || errorMessage.includes('foreign_key')) {
          return Responses.badRequest(c, 'Invalid reference to related resource (foreign key constraint)');
        }

        // D1 batch-specific errors
        if (errorMessage.includes('batch')) {
          if (errorMessage.includes('timeout')) {
            return Responses.databaseError(c, 'batch', 'Batch operation timed out (30 second limit exceeded)');
          }
          if (errorMessage.includes('size') || errorMessage.includes('limit')) {
            return Responses.databaseError(c, 'batch', 'Batch size limit exceeded');
          }
          return Responses.databaseError(c, 'batch', 'Batch operation failed - all changes rolled back');
        }

        // D1 connection errors
        if (errorMessage.includes('d1') || errorMessage.includes('database')) {
          return Responses.databaseError(c, 'batch', 'Database operation failed');
        }
      }

      // Generic error fallback
      return Responses.internalServerError(c, 'An unexpected error occurred', operationName);
    }
  };

  return handler as unknown as RouteHandler<TRoute, TEnv>;
}

// ============================================================================
// RESPONSE HELPERS FOR HANDLERS
// ============================================================================

/**
 * Handler-specific response helpers with integrated logging
 */
export const HandlerResponses = {
  /**
   * Success response with automatic logging
   */
  success: <T>(c: HandlerContext, data: T, logMessage?: string) => {
    if (logMessage) {
      c.logger.info(logMessage, { logType: 'api', method: c.req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: c.req.path });
    }
    return Responses.ok(c, data);
  },

  /**
   * Created response with automatic logging
   */
  created: <T>(c: HandlerContext, data: T, logMessage?: string) => {
    if (logMessage) {
      c.logger.info(logMessage, { logType: 'api', method: c.req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: c.req.path });
    }
    return Responses.created(c, data);
  },

  /**
   * Paginated response with automatic logging
   */
  paginated: <T>(
    c: HandlerContext,
    items: T[],
    pagination: { page: number; limit: number; total: number },
    logMessage?: string,
  ) => {
    if (logMessage) {
      c.logger.info(logMessage, {
        logType: 'api',
        method: c.req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        path: c.req.path,
      });
    }
    return Responses.paginated(c, items, pagination);
  },

  /**
   * Error response with automatic logging
   */
  error: (c: HandlerContext, message: string, status = 400) => {
    c.logger.warn('Returning error response', {
      logType: 'api',
      method: c.req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      path: c.req.path,
      statusCode: status,
    });
    return Responses.badRequest(c, message);
  },
} as const;

// ============================================================================
// COMMON VALIDATION SCHEMAS FOR HANDLERS
// ============================================================================

/**
 * Common schemas for handler validation - using unified schema system
 * All schemas imported from './schemas' to eliminate duplication
 */
export const HandlerSchemas = {
  // Path parameters
  idParam: IdParamSchema,
  uuidParam: UuidParamSchema,

  // Query parameters
  pagination: PaginationQuerySchema,
  sorting: SortingQuerySchema,
  search: SearchQuerySchema,

  // Combined query schemas
  listQuery: ListQuerySchema,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Types are exported via the index.ts file to avoid conflicts

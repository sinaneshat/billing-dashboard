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
 * - Performance monitoring
 * - Transaction management
 * - OpenAPI compatibility
 */

import type { RouteConfig, RouteHandler } from '@hono/zod-openapi';
import type { Context, Env } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { z } from 'zod';

import { attachSession, requireMasterKey, requireSession } from '@/api/middleware/auth';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';

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
// TYPE DEFINITIONS
// ============================================================================

export type AuthMode = 'session' | 'api-key' | 'session-optional' | 'public';

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

  // Performance
  enableMetrics?: boolean;
  timeout?: number;
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
  performance: {
    startTime: number;
    markTime: (label: string) => void;
    getDuration: () => number;
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

export type TransactionHandler<
  _TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
> = (
  c: HandlerContext<TEnv, TBody, TQuery, TParams>,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
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
 * Create performance tracking utilities
 */
function createPerformanceTracker() {
  const startTime = Date.now();
  const marks: Record<string, number> = {};

  return {
    startTime,
    markTime: (label: string) => {
      marks[label] = Date.now() - startTime;
    },
    getDuration: () => Date.now() - startTime,
    getMarks: () => ({ ...marks }),
  };
}

/**
 * Apply authentication middleware based on mode
 */
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
        throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
          message: 'Request body validation failed',
          cause: { validationErrors: result.errors },
        });
      }

      validated.body = result.data as [TBody] extends [never] ? undefined : z.infer<TBody>;
    } catch (error) {
      if (error instanceof HTTPException)
        throw error;

      throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
        message: 'Invalid request body format',
        cause: { validationErrors: [{ field: 'body', message: 'Unable to parse request body' }] },
      });
    }
  }

  // Validate query parameters
  if (config.validateQuery) {
    const url = new URL(c.req.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const result = validateWithSchema(config.validateQuery, query);

    if (!result.success) {
      throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
        message: 'Query parameter validation failed',
        cause: { validationErrors: result.errors },
      });
    }

    validated.query = result.data as [TQuery] extends [never] ? undefined : z.infer<TQuery>;
  }

  // Validate path parameters
  if (config.validateParams) {
    const params = c.req.param();
    const result = validateWithSchema(config.validateParams, params);

    if (!result.success) {
      throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
        message: 'Path parameter validation failed',
        cause: { validationErrors: result.errors },
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
        performance.markTime('auth_start');
        logger.debug('Applying authentication', { logType: 'auth', mode: config.auth });
        await applyAuthentication(c, config.auth);
        performance.markTime('auth_complete');
      }

      // Validate request
      performance.markTime('validation_start');
      logger.debug('Validating request');
      const validated = await validateRequest<TBody, TQuery, TParams>(c, config);
      performance.markTime('validation_complete');

      // Create enhanced context
      const enhancedContext = Object.assign(c, {
        validated,
        logger,
        performance,
      }) as HandlerContext<TEnv, TBody, TQuery, TParams>;

      // Execute handler implementation
      performance.markTime('implementation_start');
      logger.debug('Executing handler implementation');
      const result = await implementation(enhancedContext);
      performance.markTime('implementation_complete');

      const duration = performance.getDuration();
      logger.info('Handler completed successfully', {
        logType: 'performance',
        duration,
        marks: performance.getMarks(),
      });

      return result;
    } catch (error) {
      const duration = performance.getDuration();
      logger.error('Handler failed', error as Error, { logType: 'performance', duration });

      if (error instanceof HTTPException) {
        // Handle validation errors with our unified system
        if (error.status === HttpStatusCodes.UNPROCESSABLE_ENTITY && error.cause) {
          const cause = error.cause as { validationErrors?: Array<{ field: string; message: string; code?: string }> };
          if (cause.validationErrors) {
            return Responses.validationError(c, cause.validationErrors, error.message);
          }
        }
        throw error;
      }

      // Convert other errors to internal server error
      return Responses.internalServerError(c, 'Handler execution failed', operationName);
    }
  };

  return handler as unknown as RouteHandler<TRoute, TEnv>;
}

/**
 * Create a route handler with database transaction
 */
export function createHandlerWithTransaction<
  TRoute extends RouteConfig,
  TEnv extends Env = ApiEnv,
  TBody extends z.ZodSchema = never,
  TQuery extends z.ZodSchema = never,
  TParams extends z.ZodSchema = never,
>(
  config: HandlerConfig<TRoute, TBody, TQuery, TParams>,
  implementation: TransactionHandler<TRoute, TEnv, TBody, TQuery, TParams>,
): RouteHandler<TRoute, TEnv> {
  const handler = async (c: Context<TEnv>) => {
    const operationName = config.operationName || `${c.req.method} ${c.req.path}`;
    const logger = createOperationLogger(c, operationName);
    const performance = createPerformanceTracker();

    // Set start time in context for response metadata
    (c as Context & { set: (key: string, value: unknown) => void }).set('startTime', performance.startTime);

    logger.debug('Transaction handler started');

    try {
      // Apply authentication
      if (config.auth && config.auth !== 'public') {
        performance.markTime('auth_start');
        logger.debug('Applying authentication', { logType: 'auth', mode: config.auth });
        await applyAuthentication(c, config.auth);
        performance.markTime('auth_complete');
      }

      // Validate request
      performance.markTime('validation_start');
      logger.debug('Validating request');
      const validated = await validateRequest<TBody, TQuery, TParams>(c, config);
      performance.markTime('validation_complete');

      // Create enhanced context
      const enhancedContext = Object.assign(c, {
        validated,
        logger,
        performance,
      }) as HandlerContext<TEnv, TBody, TQuery, TParams>;

      // Execute with transaction
      performance.markTime('transaction_start');
      logger.debug('Starting database transaction');

      // Type-safe transaction execution
      let result!: Response;
      await db.transaction(async (tx) => {
        performance.markTime('implementation_start');
        result = await implementation(enhancedContext, tx);
      });

      performance.markTime('transaction_complete');

      const duration = performance.getDuration();
      logger.info('Transaction handler completed successfully', {
        logType: 'performance',
        duration,
        marks: performance.getMarks(),
      });

      return result;
    } catch (error) {
      const duration = performance.getDuration();
      logger.error('Transaction handler failed', error as Error, { logType: 'performance', duration });

      if (error instanceof HTTPException) {
        // Handle validation errors with our unified system
        if (error.status === HttpStatusCodes.UNPROCESSABLE_ENTITY && error.cause) {
          const cause = error.cause as { validationErrors?: Array<{ field: string; message: string; code?: string }> };
          if (cause.validationErrors) {
            return Responses.validationError(c, cause.validationErrors, error.message);
          }
        }
        throw error;
      }

      // Convert database errors to appropriate responses
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        return Responses.conflict(c, 'Resource already exists');
      }

      if (error instanceof Error && error.message.includes('FOREIGN KEY constraint')) {
        return Responses.badRequest(c, 'Invalid reference to related resource');
      }

      // Generic database error
      return Responses.databaseError(c, 'transaction', 'Transaction failed');
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

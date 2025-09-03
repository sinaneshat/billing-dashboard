/**
 * Centralized Hono Logger Middleware
 * Provides structured logging for all API requests and responses
 * Uses Hono's official logger middleware with custom PrintFunc
 */

import type { Context } from 'hono';
import { logger } from 'hono/logger';

import type { LogContext, TypedLogger } from '@/api/types/logger';
import type { LogLevel } from '@/lib/utils/safe-logger';

// Environment detection for Cloudflare Workers
const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

/**
 * Custom structured logger for Hono API
 * Follows official Hono documentation patterns
 */
export class HonoLogger implements TypedLogger {
  private static instance: HonoLogger;

  private constructor() {}

  static getInstance(): HonoLogger {
    if (!HonoLogger.instance) {
      HonoLogger.instance = new HonoLogger();
    }
    return HonoLogger.instance;
  }

  /**
   * Safe logging that works in both development and Cloudflare Workers
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(context && { context }),
    };

    const formattedMessage = isDevelopment
      ? JSON.stringify(logEntry, null, 2)
      : JSON.stringify(logEntry);

    // Use appropriate console method based on level
    switch (level) {
      case 'DEBUG':
        if (isDevelopment) {
          console.warn(`[DEBUG] ${formattedMessage}`);
        }
        break;
      case 'INFO':
        console.warn(`[INFO] ${formattedMessage}`);
        break;
      case 'WARN':
        console.warn(`[WARN] ${formattedMessage}`);
        break;
      case 'ERROR':
        console.error(`[ERROR] ${formattedMessage}`);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  error(message: string, contextOrError?: Error | LogContext, context?: LogContext): void {
    let finalContext: LogContext | undefined;

    if (contextOrError instanceof Error) {
      finalContext = { ...context, error: { name: contextOrError.name, message: contextOrError.message } };
    } else {
      finalContext = contextOrError;
    }
    this.log('ERROR', message, finalContext);
  }

  /**
   * Log API errors with request context
   */
  apiError(c: Context, message: string, error?: unknown): void {
    const errorContext = {
      method: c.req.method,
      path: c.req.path,
      userAgent: c.req.header('User-Agent'),
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: isDevelopment ? error.stack : undefined }
        : error,
    };

    this.error(message, errorContext);
  }

  /**
   * Log API success with request context
   */
  apiSuccess(c: Context, message: string, data?: LogContext): void {
    const successContext = {
      method: c.req.method,
      path: c.req.path,
      status: 'success',
      ...(data && { data }),
    };

    this.info(message, successContext);
  }
}

/**
 * Singleton instance for easy import
 */
export const apiLogger = HonoLogger.getInstance();

/**
 * Custom PrintFunc for Hono's logger middleware
 * Handles the spacing issue mentioned in GitHub issue #3328
 */
function customPrintFunc(message: string, ...rest: string[]) {
  // Trim message to handle spacing issue in Cloudflare Workers
  const trimmedMessage = message.trim();

  // Parse the log message to extract structured data
  const timestamp = new Date().toISOString();

  // Enhanced formatting for API logs
  const formattedLog = isDevelopment
    ? `[API] ${timestamp} ${trimmedMessage} ${rest.join(' ')}`
    : JSON.stringify({
        timestamp,
        message: trimmedMessage,
        details: rest.join(' '),
        type: 'api_request',
      });

  console.warn(formattedLog);
}

/**
 * Configured Hono logger middleware
 * Ready to use with app.use()
 */
export const honoLoggerMiddleware = logger(customPrintFunc);

/**
 * Error handling middleware for logging unhandled errors
 */
export async function errorLoggerMiddleware(c: Context, next: () => Promise<void>) {
  try {
    await next();
  } catch (error) {
    apiLogger.apiError(c, 'Unhandled API error', error);

    // Re-throw to let other error handlers deal with it
    throw error;
  }
}

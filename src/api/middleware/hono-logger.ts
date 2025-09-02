/**
 * Centralized Hono Logger Middleware
 * Provides structured logging for all API requests and responses
 * Uses Hono's official logger middleware with custom PrintFunc
 */

import type { Context } from 'hono';
import { logger } from 'hono/logger';

// Environment detection for Cloudflare Workers
const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
// Environment detection for Cloudflare Workers (available for future use)

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Custom structured logger for Hono API
 * Follows official Hono documentation patterns
 */
export class HonoLogger {
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
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: LogLevel[level],
      message,
      ...(context && { context }),
    };

    const formattedMessage = isDevelopment
      ? JSON.stringify(logEntry, null, 2)
      : JSON.stringify(logEntry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        if (isDevelopment) {
          console.log(`[DEBUG] ${formattedMessage}`);
        }
        break;
      case LogLevel.INFO:
        console.log(`[INFO] ${formattedMessage}`);
        break;
      case LogLevel.WARN:
        console.warn(`[WARN] ${formattedMessage}`);
        break;
      case LogLevel.ERROR:
        console.error(`[ERROR] ${formattedMessage}`);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
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
  apiSuccess(c: Context, message: string, data?: Record<string, unknown>): void {
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

  console.log(formattedLog);
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

// Simplified error handling utilities
// Consolidates error patterns to reduce duplication

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiError } from '@/types/api-types';

// Standard error creators - reduces repetitive throw statements
export class ApiErrors {
  static unauthorized(message = 'Unauthorized'): HTTPException {
    return new HTTPException(HttpStatusCodes.UNAUTHORIZED, { message });
  }

  static forbidden(message = 'Access denied'): HTTPException {
    return new HTTPException(HttpStatusCodes.FORBIDDEN, { message });
  }

  static notFound(resource = 'Resource'): HTTPException {
    return new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: `${resource} not found`,
    });
  }

  static badRequest(message = 'Invalid request'): HTTPException {
    return new HTTPException(HttpStatusCodes.BAD_REQUEST, { message });
  }

  static conflict(message = 'Conflict'): HTTPException {
    return new HTTPException(HttpStatusCodes.CONFLICT, { message });
  }

  static internal(message = 'Internal server error'): HTTPException {
    return new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, { message });
  }

  static validationError(field: string, issue: string): HTTPException {
    return new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Validation failed: ${field} ${issue}`,
    });
  }
}

// Error logging utility
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...context,
  };

  console.error('API Error:', JSON.stringify(errorInfo, null, 2));
}

// Error response formatter
export function formatErrorResponse(error: unknown): ApiError {
  if (error instanceof HTTPException) {
    return {
      code: error.status.toString(),
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: '500',
      message: error.message,
    };
  }

  return {
    code: '500',
    message: 'Unknown error occurred',
  };
}

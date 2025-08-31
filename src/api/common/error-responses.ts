/**
 * Reusable OpenAPI error response definitions for createRoute
 * Uses HttpStatusCodes from stoker for consistency
 */

import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ErrorSchema } from './schemas';

/**
 * Common OpenAPI error response definitions
 * Use these in createRoute responses instead of duplicating
 */
export const OpenAPIErrorResponses = {
  [HttpStatusCodes.BAD_REQUEST]: {
    description: 'Bad Request - Invalid request data',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.UNAUTHORIZED]: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.FORBIDDEN]: {
    description: 'Forbidden - Access denied',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.NOT_FOUND]: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.CONFLICT]: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
    description: 'Validation Error - Invalid input data',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.REQUEST_TOO_LONG]: {
    description: 'Payload Too Large - Request entity too large',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
  [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
    description: 'Internal Server Error - Server error occurred',
    content: {
      'application/json': { schema: ErrorSchema },
    },
  },
} as const;

/**
 * Helper function to pick specific error responses
 * Usage: errorResponses([HttpStatusCodes.BAD_REQUEST, HttpStatusCodes.NOT_FOUND])
 */
export function errorResponses<T extends keyof typeof OpenAPIErrorResponses>(
  codes: readonly T[],
): Pick<typeof OpenAPIErrorResponses, T> {
  const result = {} as Pick<typeof OpenAPIErrorResponses, T>;
  for (const code of codes) {
    result[code] = OpenAPIErrorResponses[code];
  }
  return result;
}

/**
 * Common error response combinations for different route types
 */
export const CommonErrorResponses = {
  // Basic CRUD operations
  crud: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.NOT_FOUND,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Create operations
  create: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.CONFLICT,
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // List/Read operations
  read: errorResponses([
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Update operations
  update: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.NOT_FOUND,
    HttpStatusCodes.CONFLICT,
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Delete operations
  delete: errorResponses([
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.NOT_FOUND,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // File upload operations
  upload: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.REQUEST_TOO_LONG,
    HttpStatusCodes.UNPROCESSABLE_ENTITY,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Authentication operations
  auth: errorResponses([
    HttpStatusCodes.BAD_REQUEST,
    HttpStatusCodes.UNAUTHORIZED,
    HttpStatusCodes.FORBIDDEN,
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),

  // Public endpoints (health checks, etc)
  public: errorResponses([
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ]),
} as const;

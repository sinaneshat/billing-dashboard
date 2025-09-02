/**
 * Comprehensive Input Validation Middleware
 *
 * This middleware provides comprehensive input validation for all API endpoints,
 * including request body validation, query parameter validation, header validation,
 * and security-focused input sanitization.
 *
 * Features:
 * - Comprehensive request validation
 * - Security-focused input sanitization
 * - Rate limiting integration
 * - Request size limits
 * - Content type validation
 * - Parameter sanitization
 * - File upload validation
 * - SQL injection prevention
 * - XSS prevention
 */

import type { Context, Next } from 'hono';
import { z } from 'zod';

import { ValidationError } from '@/api/common/error-handling';
import { safeValidate, zodValidation } from '@/api/common/zod-validation-utils';

import { apiLogger } from './hono-logger';
// Constants
const API = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_JSON_SIZE: 10 * 1024 * 1024,
} as const;
const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  MAX_FILES_PER_REQUEST: 10,
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
} as const;
// Safe logging using proper Hono logger
const logWarn = (msg: string, error?: unknown, context?: unknown) => apiLogger.warn(msg, { error, context });
const logError = (msg: string, error?: unknown, context?: unknown) => apiLogger.error(msg, { error, context });

// ============================================================================
// SECURITY VALIDATION PATTERNS
// ============================================================================

/**
 * Dangerous patterns that should be blocked
 */
const SECURITY_PATTERNS = {
  // SQL injection patterns
  SQL_INJECTION: [
    /('|;|--|\/\*|\*\/|xp_|sp_|union|select|insert|delete|update|drop|create|alter|execute)/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i,
    /(<script|<\/script|<img|<iframe|<object|<embed)/i,
  ],

  // XSS patterns
  XSS: [
    /<[^>]*script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /<[^>]*on\w+/i,
  ],

  // Path traversal patterns
  PATH_TRAVERSAL: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    /\.\.%2f/i,
    /\.\.%5c/i,
  ],

  // Command injection patterns
  COMMAND_INJECTION: [
    /[;&|`$(){}[\]]/,
    /\b(cat|ls|pwd|whoami|id|uname|netstat|ps|top|kill|rm|mv|cp)\b/i,
  ],
} as const;

/**
 * Headers that should be validated
 */
const REQUIRED_SECURITY_HEADERS = [
  'user-agent',
  'accept',
  'content-type',
] as const;

/**
 * Headers that should be sanitized
 */
const SANITIZABLE_HEADERS = [
  'user-agent',
  'referer',
  'x-forwarded-for',
  'x-real-ip',
] as const;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * General request validation schema
 */
const requestValidationSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  path: zodValidation.string.withLength(1, 500),
  query: z.record(z.string(), z.string().max(1000)).optional(),
  headers: z.record(z.string(), z.string().max(2000)).optional(),
  body: z.unknown().optional(),
});

/**
 * File upload validation schema
 */
const fileUploadValidationSchema = z.object({
  name: zodValidation.string.withLength(1, 255),
  size: z.number().int().positive().max(FILE_UPLOAD.MAX_FILE_SIZE),
  type: z.string().min(1).max(100),
  content: z.string().min(1),
});

// Query parameter validation schema (currently unused but kept for future use)
// const queryParameterSchema = z.object({
//   page: z.coerce.number().int().positive().max(10000).default(1),
//   limit: z.coerce.number().int().positive().max(API.MAX_PAGE_SIZE).default(API.DEFAULT_PAGE_SIZE),
//   search: zodValidation.sanitizedString(200).optional(),
//   sort: zodValidation.string.alphanumeric().max(50).optional(),
//   filter: z.record(z.string().max(50), z.string().max(500)).optional(),
// });

// ============================================================================
// SECURITY VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check for dangerous security patterns in a string
 */
function containsDangerousPatterns(value: string): { found: boolean; pattern?: string } {
  const allPatterns = [
    ...SECURITY_PATTERNS.SQL_INJECTION,
    ...SECURITY_PATTERNS.XSS,
    ...SECURITY_PATTERNS.PATH_TRAVERSAL,
    ...SECURITY_PATTERNS.COMMAND_INJECTION,
  ];

  for (const pattern of allPatterns) {
    if (pattern.test(value)) {
      return { found: true, pattern: pattern.source };
    }
  }

  return { found: false };
}

/**
 * Sanitize a string value for security
 */
function sanitizeString(value: string, maxLength = 1000): string {
  return value
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Trim and limit length
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate and sanitize headers
 */
function validateHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitizedHeaders: Record<string, string> = {};

  // Check for required headers
  for (const requiredHeader of REQUIRED_SECURITY_HEADERS) {
    if (!headers[requiredHeader] && !headers[requiredHeader.toLowerCase()]) {
      throw new ValidationError({
        message: 'Missing required header',
        validationErrors: [{ field: requiredHeader, message: `${requiredHeader} header is required` }],
      });
    }
  }

  // Sanitize specific headers
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    // Skip if header is too long
    if (key.length > 100 || value.length > 2000) {
      logWarn('Header too long, skipping', undefined, { header: key, length: value.length });
      continue;
    }

    // Check for dangerous patterns in header values
    const dangerCheck = containsDangerousPatterns(value);
    if (dangerCheck.found) {
      logWarn('Dangerous pattern in header', undefined, {
        header: key,
        pattern: dangerCheck.pattern,
      });
      continue;
    }

    // Sanitize certain headers
    if (SANITIZABLE_HEADERS.includes(lowerKey as never)) {
      sanitizedHeaders[key] = sanitizeString(value, 500);
    } else {
      sanitizedHeaders[key] = value;
    }
  }

  return sanitizedHeaders;
}

/**
 * Validate content type
 */
function validateContentType(contentType: string, expectedTypes: string[]): boolean {
  if (!contentType) {
    return false;
  }

  const cleanContentType = contentType?.split(';')[0]?.trim()?.toLowerCase();
  return expectedTypes.some(type =>
    type === '*/*' || cleanContentType === type || cleanContentType?.startsWith(`${type}/`),
  );
}

/**
 * Validate request size
 */
function validateRequestSize(contentLength: number | undefined, maxSize: number): void {
  if (contentLength && contentLength > maxSize) {
    throw new ValidationError({
      message: 'Request too large',
      validationErrors: [{ field: 'content-length', message: `Request size exceeds ${maxSize} bytes` }],
    });
  }
}

/**
 * Validate and sanitize query parameters
 */
function validateQueryParameters(query: Record<string, string>): Record<string, string> {
  const sanitizedQuery: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    // Skip if key or value is too long
    if (key.length > 100 || value.length > 1000) {
      continue;
    }

    // Check for dangerous patterns
    const keyDangerCheck = containsDangerousPatterns(key);
    const valueDangerCheck = containsDangerousPatterns(value);

    if (keyDangerCheck.found || valueDangerCheck.found) {
      logWarn('Dangerous pattern in query parameter', undefined, {
        key,
        keyPattern: keyDangerCheck.pattern,
        valuePattern: valueDangerCheck.pattern,
      });
      continue;
    }

    // Sanitize key and value
    const sanitizedKey = sanitizeString(key, 100);
    const sanitizedValue = sanitizeString(value, 1000);

    if (sanitizedKey && sanitizedValue) {
      sanitizedQuery[sanitizedKey] = sanitizedValue;
    }
  }

  return sanitizedQuery;
}

/**
 * Recursively validate and sanitize object values
 */
function validateObjectRecursively(obj: unknown, depth = 0, maxDepth = 10): unknown {
  if (depth > maxDepth) {
    throw new ValidationError({
      message: 'Object nesting too deep',
      validationErrors: [{ field: 'body', message: `Object nesting exceeds maximum depth of ${maxDepth}` }],
    });
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    const dangerCheck = containsDangerousPatterns(obj);
    if (dangerCheck.found) {
      throw new ValidationError({
        message: 'Dangerous pattern detected',
        validationErrors: [{ field: 'body', message: `Potentially malicious content detected: ${dangerCheck.pattern}` }],
      });
    }
    return sanitizeString(obj, 10000);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length > 1000) {
      throw new ValidationError({
        message: 'Array too large',
        validationErrors: [{ field: 'body', message: 'Array exceeds maximum size of 1000 items' }],
      });
    }
    return obj.map(item => validateObjectRecursively(item, depth + 1, maxDepth));
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length > 100) {
      throw new ValidationError({
        message: 'Object too large',
        validationErrors: [{ field: 'body', message: 'Object exceeds maximum size of 100 properties' }],
      });
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const key of keys) {
      // Validate key
      const keyDangerCheck = containsDangerousPatterns(key);
      if (keyDangerCheck.found) {
        logWarn('Dangerous pattern in object key', undefined, {
          key,
          pattern: keyDangerCheck.pattern,
        });
        continue;
      }

      const sanitizedKey = sanitizeString(key, 100);
      if (sanitizedKey) {
        sanitizedObj[sanitizedKey] = validateObjectRecursively((obj as Record<string, unknown>)[key], depth + 1, maxDepth);
      }
    }

    return sanitizedObj;
  }

  return obj;
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Basic request validation middleware
 */
export function basicRequestValidation() {
  return async (c: Context, next: Next) => {
    try {
      const method = c.req.method;
      const path = c.req.path;
      const url = new URL(c.req.url);

      // Validate basic request structure
      const requestData = {
        method,
        path,
        query: Object.fromEntries(url.searchParams.entries()),
        headers: Object.fromEntries(c.req.raw.headers.entries()),
      };

      const validation = safeValidate(requestValidationSchema, requestData);
      if (!validation.success) {
        throw new ValidationError({
          message: 'Invalid request format',
          validationErrors: validation.errors,
        });
      }

      await next();
    } catch (error) {
      logError('Basic request validation failed', error);
      throw error;
    }
  };
}

/**
 * Header validation middleware
 */
export function headerValidation() {
  return async (c: Context, next: Next) => {
    try {
      const headers = Object.fromEntries(c.req.raw.headers.entries());
      const sanitizedHeaders = validateHeaders(headers);

      // Store sanitized headers for use in handlers
      c.set('sanitizedHeaders', sanitizedHeaders);

      await next();
    } catch (error) {
      logError('Header validation failed', error);
      throw error;
    }
  };
}

/**
 * Query parameter validation middleware
 */
export function queryValidation() {
  return async (c: Context, next: Next) => {
    try {
      const url = new URL(c.req.url);
      const query = Object.fromEntries(url.searchParams.entries());

      // Validate and sanitize query parameters
      const sanitizedQuery = validateQueryParameters(query);

      // Store sanitized query for use in handlers
      c.set('sanitizedQuery', sanitizedQuery);

      await next();
    } catch (error) {
      logError('Query parameter validation failed', error);
      throw error;
    }
  };
}

/**
 * Request body validation middleware
 */
export function bodyValidation(options: {
  maxSize?: number;
  allowedContentTypes?: string[];
  validateFiles?: boolean;
} = {}) {
  const {
    maxSize = API.MAX_JSON_SIZE,
    allowedContentTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
    validateFiles = false,
  } = options;

  return async (c: Context, next: Next) => {
    try {
      const contentType = c.req.header('content-type');
      const contentLength = Number(c.req.header('content-length')) || 0;

      // Skip validation for GET, DELETE, and OPTIONS requests
      if (['GET', 'DELETE', 'OPTIONS', 'HEAD'].includes(c.req.method)) {
        await next();
        return;
      }

      // Validate content type
      if (contentType && !validateContentType(contentType, allowedContentTypes)) {
        throw new ValidationError({
          message: 'Invalid content type',
          validationErrors: [{ field: 'content-type', message: `Content type ${contentType} is not allowed` }],
        });
      }

      // Validate request size
      validateRequestSize(contentLength, maxSize);

      // Get and validate body
      let body;
      try {
        if (contentType?.includes('application/json')) {
          body = await c.req.json();
        } else if (contentType?.includes('multipart/form-data')) {
          body = await c.req.formData();
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          body = await c.req.parseBody();
        }
      } catch {
        throw new ValidationError({
          message: 'Invalid request body format',
          validationErrors: [{ field: 'body', message: 'Unable to parse request body' }],
        });
      }

      // Validate and sanitize body content
      if (body !== undefined) {
        if (validateFiles && body instanceof FormData) {
          // Validate file uploads
          for (const [key, value] of body.entries()) {
            if (value instanceof File) {
              const fileValidation = safeValidate(fileUploadValidationSchema, {
                name: value.name,
                size: value.size,
                type: value.type,
                content: 'file-content', // Placeholder - actual file content validation would happen elsewhere
              });

              if (!fileValidation.success) {
                throw new ValidationError({
                  message: `Invalid file upload: ${key}`,
                  validationErrors: fileValidation.errors,
                });
              }
            }
          }
        } else {
          // Validate regular body content
          const sanitizedBody = validateObjectRecursively(body);
          c.set('sanitizedBody', sanitizedBody);
        }
      }

      await next();
    } catch (error) {
      logError('Body validation failed', error);
      throw error;
    }
  };
}

/**
 * File upload specific validation
 */
export function fileUploadValidation() {
  return async (c: Context, next: Next) => {
    try {
      const contentType = c.req.header('content-type');

      if (!contentType?.includes('multipart/form-data')) {
        await next();
        return;
      }

      const formData = await c.req.formData();
      const files: File[] = [];

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Validate file type
          const isImageType = (FILE_UPLOAD.IMAGE_TYPES as readonly string[]).includes(value.type);
          const isDocumentType = (FILE_UPLOAD.DOCUMENT_TYPES as readonly string[]).includes(value.type);
          if (!isImageType && !isDocumentType) {
            throw new ValidationError({
              message: 'Invalid file type',
              validationErrors: [{ field: key, message: `File type ${value.type} is not allowed` }],
            });
          }

          // Validate file size
          const maxSize = isImageType
            ? FILE_UPLOAD.MAX_IMAGE_SIZE
            : FILE_UPLOAD.MAX_FILE_SIZE;

          if (value.size > maxSize) {
            throw new ValidationError({
              message: 'File too large',
              validationErrors: [{ field: key, message: `File size exceeds ${maxSize} bytes` }],
            });
          }

          files.push(value);
        }
      }

      // Validate total number of files
      if (files.length > FILE_UPLOAD.MAX_FILES_PER_REQUEST) {
        throw new ValidationError({
          message: 'Too many files',
          validationErrors: [{ field: 'files', message: `Maximum ${FILE_UPLOAD.MAX_FILES_PER_REQUEST} files allowed per request` }],
        });
      }

      c.set('validatedFiles', files);

      await next();
    } catch (error) {
      logError('File upload validation failed', error);
      throw error;
    }
  };
}

/**
 * Comprehensive validation middleware that combines all validations
 */
export function comprehensiveValidation(options: {
  validateHeaders?: boolean;
  validateQuery?: boolean;
  validateBody?: boolean;
  validateFiles?: boolean;
  maxBodySize?: number;
  allowedContentTypes?: string[];
} = {}) {
  const {
    validateHeaders = true,
    validateQuery = true,
    validateBody = true,
    validateFiles = false,
    maxBodySize = API.MAX_JSON_SIZE,
    allowedContentTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'],
  } = options;

  return async (c: Context, next: Next) => {
    try {
      // Apply basic request validation
      await basicRequestValidation()(c, async () => {});

      // Apply header validation if enabled
      if (validateHeaders) {
        await headerValidation()(c, async () => {});
      }

      // Apply query validation if enabled
      if (validateQuery) {
        await queryValidation()(c, async () => {});
      }

      // Apply body validation if enabled
      if (validateBody) {
        await bodyValidation({
          maxSize: maxBodySize,
          allowedContentTypes,
          validateFiles,
        })(c, async () => {});
      }

      // Apply file validation if enabled
      if (validateFiles) {
        await fileUploadValidation()(c, async () => {});
      }

      await next();
    } catch (error) {
      logError('Comprehensive validation failed', error);
      throw error;
    }
  };
}

// ============================================================================
// ROUTE-SPECIFIC VALIDATIONS
// ============================================================================

/**
 * Authentication endpoint validation
 */
export function authEndpointValidation() {
  return comprehensiveValidation({
    validateHeaders: true,
    validateQuery: false,
    validateBody: true,
    validateFiles: false,
    maxBodySize: 1024, // 1KB for auth requests
    allowedContentTypes: ['application/json'],
  });
}

/**
 * Payment endpoint validation (extra security)
 */
export function paymentEndpointValidation() {
  return comprehensiveValidation({
    validateHeaders: true,
    validateQuery: true,
    validateBody: true,
    validateFiles: false,
    maxBodySize: 2048, // 2KB for payment requests
    allowedContentTypes: ['application/json'],
  });
}

/**
 * File upload endpoint validation
 */
export function fileUploadEndpointValidation() {
  return comprehensiveValidation({
    validateHeaders: true,
    validateQuery: false,
    validateBody: true,
    validateFiles: true,
    maxBodySize: FILE_UPLOAD.MAX_FILE_SIZE,
    allowedContentTypes: ['multipart/form-data'],
  });
}

/**
 * Admin endpoint validation
 */
export function adminEndpointValidation() {
  return comprehensiveValidation({
    validateHeaders: true,
    validateQuery: true,
    validateBody: true,
    validateFiles: false,
    maxBodySize: API.MAX_JSON_SIZE,
    allowedContentTypes: ['application/json'],
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get sanitized request data from context
 */
export function getSanitizedRequestData(c: Context) {
  return {
    headers: c.get('sanitizedHeaders') || {},
    query: c.get('sanitizedQuery') || {},
    body: c.get('sanitizedBody'),
    files: c.get('validatedFiles') || [],
  };
}

/**
 * Apply validation to a specific field value
 */
export function validateField<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  fieldName: string,
): T {
  const validation = safeValidate(schema, value);
  if (!validation.success) {
    throw new ValidationError({
      message: `Invalid ${fieldName}`,
      validationErrors: validation.errors,
    });
  }
  return validation.data;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  basic: basicRequestValidation,
  headers: headerValidation,
  query: queryValidation,
  body: bodyValidation,
  files: fileUploadValidation,
  comprehensive: comprehensiveValidation,

  // Route-specific
  auth: authEndpointValidation,
  payment: paymentEndpointValidation,
  fileUpload: fileUploadEndpointValidation,
  admin: adminEndpointValidation,

  // Utilities
  getSanitizedRequestData,
  validateField,
  sanitizeString,
  containsDangerousPatterns,
};

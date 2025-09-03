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
import type { SecurityValidation } from '@/api/types/http';
import {
  QueryParametersSchema,
} from '@/api/types/http';

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
// Type-safe logging with specific context types
function logWarn(msg: string, error?: Error, context?: { pattern?: string; field?: string; value?: string }) {
  return apiLogger.warn(msg, { error, context });
}
function logError(msg: string, error?: Error, context?: { operation?: string; field?: string; details?: string }) {
  return apiLogger.error(msg, { error, context });
}

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
 * Advanced security validation using discriminated unions (Context7 Pattern)
 * Replaces loose boolean return with specific security classification
 */
function validateSecurityPatterns(value: string): SecurityValidation {
  const allPatterns = {
    sql_injection: SECURITY_PATTERNS.SQL_INJECTION,
    xss: SECURITY_PATTERNS.XSS,
    path_traversal: SECURITY_PATTERNS.PATH_TRAVERSAL,
    command_injection: SECURITY_PATTERNS.COMMAND_INJECTION,
  } as const;

  const foundPatterns: Array<'sql_injection' | 'xss' | 'path_traversal' | 'command_injection'> = [];

  for (const [patternType, patterns] of Object.entries(allPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(value)) {
        foundPatterns.push(patternType as keyof typeof allPatterns);
        break; // Only record each pattern type once
      }
    }
  }

  if (foundPatterns.length > 0) {
    return {
      level: 'dangerous',
      content: value,
      patterns: foundPatterns,
      blocked: true,
      reason: `Detected security patterns: ${foundPatterns.join(', ')}`,
    };
  }

  // Check for suspicious but not dangerous patterns
  const suspiciousPatterns: Array<'suspicious_chars' | 'long_input' | 'special_encoding'> = [];

  if (value.length > 1000) {
    suspiciousPatterns.push('long_input');
  }

  // Check for control characters (0x00-0x1F, 0x7F-0x9F)
  const hasControlChars = value.split('').some((char) => {
    const code = char.charCodeAt(0);
    return (code >= 0 && code <= 31) || (code >= 127 && code <= 159);
  });
  if (hasControlChars) {
    suspiciousPatterns.push('suspicious_chars');
  }

  if (/%[0-9a-f]{2}/i.test(value)) {
    suspiciousPatterns.push('special_encoding');
  }

  if (suspiciousPatterns.length > 0) {
    return {
      level: 'warning',
      content: value,
      sanitized: sanitizeString(value),
      patterns: suspiciousPatterns,
      message: `Warning: ${suspiciousPatterns.join(', ')} detected`,
    };
  }

  return {
    level: 'safe',
    content: value,
    sanitized: value,
  };
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
 * Advanced header validation using discriminated unions (Context7 Pattern)
 * Maximum type safety replacing generic Record<string, string>
 */
function validateTypedHeaders(rawHeaders: Record<string, string | undefined>): {
  security: SecurityValidation[];
  sanitized: Record<string, string>;
} {
  const securityResults: SecurityValidation[] = [];
  const sanitizedHeaders: Record<string, string> = {};

  // Validate required security headers
  for (const requiredHeader of REQUIRED_SECURITY_HEADERS) {
    const headerValue = rawHeaders[requiredHeader] || rawHeaders[requiredHeader.toLowerCase()];

    if (!headerValue) {
      throw new ValidationError({
        message: 'Missing required header',
        validationErrors: [{
          field: requiredHeader,
          message: `${requiredHeader} header is required for security compliance`,
        }],
      });
    }
  }

  // Process each header with type-safe validation
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (!value)
      continue;

    const lowerKey = key.toLowerCase();

    // Validate header length constraints
    if (key.length > 100 || value.length > 2000) {
      logWarn('Header exceeds length limits', undefined, {
        field: key,
        value: `${value.length} chars`,
      });
      continue;
    }

    // Perform security validation
    const securityResult = validateSecurityPatterns(value);
    securityResults.push(securityResult);

    // Block dangerous headers
    if (securityResult.level === 'dangerous') {
      logError('Dangerous header blocked', undefined, {
        field: key,
        details: securityResult.reason,
      });
      continue;
    }

    // Sanitize headers that need it
    if (SANITIZABLE_HEADERS.includes(lowerKey as never)) {
      sanitizedHeaders[key] = securityResult.level === 'safe'
        ? securityResult.content
        : securityResult.sanitized;
    } else {
      sanitizedHeaders[key] = value;
    }
  }

  return {
    security: securityResults,
    sanitized: sanitizedHeaders,
  };
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
 * Advanced query parameter validation using discriminated unions (Context7 Pattern)
 * Maximum type safety replacing generic Record<string, string>
 */
function validateTypedQueryParameters(rawQuery: Record<string, string | undefined>): {
  security: SecurityValidation[];
  categorized: z.infer<typeof QueryParametersSchema> | null;
  sanitized: Record<string, string>;
} {
  const securityResults: SecurityValidation[] = [];
  const sanitizedQuery: Record<string, string> = {};
  let categorizedQuery: z.infer<typeof QueryParametersSchema> | null = null;

  // First, try to categorize the query parameters
  try {
    // Attempt to parse as pagination
    const paginationResult = QueryParametersSchema.safeParse({
      category: 'pagination',
      ...rawQuery,
    });
    if (paginationResult.success) {
      categorizedQuery = paginationResult.data;
    }

    // If not pagination, try search
    if (!categorizedQuery) {
      const searchResult = QueryParametersSchema.safeParse({
        category: 'search',
        ...rawQuery,
      });
      if (searchResult.success) {
        categorizedQuery = searchResult.data;
      }
    }

    // If not search, try filter
    if (!categorizedQuery) {
      const filterResult = QueryParametersSchema.safeParse({
        category: 'filter',
        ...rawQuery,
      });
      if (filterResult.success) {
        categorizedQuery = filterResult.data;
      }
    }

    // If not filter, try sort
    if (!categorizedQuery) {
      const sortResult = QueryParametersSchema.safeParse({
        category: 'sort',
        ...rawQuery,
      });
      if (sortResult.success) {
        categorizedQuery = sortResult.data;
      }
    }
  } catch {
    // Categorization failed, continue with manual validation
  }

  // Validate each parameter for security
  for (const [key, value] of Object.entries(rawQuery)) {
    if (!value)
      continue;

    // Validate length constraints
    if (key.length > 100 || value.length > 1000) {
      logWarn('Query parameter exceeds length limits', undefined, {
        field: key,
        value: `${value.length} chars`,
      });
      continue;
    }

    // Security validation for key and value
    const keyValidation = validateSecurityPatterns(key);
    const valueValidation = validateSecurityPatterns(value);

    securityResults.push(keyValidation, valueValidation);

    // Block dangerous parameters
    if (keyValidation.level === 'dangerous' || valueValidation.level === 'dangerous') {
      logError('Dangerous query parameter blocked', undefined, {
        field: key,
        details: `Key: ${keyValidation.level}, Value: ${valueValidation.level}`,
      });
      continue;
    }

    // Sanitize and add to result
    const sanitizedKey = keyValidation.level === 'safe'
      ? keyValidation.content
      : keyValidation.sanitized;
    const sanitizedValue = valueValidation.level === 'safe'
      ? valueValidation.content
      : valueValidation.sanitized;

    if (sanitizedKey && sanitizedValue) {
      sanitizedQuery[sanitizedKey] = sanitizedValue;
    }
  }

  return {
    security: securityResults,
    categorized: categorizedQuery,
    sanitized: sanitizedQuery,
  };
}

/**
 * Advanced recursive object validation using discriminated unions (Context7 Pattern)
 * Maximum type safety replacing generic unknown return type
 */
type ValidatedValue =
  | { type: 'null'; value: null }
  | { type: 'undefined'; value: undefined }
  | { type: 'string'; value: string; security: SecurityValidation }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'array'; value: ValidatedValue[]; length: number }
  | { type: 'object'; value: Record<string, ValidatedValue>; properties: number; security: SecurityValidation[] };

function validateObjectRecursively(obj: unknown, depth = 0, maxDepth = 10): ValidatedValue {
  if (depth > maxDepth) {
    throw new ValidationError({
      message: 'Object nesting too deep',
      validationErrors: [{ field: 'body', message: `Object nesting exceeds maximum depth of ${maxDepth}` }],
    });
  }

  if (obj === null) {
    return { type: 'null', value: null };
  }

  if (obj === undefined) {
    return { type: 'undefined', value: undefined };
  }

  if (typeof obj === 'string') {
    const security = validateSecurityPatterns(obj);

    if (security.level === 'dangerous') {
      throw new ValidationError({
        message: 'Dangerous pattern detected',
        validationErrors: [{ field: 'body', message: `Security threat detected: ${security.reason}` }],
      });
    }

    const sanitizedValue = security.level === 'safe' ? security.content : security.sanitized;
    return {
      type: 'string',
      value: sanitizedValue.slice(0, 10000), // Length limit
      security,
    };
  }

  if (typeof obj === 'number') {
    // Validate number constraints
    if (!Number.isFinite(obj) || Math.abs(obj) > Number.MAX_SAFE_INTEGER) {
      throw new ValidationError({
        message: 'Invalid number value',
        validationErrors: [{ field: 'body', message: 'Number must be finite and within safe integer range' }],
      });
    }
    return { type: 'number', value: obj };
  }

  if (typeof obj === 'boolean') {
    return { type: 'boolean', value: obj };
  }

  if (Array.isArray(obj)) {
    if (obj.length > 1000) {
      throw new ValidationError({
        message: 'Array too large',
        validationErrors: [{ field: 'body', message: 'Array exceeds maximum size of 1000 items' }],
      });
    }

    const validatedItems = obj.map(item => validateObjectRecursively(item, depth + 1, maxDepth));
    return {
      type: 'array',
      value: validatedItems,
      length: validatedItems.length,
    };
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length > 100) {
      throw new ValidationError({
        message: 'Object too large',
        validationErrors: [{ field: 'body', message: 'Object exceeds maximum size of 100 properties' }],
      });
    }

    const sanitizedObj: Record<string, ValidatedValue> = {};
    const securityResults: SecurityValidation[] = [];

    for (const key of keys) {
      // Validate key security
      const keyValidation = validateSecurityPatterns(key);
      securityResults.push(keyValidation);

      if (keyValidation.level === 'dangerous') {
        logError('Dangerous pattern in object key', undefined, {
          field: key,
          details: keyValidation.reason,
        });
        continue;
      }

      const sanitizedKey = keyValidation.level === 'safe'
        ? keyValidation.content.slice(0, 100)
        : keyValidation.sanitized.slice(0, 100);

      if (sanitizedKey) {
        const value = (obj as Record<string, unknown>)[key];
        sanitizedObj[sanitizedKey] = validateObjectRecursively(value, depth + 1, maxDepth);
      }
    }

    return {
      type: 'object',
      value: sanitizedObj,
      properties: Object.keys(sanitizedObj).length,
      security: securityResults,
    };
  }

  // Unknown type - return as string representation for safety
  const stringValue = String(obj).slice(0, 1000);
  const security = validateSecurityPatterns(stringValue);

  const sanitizedValue = security.level === 'safe'
    ? security.content
    : security.level === 'warning' ? security.sanitized : security.content;

  return {
    type: 'string',
    value: sanitizedValue,
    security,
  };
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
      logError('Basic request validation failed', error instanceof Error ? error : undefined);
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
      const { sanitized: sanitizedHeaders } = validateTypedHeaders(headers);

      // Store sanitized headers for use in handlers
      c.set('sanitizedHeaders', sanitizedHeaders);

      await next();
    } catch (error) {
      logError('Header validation failed', error instanceof Error ? error : undefined);
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
      const { sanitized: sanitizedQuery } = validateTypedQueryParameters(query);

      // Store sanitized query for use in handlers
      c.set('sanitizedQuery', sanitizedQuery);

      await next();
    } catch (error) {
      logError('Query parameter validation failed', error instanceof Error ? error : undefined);
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
      logError('Body validation failed', error instanceof Error ? error : undefined);
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
      logError('File upload validation failed', error instanceof Error ? error : undefined);
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
      logError('Comprehensive validation failed', error instanceof Error ? error : undefined);
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
};

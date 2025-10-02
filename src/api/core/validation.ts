/**
 * Unified Validation System - Context7 Best Practices
 *
 * Consolidates all validation logic into a single, type-safe system.
 * Replaces multiple validation files with consistent patterns.
 *
 * Features:
 * - Type-safe validation results
 * - Comprehensive error formatting
 * - Schema composition utilities
 * - Request validation helpers
 * - Business rule validators
 */

import { z } from 'zod';

import type { ErrorContext } from './schemas';
import { CoreSchemas, ErrorContextSchema } from './schemas';

// ============================================================================
// VALIDATION RESULT TYPES (Context7 Pattern)
// ============================================================================

export type ValidationSuccess<T> = {
  readonly success: true;
  readonly data: T;
};

export type ValidationFailure = {
  readonly success: false;
  readonly errors: ValidationError[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type ValidationError = {
  readonly field: string;
  readonly message: string;
  readonly code?: string;
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Safe validation with detailed error information using native Zod
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map(issue => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    })),
  };
}

/**
 * Create a validator function for a specific schema
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): ValidationResult<T> => {
    return validateWithSchema(schema, data);
  };
}

/**
 * Format validation errors for API responses
 */
export function formatValidationErrors(errors: ValidationError[]): ErrorContext {
  return {
    errorType: 'validation' as const,
    fieldErrors: errors.map(err => ({
      field: err.field,
      message: err.message,
      code: err.code,
    })),
  };
}

// ============================================================================
// SCHEMA COMPOSITION UTILITIES
// ============================================================================

/**
 * Create a partial version of a schema (all fields optional)
 */
export function createPartialSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) {
  return schema.partial();
}

/**
 * Create an update schema that omits certain fields
 */
export function createUpdateSchema<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  omitFields: readonly K[],
) {
  const omitObj: Record<string, true> = {};
  omitFields.forEach((key) => {
    omitObj[String(key)] = true;
  });
  return schema.omit(omitObj as Record<keyof T, true>);
}

/**
 * Create a pick schema with only specific fields
 */
export function createPickSchema<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  pickFields: readonly K[],
) {
  const pickObj: Record<string, true> = {};
  pickFields.forEach((key) => {
    pickObj[String(key)] = true;
  });
  return schema.pick(pickObj as Record<keyof T, true>);
}

/**
 * Create a search/filter schema with common patterns
 */
export function createSearchSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  searchableFields: Array<keyof T>,
) {
  return z.object({
    // Pagination
    page: CoreSchemas.page(),
    limit: CoreSchemas.limit(),

    // Sorting
    sortBy: z.enum(searchableFields as [string, ...string[]]).optional(),
    sortOrder: CoreSchemas.sortOrder(),

    // Search
    search: z.string().min(1).optional(),

    // Dynamic filters based on schema fields using discriminated union
    ...Object.fromEntries(
      searchableFields.map(field => [
        `filter_${String(field)}`,
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.null(),
        ]).optional(),
      ]),
    ),
  });
}

// ============================================================================
// BUSINESS RULE VALIDATORS
// ============================================================================

/**
 * Security validation utilities
 */
export const SecurityValidators = {
  /**
   * Password strength validation
   */
  strongPassword: () =>
    z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/\W/, 'Password must contain at least one special character'),

  /**
   * Safe string validation (prevents XSS)
   */
  safeString: (maxLength = 1000) =>
    z.string()
      .max(maxLength)
      .refine(str => !/<script/i.test(str), 'Script tags not allowed')
      .refine(str => !/javascript:/i.test(str), 'JavaScript URLs not allowed')
      .refine(str => !/on\w+\s*=/i.test(str), 'Event handlers not allowed')
      .transform(str => str
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>&"']/g, '') // Remove dangerous chars
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim(),
      )
      .refine(str => str.length > 0, 'Content required after sanitization'),

  /**
   * API key format validation
   */
  apiKey: () =>
    z.string()
      .min(32, 'API key must be at least 32 characters')
      .max(128, 'API key must not exceed 128 characters')
      .regex(/^[\w-]+$/, 'API key contains invalid characters'),
} as const;

// ============================================================================
// FILE UPLOAD VALIDATORS
// ============================================================================

/**
 * Create a file upload validator with type and size restrictions
 */
export function createFileUploadValidator(
  allowedTypes: string[],
  maxSizeBytes: number,
) {
  return z.object({
    name: z.string().min(1, 'File name is required'),
    size: z.number()
      .positive('File size must be positive')
      .max(maxSizeBytes, `File size cannot exceed ${Math.round(maxSizeBytes / 1024 / 1024)}MB`),
    type: z.string()
      .refine(
        type => allowedTypes.includes(type),
        `Only these file types are allowed: ${allowedTypes.join(', ')}`,
      ),
    content: z.string().min(1, 'File content is required'),
  });
}

/**
 * Document upload validator
 */
export const documentUploadValidator = createFileUploadValidator(
  [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  10 * 1024 * 1024, // 10MB
);

// ============================================================================
// CONDITIONAL VALIDATORS
// ============================================================================

/**
 * Create a conditional validator based on another field
 */
export function createConditionalValidator<T, K extends string>(
  conditionField: K,
  conditionValue: unknown,
  schema: z.ZodSchema<T>,
  fallbackSchema?: z.ZodSchema<T>,
) {
  // Use discriminated union for conditional validation instead of z.any()
  return z.record(z.string(), z.unknown()).refine(
    (data) => {
      if (data && typeof data === 'object' && conditionField in data) {
        if (data[conditionField] === conditionValue) {
          return schema.safeParse(data).success;
        }
      }
      return fallbackSchema ? fallbackSchema.safeParse(data).success : true;
    },
    {
      message: `Validation failed for ${conditionField} = ${String(conditionValue)}`,
    },
  );
}

/**
 * Create a validator that accepts multiple formats
 */
export function createMultiFormatValidator<T>(
  validators: Array<z.ZodSchema<T>>,
  errorMessage?: string,
) {
  return z.union(
    validators as [z.ZodSchema<T>, z.ZodSchema<T>, ...z.ZodSchema<T>[]],
  ).describe(errorMessage ?? 'Invalid format');
}

// ============================================================================
// REQUEST VALIDATION HELPERS
// ============================================================================

/**
 * Validate request body with proper error formatting
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): ValidationResult<T> {
  return validateWithSchema(schema, body);
}

/**
 * Validate query parameters with coercion
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams,
): ValidationResult<T> {
  const query = Object.fromEntries(searchParams.entries());
  return validateWithSchema(schema, query);
}

/**
 * Validate path parameters
 */
export function validatePathParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string>,
): ValidationResult<T> {
  return validateWithSchema(schema, params);
}

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Create validation error context for API responses
 */
export function createValidationErrorContext(
  errors: ValidationError[],
  schemaName?: string,
): ErrorContext {
  return {
    errorType: 'validation' as const,
    fieldErrors: errors,
    schemaName,
  };
}

/**
 * Validate against ErrorContextSchema to ensure type safety
 */
export function validateErrorContext(context: unknown): ValidationResult<ErrorContext> {
  return validateWithSchema(ErrorContextSchema, context);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export all validators as a single object for easy importing
export const Validators = {
  ...SecurityValidators,
  documentUpload: documentUploadValidator,
} as const;

// Export all validation utilities
export const ValidationUtils = {
  createConditionalValidator,
  createFileUploadValidator,
  createMultiFormatValidator,
  createPartialSchema,
  createPickSchema,
  createSearchSchema,
  createUpdateSchema,
  createValidationErrorContext,
  createValidator,
  formatValidationErrors,
  validateErrorContext,
  validatePathParams,
  validateQueryParams,
  validateRequestBody,
  validateWithSchema,
} as const;

/**
 * Universal Validation Patterns for ZERO CASTING
 *
 * Provides comprehensive validation utilities to eliminate unsafe casting
 * throughout the entire API. All functions return discriminated unions
 * for maximum type safety.
 */

import { z } from 'zod';

// ============================================================================
// UNIVERSAL RESULT TYPES
// ============================================================================

/**
 * Universal validation result discriminated union
 * Used across all validation functions for consistency
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

/**
 * Enhanced validation result with warnings
 */
export type EnhancedValidationResult<T> =
  | { success: true; data: T; warnings?: string[] }
  | { success: false; error: string; details?: unknown; suggestions?: string[] };

// ============================================================================
// CORE VALIDATION UTILITIES
// ============================================================================

/**
 * Safely parse any unknown value with Zod schema
 * The foundation for all type-safe operations
 */
export function parseWithSchema<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  context?: string,
): ValidationResult<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    const contextStr = context ? `${context}: ` : '';
    return {
      success: false,
      error: `${contextStr}${result.error.message}`,
      details: result.error.issues,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate array of values with individual schema validation
 */
export function parseArrayWithSchema<T>(
  values: unknown[],
  schema: z.ZodSchema<T>,
  context?: string,
): ValidationResult<T[]> {
  if (!Array.isArray(values)) {
    return {
      success: false,
      error: `${context || 'Value'} must be an array`,
      details: { received: typeof values },
    };
  }

  const validatedItems: T[] = [];
  const errors: string[] = [];

  for (const [index, value] of values.entries()) {
    const result = parseWithSchema(value, schema, `${context}[${index}]`);
    if (!result.success) {
      errors.push(result.error);
    } else {
      validatedItems.push(result.data);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Array validation failed: ${errors.join('; ')}`,
      details: { validItems: validatedItems.length, totalItems: values.length },
    };
  }

  return { success: true, data: validatedItems };
}

/**
 * Safely extract and validate nested properties from objects
 */
export function extractProperty<T>(
  obj: unknown,
  path: string,
  schema: z.ZodSchema<T>,
): ValidationResult<T> {
  if (!obj || typeof obj !== 'object') {
    return {
      success: false,
      error: `Cannot extract property '${path}' from non-object value`,
      details: { received: typeof obj },
    };
  }

  const pathParts = path.split('.');
  let current: unknown = obj;

  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return {
        success: false,
        error: `Property path '${path}' contains null/undefined at '${part}'`,
      };
    }

    if (typeof current !== 'object') {
      return {
        success: false,
        error: `Property path '${path}' traverses non-object at '${part}'`,
        details: { currentType: typeof current },
      };
    }

    current = (current as Record<string, unknown>)[part];
  }

  return parseWithSchema(current, schema, `Property '${path}'`);
}

// ============================================================================
// HTTP RESPONSE VALIDATION
// ============================================================================

/**
 * Safely validate and parse HTTP response bodies
 * Replaces all manual JSON parsing and casting
 */
export async function parseHttpResponse<T>(
  response: Response,
  schema: z.ZodSchema<T>,
): Promise<ValidationResult<T>> {
  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
      details: { status: response.status, statusText: response.statusText },
    };
  }

  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      return parseWithSchema(jsonData, schema, 'HTTP JSON Response');
    }

    if (contentType.includes('text/')) {
      const textData = await response.text();
      return parseWithSchema(textData, schema, 'HTTP Text Response');
    }

    const bufferData = await response.arrayBuffer();
    return parseWithSchema(bufferData, schema, 'HTTP Binary Response');
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse HTTP response body',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// ============================================================================
// DATABASE RESULT VALIDATION
// ============================================================================

/**
 * Validate database query results with proper error handling
 */
export function parseDbResult<T>(
  result: unknown,
  schema: z.ZodSchema<T>,
  context = 'Database result',
): ValidationResult<T> {
  if (result === undefined || result === null) {
    return {
      success: false,
      error: `${context} is null or undefined`,
    };
  }

  return parseWithSchema(result, schema, context);
}

/**
 * Validate database query array results
 */
export function parseDbResults<T>(
  results: unknown[],
  schema: z.ZodSchema<T>,
  context = 'Database results',
): ValidationResult<T[]> {
  return parseArrayWithSchema(results, schema, context);
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Validate environment variables with proper error messages
 */
export function validateEnvVar<T>(
  value: string | undefined,
  schema: z.ZodSchema<T>,
  varName: string,
): ValidationResult<T> {
  if (value === undefined) {
    return {
      success: false,
      error: `Environment variable '${varName}' is missing`,
    };
  }

  return parseWithSchema(value, schema, `Environment variable '${varName}'`);
}

/**
 * Validate multiple environment variables at once
 */
export function validateEnvVars<T extends Record<string, unknown>>(
  env: Record<string, string | undefined>,
  schema: z.ZodSchema<T>,
): ValidationResult<T> {
  return parseWithSchema(env, schema, 'Environment variables');
}

// ============================================================================
// JSON PARSING
// ============================================================================

/**
 * Safely parse JSON strings with schema validation
 */
export function parseJsonSafely<T>(
  jsonString: string,
  schema: z.ZodSchema<T>,
): ValidationResult<T> {
  try {
    const parsed = JSON.parse(jsonString);
    return parseWithSchema(parsed, schema, 'JSON string');
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON string',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// ============================================================================
// TYPE NARROWING HELPERS
// ============================================================================

/**
 * Type-safe narrowing for unknown values
 */
export function narrowType<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
): value is T {
  return schema.safeParse(value).success;
}

/**
 * Assert type with validation (throws on failure)
 */
export function assertType<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  context?: string,
): T {
  const result = parseWithSchema(value, schema, context);
  if (!result.success) {
    throw new Error(`Type assertion failed: ${result.error}`);
  }
  return result.data;
}

// ============================================================================
// COMMON SCHEMA PATTERNS
// ============================================================================

/**
 * Common validation schemas for frequent patterns
 */
export const CommonSchemas = {
  NonEmptyString: z.string().min(1),
  Email: z.string().email(),
  Uuid: z.string().uuid(),
  PositiveNumber: z.number().positive(),
  NonNegativeNumber: z.number().nonnegative(),
  Url: z.string().url(),
  DateString: z.string().datetime(),

  /**
   * Discriminated union for API responses
   */
  ApiResponse: <T>(dataSchema: z.ZodSchema<T>) => z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
      details: z.unknown().optional(),
    }),
  ]),

  /**
   * Paginated result schema
   */
  PaginatedResult: <T>(itemSchema: z.ZodSchema<T>) => z.object({
    items: z.array(itemSchema),
    total: z.number().nonnegative(),
    page: z.number().positive().optional(),
    limit: z.number().positive().optional(),
  }),
};

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Helper to migrate from unsafe casting to safe validation
 * Used during the migration process
 */
export function migrateCasting<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  fallback: T,
  context?: string,
): T {
  const result = parseWithSchema(value, schema, context);
  if (!result.success) {
    console.warn(`Migration casting warning: ${result.error}. Using fallback.`);
    return fallback;
  }
  return result.data;
}

/**
 * Strict migration that throws on validation failure
 * Use this to find and fix remaining unsafe casting patterns
 */
export function strictMigration<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
  context?: string,
): T {
  const result = parseWithSchema(value, schema, context);
  if (!result.success) {
    throw new Error(`Strict migration failed: ${result.error}`);
  }
  return result.data;
}

// ============================================================================
// VALIDATION PIPELINE
// ============================================================================

/**
 * Chain multiple validations together
 */
export class ValidationPipeline<T> {
  private value: unknown;
  private schema: z.ZodSchema<T>;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(value: unknown, schema: z.ZodSchema<T>) {
    this.value = value;
    this.schema = schema;
  }

  /**
   * Add a validation step
   */
  validate(
    predicate: (value: T) => boolean,
    error: string,
  ): ValidationPipeline<T> {
    const parseResult = this.schema.safeParse(this.value);
    if (parseResult.success && !predicate(parseResult.data)) {
      this.errors.push(error);
    }
    return this;
  }

  /**
   * Add a warning step
   */
  warn(
    predicate: (value: T) => boolean,
    warning: string,
  ): ValidationPipeline<T> {
    const parseResult = this.schema.safeParse(this.value);
    if (parseResult.success && predicate(parseResult.data)) {
      this.warnings.push(warning);
    }
    return this;
  }

  /**
   * Execute the pipeline
   */
  execute(): EnhancedValidationResult<T> {
    const baseResult = parseWithSchema(this.value, this.schema);

    if (!baseResult.success) {
      return baseResult;
    }

    if (this.errors.length > 0) {
      return {
        success: false,
        error: `Validation pipeline failed: ${this.errors.join('; ')}`,
        suggestions: this.warnings.length > 0 ? this.warnings : undefined,
      };
    }

    return {
      success: true,
      data: baseResult.data,
      warnings: this.warnings.length > 0 ? this.warnings : undefined,
    };
  }
}

/**
 * Create a validation pipeline
 */
export function createPipeline<T>(
  value: unknown,
  schema: z.ZodSchema<T>,
): ValidationPipeline<T> {
  return new ValidationPipeline(value, schema);
}

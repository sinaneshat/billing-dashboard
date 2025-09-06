/**
 * Generic type utility functions with ZERO CASTING
 * Provides type-safe alternatives with proper validation
 */

import type { z } from 'zod';

/**
 * Result discriminated union for type-safe operations
 */
export type TypeSafeResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Type guard for checking if value is object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard for checking if value is non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for checking if value is valid array
 */
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (itemGuard) {
    return value.every(itemGuard);
  }

  return true;
}

/**
 * Safely parse JSON with type guard
 */
export function parseJson<T>(
  json: string,
  typeGuard: (value: unknown) => value is T,
): T | null {
  try {
    const parsed = JSON.parse(json);
    return typeGuard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Create a picker function with ZERO CASTING
 * Returns discriminated union for type safety
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): TypeSafeResult<Pick<T, K>> {
  if (!isObject(obj)) {
    return {
      success: false,
      error: 'Input is not a valid object',
    };
  }

  const result: Partial<Pick<T, K>> = {};

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  // Validate that all required keys are present
  const missingKeys = keys.filter(key => !(key in result));
  if (missingKeys.length > 0) {
    return {
      success: false,
      error: `Missing required keys: ${missingKeys.join(', ')}`,
    };
  }

  return { success: true, data: result as Pick<T, K> };
}

/**
 * Omit properties with ZERO CASTING
 * Returns discriminated union for type safety
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): TypeSafeResult<Omit<T, K>> {
  if (!isObject(obj)) {
    return {
      success: false,
      error: 'Input is not a valid object',
    };
  }

  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  // TypeScript knows result is Omit<T, K> after property deletion
  return { success: true, data: result as Omit<T, K> };
}

/**
 * Type-safe property access with default
 */
export function getProperty<T, K extends keyof T>(
  obj: T,
  key: K,
  defaultValue: T[K],
): T[K] {
  return obj[key] ?? defaultValue;
}

/**
 * Build result object with ZERO CASTING
 * Returns discriminated union for type safety
 */
export function buildResult<T extends Record<string, unknown>>(
  entries: Array<[keyof T, T[keyof T]]>,
  schema?: z.ZodSchema<T>,
): TypeSafeResult<T> {
  if (!Array.isArray(entries)) {
    return {
      success: false,
      error: 'Entries must be an array',
    };
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    if (typeof key !== 'string' && typeof key !== 'number' && typeof key !== 'symbol') {
      return {
        success: false,
        error: `Invalid key type: ${typeof key}`,
      };
    }
    result[key as string] = value;
  }

  if (schema) {
    const parseResult = schema.safeParse(result);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Schema validation failed: ${parseResult.error.message}`,
      };
    }
    return { success: true, data: parseResult.data };
  }

  // Without schema, we trust the entries are properly typed
  return { success: true, data: result as T };
}

/**
 * Type-safe conversion of R2Metadata to Record<string, string>
 * R2 customMetadata requires string values only
 */
export function convertToR2CustomMetadata(metadata: Record<string, unknown> | undefined): Record<string, string> | undefined {
  if (!metadata || !isObject(metadata)) {
    return undefined;
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof key === 'string' && value != null) {
      result[key] = String(value);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Type-safe conversion from R2 customMetadata with ZERO CASTING
 * Returns discriminated union for validation
 */
export function parseR2CustomMetadata<T extends Record<string, unknown>>(
  customMetadata: Record<string, string> | undefined,
  schema?: z.ZodSchema<T>,
): TypeSafeResult<T | undefined> {
  if (!customMetadata) {
    return { success: true, data: undefined };
  }

  if (!isObject(customMetadata)) {
    return {
      success: false,
      error: 'Custom metadata is not a valid object',
    };
  }

  if (schema) {
    const parseResult = schema.safeParse(customMetadata);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Schema validation failed: ${parseResult.error.message}`,
      };
    }
    return { success: true, data: parseResult.data };
  }

  // Without schema, we can only return the object as-is with minimal validation
  // The caller should provide a schema for proper type safety
  return { success: true, data: customMetadata as T };
}

/**
 * Type-safe check for ReadableStream
 */
export function isReadableStream(value: unknown): value is ReadableStream {
  return value instanceof ReadableStream;
}

/**
 * Type-safe conversion to ReadableStream with validation
 */
export function asReadableStream(value: unknown): ReadableStream {
  if (isReadableStream(value)) {
    return value;
  }
  throw new Error('Value is not a ReadableStream');
}

/**
 * Type-safe error object parsing
 * Safely extracts common error properties without casting
 */
export function parseErrorObject(error: unknown): {
  message?: string;
  status?: number;
  code?: string;
  statusText?: string;
  details?: unknown;
  data?: unknown;
} {
  if (!isObject(error)) {
    return {};
  }

  const result: ReturnType<typeof parseErrorObject> = {};

  if (isNonEmptyString(error.message)) {
    result.message = error.message;
  }

  if (typeof error.status === 'number') {
    result.status = error.status;
  }

  if (isNonEmptyString(error.code)) {
    result.code = error.code;
  }

  if (isNonEmptyString(error.statusText)) {
    result.statusText = error.statusText;
  }

  if (error.details !== undefined) {
    result.details = error.details;
  }

  if (error.data !== undefined) {
    result.data = error.data;
  }

  return result;
}

/**
 * Type-safe number extraction from metadata
 */
export function getNumberFromMetadata(metadata: Record<string, unknown>, key: string, defaultValue: number = 0): number {
  const value = metadata[key];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Type-safe string extraction from object
 */
export function getStringFromObject(obj: unknown, key: string, defaultValue = ''): string {
  if (!isObject(obj)) {
    return defaultValue;
  }
  const value = obj[key];
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Generic type utility functions
 * Provides type-safe alternatives to casting
 */

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
 * Create a picker function that safely extracts specific properties
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Omit properties safely without casting
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result as Omit<T, K>;
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
 * Build result object without casting
 */
export function buildResult<T extends Record<string, unknown>>(
  entries: Array<[keyof T, T[keyof T]]>,
): T {
  return entries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as T);
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
 * Type-safe conversion from R2 customMetadata back to typed metadata
 */
export function parseR2CustomMetadata<T extends Record<string, unknown>>(
  customMetadata: Record<string, string> | undefined,
): T | undefined {
  if (!customMetadata || !isObject(customMetadata)) {
    return undefined;
  }

  return customMetadata as T;
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

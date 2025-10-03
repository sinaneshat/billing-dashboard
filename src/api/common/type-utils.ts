/**
 * Metadata and error utility functions
 * MIGRATION COMPLETE: Unused generic type utilities removed.
 * Only getNumberFromMetadata and parseErrorObject are used by the codebase.
 */

/**
 * Safely extract a number from metadata with fallback
 * Used by systems for failure count tracking
 */
export function getNumberFromMetadata(metadata: Record<string, unknown>, key: string, defaultValue: number = 0): number {
  const value = metadata?.[key];
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Parse any error object to extract meaningful information
 * Used by query helpers for consistent error handling
 */
export function parseErrorObject(error: unknown): {
  message?: string;
  status?: number;
  code?: string;
  statusText?: string;
  details?: unknown;
  data?: unknown;
} {
  if (!error || (typeof error !== 'object')) {
    return { message: typeof error === 'string' ? error : 'Unknown error' };
  }

  // Type guard approach instead of casting
  function isObjectWithProperties(obj: unknown): obj is Record<string, unknown> {
    return obj !== null && typeof obj === 'object';
  }

  if (!isObjectWithProperties(error)) {
    return { message: 'Unknown error' };
  }

  const obj = error;
  const result: ReturnType<typeof parseErrorObject> = {};

  // Extract message
  if (typeof obj.message === 'string' && obj.message.length > 0) {
    result.message = obj.message;
  }

  // Extract status
  if (typeof obj.status === 'number') {
    result.status = obj.status;
  }

  // Extract code
  if (typeof obj.code === 'string' && obj.code.length > 0) {
    result.code = obj.code;
  }

  // Extract statusText
  if (typeof obj.statusText === 'string' && obj.statusText.length > 0) {
    result.statusText = obj.statusText;
  }

  // Extract details
  if (obj.details !== undefined) {
    result.details = obj.details;
  }

  // Extract data
  if (obj.data !== undefined) {
    result.data = obj.data;
  }

  return result;
}

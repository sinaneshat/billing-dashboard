/**
 * Type-safe FormData handling utilities
 * Eliminates unsafe casting patterns found in both projects
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

/**
 * Type guard to check if FormData entry is a File
 */
function isFile(entry: FormDataEntryValue | null): entry is File {
  return entry instanceof File;
}

/**
 * Type guard to check if FormData entry is a string
 */
function isFormString(entry: FormDataEntryValue | null): entry is string {
  return typeof entry === 'string';
}

/**
 * Safely extract a required file from FormData
 * Throws HTTP exception if file is missing or invalid
 */
export function extractFile(formData: FormData, fieldName: string): File {
  const entry = formData.get(fieldName);

  if (!entry) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Missing required file: ${fieldName}`,
    });
  }

  if (!isFile(entry)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Invalid file type for field: ${fieldName}`,
    });
  }

  return entry;
}

/**
 * Safely extract an optional string from FormData
 */
export function extractOptionalString(formData: FormData, fieldName: string): string | null {
  const entry = formData.get(fieldName);
  return isFormString(entry) ? entry : null;
}

/**
 * Type-safe FormData handling utilities
 * Eliminates unsafe casting patterns found in both projects
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

/**
 * Type guard to check if FormData entry is a File
 */
export function isFile(entry: FormDataEntryValue | null): entry is File {
  return entry instanceof File;
}

/**
 * Type guard to check if FormData entry is a string
 */
export function isFormString(entry: FormDataEntryValue | null): entry is string {
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
 * Safely extract an optional file from FormData
 * Returns null if file is missing, throws if present but invalid
 */
export function extractOptionalFile(formData: FormData, fieldName: string): File | null {
  const entry = formData.get(fieldName);

  if (!entry) {
    return null;
  }

  if (!isFile(entry)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Invalid file type for field: ${fieldName}`,
    });
  }

  return entry;
}

/**
 * Safely extract a required string from FormData
 */
export function extractString(formData: FormData, fieldName: string): string {
  const entry = formData.get(fieldName);

  if (!entry) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Missing required field: ${fieldName}`,
    });
  }

  if (!isFormString(entry)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Invalid string type for field: ${fieldName}`,
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

/**
 * Extract multiple files from FormData (for batch uploads)
 */
export function extractFiles(formData: FormData, fieldName: string): File[] {
  const entries = formData.getAll(fieldName);
  const files: File[] = [];

  for (const entry of entries) {
    if (isFile(entry)) {
      files.push(entry);
    } else if (entry) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: `Invalid file type in field: ${fieldName}`,
      });
    }
  }

  return files;
}

/**
 * Validate file exists and has content
 */
export function validateFileContent(file: File): void {
  if (file.size === 0) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'File cannot be empty',
    });
  }

  if (!file.type) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'File must have a valid content type',
    });
  }
}

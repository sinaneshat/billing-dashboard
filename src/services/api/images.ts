/**
 * Images Service - 100% RPC Type Inference
 *
 * This service uses Hono's InferRequestType and InferResponseType
 * for complete type safety without any hardcoded types.
 */

import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';

import { apiClient } from '@/api/client';

// ============================================================================
//  Inferred Types for Components
// ============================================================================

// These types are 100% inferred from the RPC client
export type UploadUserAvatarRequest = InferRequestType<typeof apiClient.images.avatar['$post']>;
export type UploadUserAvatarResponse = InferResponseType<typeof apiClient.images.avatar['$post']>;

export type GetImagesRequest = InferRequestType<typeof apiClient.images['$get']>;
export type GetImagesResponse = InferResponseType<typeof apiClient.images['$get']>;

export type GetImageMetadataRequest = InferRequestType<typeof apiClient.images[':key']['$get']>;
export type GetImageMetadataResponse = InferResponseType<typeof apiClient.images[':key']['$get']>;

export type DeleteImageRequest = InferRequestType<typeof apiClient.images[':key']['$delete']>;
export type DeleteImageResponse = InferResponseType<typeof apiClient.images[':key']['$delete']>;

// ============================================================================
// Images Service Functions
// ============================================================================

/**
 * Upload user avatar image
 * All types are inferred from the RPC client
 */
export async function uploadUserAvatarService(args: UploadUserAvatarRequest) {
  return parseResponse(apiClient.images.avatar.$post(args));
}

/**
 * Get list of images with optional filtering
 * All types are inferred from the RPC client
 */
export async function getImagesService(args?: GetImagesRequest) {
  const request = args || { query: {} };
  return parseResponse(apiClient.images.$get(request));
}

/**
 * Get metadata for a specific image
 * All types are inferred from the RPC client
 */
export async function getImageMetadataService(args: GetImageMetadataRequest) {
  return parseResponse(apiClient.images[':key'].$get(args));
}

/**
 * Delete an image by key
 * All types are inferred from the RPC client
 */
export async function deleteImageService(args: DeleteImageRequest) {
  return parseResponse(apiClient.images[':key'].$delete(args));
}

// ============================================================================
// Derived Service Functions (Helper Functions)
// ============================================================================

/**
 * Get all avatars for the current user
 * All types are inferred from the RPC client
 */
export async function getUserAvatarsService(args?: GetImagesRequest) {
  const request: GetImagesRequest = {
    ...args,
    query: {
      ...args?.query,
      type: 'avatar',
    },
  };
  return getImagesService(request);
}

/**
 * Replace user avatar (upload new)
 * All types are inferred from the RPC client
 */
export async function replaceUserAvatarService(args: UploadUserAvatarRequest) {
  return uploadUserAvatarService(args);
}

/**
 * Validate image file before upload
 */
export function validateImageFileService(
  file: File,
  maxSize: number = 5 * 1024 * 1024,
): { isValid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const fileType = (file.type || '').toLowerCase();

  if (fileType === '') {
    return { isValid: true };
  }

  const isValidType = validTypes.some((validType) => {
    const normalizedValid = validType.toLowerCase();
    if ((normalizedValid === 'image/jpeg' || normalizedValid === 'image/jpg')
      && (fileType === 'image/jpeg' || fileType === 'image/jpg')) {
      return true;
    }
    return fileType === normalizedValid;
  });

  if (!isValidType) {
    return {
      isValid: false,
      error: `Invalid file type (${file.type}). Allowed types: ${validTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { isValid: true };
}

/**
 * Create image preview URL (for client-side preview)
 */
export function createImagePreviewService(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke image preview URL (cleanup)
 */
export function revokeImagePreviewService(url: string): void {
  URL.revokeObjectURL(url);
}

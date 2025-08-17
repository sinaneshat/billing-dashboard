import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ApiEnv } from '@/api/types';

// Storage access levels
export enum StorageAccessLevel {
  PRIVATE = 'private', // Only owner can access
  ORGANIZATION = 'organization', // Organization members can access
  PUBLIC = 'public', // Anyone with link can access (not recommended)
}

// Allowed purposes for storage operations
export enum StoragePurpose {
  USER_AVATAR = 'user_avatar',
  COMPANY_LOGO = 'company_logo',
  COMPANY_BANNER = 'company_banner',
  DOCUMENT = 'document',
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
}

// File type restrictions per purpose
export const PURPOSE_FILE_RESTRICTIONS: Record<StoragePurpose, {
  allowedMimeTypes: string[];
  maxSize: number; // in bytes
  pathPrefix: string;
}> = {
  [StoragePurpose.USER_AVATAR]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: 5 * 1024 * 1024, // 5MB
    pathPrefix: 'images/avatar',
  },
  [StoragePurpose.COMPANY_LOGO]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxSize: 2 * 1024 * 1024, // 2MB
    pathPrefix: 'images/logo',
  },
  [StoragePurpose.COMPANY_BANNER]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    pathPrefix: 'images/banner',
  },
  [StoragePurpose.DOCUMENT]: {
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 20 * 1024 * 1024, // 20MB
    pathPrefix: 'documents',
  },
  [StoragePurpose.RECEIPT]: {
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    pathPrefix: 'receipts',
  },
  [StoragePurpose.INVOICE]: {
    allowedMimeTypes: ['application/pdf'],
    maxSize: 20 * 1024 * 1024, // 20MB
    pathPrefix: 'invoices',
  },
};

// Validate storage key format and prevent path traversal
export function validateStorageKey(key: string): boolean {
  // Prevent path traversal attacks
  if (key.includes('..') || key.includes('//')) {
    return false;
  }

  // Ensure key starts with a valid prefix
  const validPrefixes = Object.values(PURPOSE_FILE_RESTRICTIONS).map(r => r.pathPrefix);
  const hasValidPrefix = validPrefixes.some(prefix => key.startsWith(`${prefix}/`));

  // Also allow temporary uploads with proper structure
  if (key.startsWith('temp/') && key.split('/').length >= 3) {
    return true;
  }

  return hasValidPrefix;
}

// Extract purpose from storage key
export function extractPurposeFromKey(key: string): StoragePurpose | null {
  for (const [purpose, restrictions] of Object.entries(PURPOSE_FILE_RESTRICTIONS)) {
    if (key.startsWith(`${restrictions.pathPrefix}/`)) {
      return purpose as StoragePurpose;
    }
  }
  return null;
}

// Middleware to validate storage operations
export const validateStorageOperation = createMiddleware<ApiEnv>(async (c, next) => {
  const path = c.req.path;

  // Extract key from path
  const keyMatch = path.match(/\/storage\/(.+)$/);
  if (!keyMatch) {
    return next();
  }

  const key = keyMatch[1];
  if (!key) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'Invalid storage key',
    });
  }

  // Validate key format
  if (!validateStorageKey(key)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'Invalid storage key format',
    });
  }

  // Get session and user
  const session = c.get('session');
  const user = c.get('user');

  if (!session || !user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required for storage operations',
    });
  }

  // Store key and purpose in context for use in handlers
  const purpose = key ? extractPurposeFromKey(key) : null;
  c.set('storageKey', key);
  c.set('storagePurpose', purpose);

  return next();
});

// Middleware to verify ownership for storage operations
export const verifyStorageOwnership = createMiddleware<ApiEnv>(async (c, next) => {
  const method = c.req.method;
  const key = c.get('storageKey');
  const purpose = c.get('storagePurpose');
  const session = c.get('session');
  const user = c.get('user');

  if (!key || !session || !user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized storage operation',
    });
  }

  // For PUT operations, check if user can create in this path
  if (method === 'PUT') {
    // User avatars - only the user themselves
    if (purpose === StoragePurpose.USER_AVATAR) {
      if (!key.includes(`/${user.id}/`)) {
        throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
          message: 'Cannot upload avatar for another user',
        });
      }
    }

    // Company assets - user must own the asset
    if (purpose === StoragePurpose.COMPANY_LOGO || purpose === StoragePurpose.COMPANY_BANNER) {
      if (!key.includes(`/${session.userId}/`)) {
        throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
          message: 'Cannot upload assets for another user',
        });
      }
    }

    // Documents/receipts/invoices - user context required
    if ([StoragePurpose.DOCUMENT, StoragePurpose.RECEIPT, StoragePurpose.INVOICE].includes(purpose as StoragePurpose)) {
      if (!session.userId) {
        throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
          message: 'User authentication required for document upload',
        });
      }
    }
  }

  // For GET/DELETE operations, verify access rights
  if (method === 'GET' || method === 'DELETE') {
    // We'll need to check metadata from R2 in the actual handler
    // Store method for handler to check
    c.set('storageMethod', method);
  }

  return next();
});

// Middleware to validate file uploads
export const validateFileUpload = createMiddleware<ApiEnv>(async (c, next) => {
  const method = c.req.method;

  // Only validate PUT requests
  if (method !== 'PUT') {
    return next();
  }

  const purpose = c.get('storagePurpose');
  if (!purpose) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'Storage purpose not determined',
    });
  }

  const restrictions = PURPOSE_FILE_RESTRICTIONS[purpose];
  if (!restrictions) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'Invalid storage purpose',
    });
  }

  // Get content type and length
  const contentType = c.req.header('content-type') || 'application/octet-stream';
  const contentLength = Number.parseInt(c.req.header('content-length') || '0', 10);

  // Validate content type
  if (!restrictions.allowedMimeTypes.includes(contentType)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Invalid file type. Allowed types: ${restrictions.allowedMimeTypes.join(', ')}`,
    });
  }

  // Validate file size
  if (contentLength > restrictions.maxSize) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `File too large. Maximum size: ${restrictions.maxSize / (1024 * 1024)}MB`,
    });
  }

  // Store validated info for handler
  c.set('fileContentType', contentType);
  c.set('fileSize', contentLength);

  return next();
});

// Rate limiting middleware for storage operations
export const storageRateLimit = createMiddleware<ApiEnv>(async (c, next) => {
  const session = c.get('session');
  const user = c.get('user');

  if (!session || !user) {
    return next();
  }

  // Implement rate limiting logic here
  // For now, we'll pass through but you should implement:
  // - Per-user upload limits (e.g., 100 uploads per hour)
  // - Per-organization storage quotas
  // - Per-IP rate limiting for additional security

  return next();
});

// Audit logging middleware
export const auditStorageOperation = createMiddleware<ApiEnv>(async (c, next) => {
  await next();
  // TODO: Implement proper structured logging here
  // Consider using a logger that can be configured for different environments
});
// Image validation utilities
export type ImageValidationResult = {
  isValid: boolean;
  error?: string;
};

export type ImageUploadConfig = {
  maxSize: number;
  allowedFormats: string[];
  requireDimensions?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
};

export const IMAGE_CONFIGS = {
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    requireDimensions: {
      minWidth: 100,
      minHeight: 100,
      maxWidth: 2048,
      maxHeight: 2048,
    },
  },
  companyLogo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    requireDimensions: {
      minWidth: 200,
      minHeight: 200,
      maxWidth: 1024,
      maxHeight: 1024,
    },
  },
  companyBanner: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    requireDimensions: {
      minWidth: 800,
      minHeight: 200,
      maxWidth: 3840,
      maxHeight: 2160,
    },
  },
} as const;

export async function validateImageFile(
  file: File | Blob,
  config: ImageUploadConfig,
): Promise<ImageValidationResult> {
  // Check file size
  if (file.size > config.maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum of ${config.maxSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  const fileType = file.type || 'application/octet-stream';
  if (!config.allowedFormats.includes(fileType)) {
    return {
      isValid: false,
      error: `Invalid file format. Allowed formats: ${config.allowedFormats.join(', ')}`,
    };
  }

  // For images (excluding SVG), validate dimensions if specified
  if (config.requireDimensions && fileType !== 'image/svg+xml') {
    try {
      const dimensions = await getImageDimensions(file);
      const { minWidth, minHeight, maxWidth, maxHeight } = config.requireDimensions;

      if (minWidth && dimensions.width < minWidth) {
        return { isValid: false, error: `Image width must be at least ${minWidth}px` };
      }
      if (minHeight && dimensions.height < minHeight) {
        return { isValid: false, error: `Image height must be at least ${minHeight}px` };
      }
      if (maxWidth && dimensions.width > maxWidth) {
        return { isValid: false, error: `Image width must not exceed ${maxWidth}px` };
      }
      if (maxHeight && dimensions.height > maxHeight) {
        return { isValid: false, error: `Image height must not exceed ${maxHeight}px` };
      }
    } catch {
      return { isValid: false, error: 'Unable to validate image dimensions' };
    }
  }

  return { isValid: true };
}

async function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function generateImageKey(type: string, entityId: string, extension: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `images/${type}/${entityId}/${timestamp}-${randomSuffix}.${extension}`;
}

export function getExtensionFromMimeType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return typeMap[mimeType] || 'jpg';
}

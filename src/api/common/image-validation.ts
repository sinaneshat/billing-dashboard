/**
 * Unified image validation utilities
 * Consolidates duplicate validation logic from multiple handlers
 */

export type ImageValidationResult = {
  isValid: boolean;
  error?: string;
};

export type ImageType = 'avatar' | 'logo' | 'banner';

export const IMAGE_CONFIGS = {
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    pathPrefix: 'images/avatar',
  },
  logo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
    pathPrefix: 'images/logo',
  },
  banner: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    pathPrefix: 'images/banner',
  },
} as const;

/**
 * Validates an image file against size and format restrictions
 */
export async function validateImage(
  file: File | Blob,
  type: ImageType,
): Promise<ImageValidationResult> {
  const config = IMAGE_CONFIGS[type];

  // Check file size
  if (file.size > config.maxSize) {
    return {
      isValid: false,
      error: `File size exceeds maximum of ${config.maxSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type - be more flexible with MIME type matching
  const fileType = (file.type || '').toLowerCase();

  // If no file type is provided, accept it (browsers sometimes don't set it)
  if (!fileType) {
    return { isValid: true };
  }

  // Check if file type matches any allowed format
  const isAllowed = config.allowedFormats.some((allowedFormat) => {
    const normalizedAllowed = allowedFormat.toLowerCase();

    // Handle jpeg/jpg equivalence
    if ((normalizedAllowed === 'image/jpeg' || normalizedAllowed === 'image/jpg')
      && (fileType === 'image/jpeg' || fileType === 'image/jpg')) {
      return true;
    }

    return fileType === normalizedAllowed;
  });

  if (!isAllowed) {
    return {
      isValid: false,
      error: `Invalid file format (${file.type}). Allowed formats: ${config.allowedFormats.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Generates a unique storage key for an image
 */
export function generateImageKey(type: ImageType, entityId: string, extension: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${IMAGE_CONFIGS[type].pathPrefix}/${entityId}/${timestamp}-${randomSuffix}.${extension}`;
}

/**
 * Gets file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const normalizedType = (mimeType || '').toLowerCase();
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return typeMap[normalizedType] || 'jpg';
}

/**
 * Extract image type from storage key
 */
export function extractImageTypeFromKey(key: string): ImageType | null {
  for (const [type, config] of Object.entries(IMAGE_CONFIGS)) {
    if (key.startsWith(`${config.pathPrefix}/`)) {
      return type as ImageType;
    }
  }
  return null;
}

/**
 * Unified file validation service for all file upload operations
 * Consolidates validation logic from images and storage handlers
 */

export type ImageDimensions = {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
};

export type FileValidationConfig = {
  maxSize: number;
  allowedMimeTypes: readonly string[];
  allowedExtensions?: readonly string[];
  requireDimensions?: ImageDimensions;
};

export type ValidationResult = {
  isValid: boolean;
  error?: string;
};

/**
 * Preset configurations for common file types
 */
export const FILE_VALIDATION_PRESETS = {
  userAvatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    requireDimensions: {
      minWidth: 100,
      minHeight: 100,
      maxWidth: 2048,
      maxHeight: 2048,
    },
  },
  companyLogo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
    requireDimensions: {
      minWidth: 200,
      minHeight: 200,
      maxWidth: 1024,
      maxHeight: 1024,
    },
  },
  companyBanner: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    requireDimensions: {
      minWidth: 800,
      minHeight: 200,
      maxWidth: 3840,
      maxHeight: 2160,
    },
  },
  document: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
  },
  receipt: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
  invoice: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ['application/pdf'],
  },
} as const;

/**
 * MIME type to file extension mapping
 */
const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/json': 'json',
};

/**
 * Unified file validation service
 */
export class FileValidator {
  /**
   * Validate a file against the provided configuration
   */
  static async validate(
    file: File | Blob,
    config: FileValidationConfig,
  ): Promise<ValidationResult> {
    // Check file size
    if (file.size > config.maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum of ${config.maxSize / (1024 * 1024)}MB`,
      };
    }

    // Get and normalize file type
    const fileType = this.normalizeFileType(file);

    // If no file type is provided and we can't determine it, check extensions
    if (!fileType && config.allowedExtensions && file instanceof File) {
      const extension = this.getFileExtension(file.name);
      if (!config.allowedExtensions.includes(extension)) {
        return {
          isValid: false,
          error: `Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`,
        };
      }
      // Extension is valid, continue
      return { isValid: true };
    }

    // Check MIME type
    if (fileType && !this.isAllowedMimeType(fileType, config.allowedMimeTypes)) {
      return {
        isValid: false,
        error: `Invalid file format (${fileType}). Allowed formats: ${config.allowedMimeTypes.join(', ')}`,
      };
    }

    // Validate image dimensions if required (excluding SVG)
    if (config.requireDimensions && fileType !== 'image/svg+xml' && fileType?.startsWith('image/')) {
      try {
        const dimensions = await this.getImageDimensions(file);
        const dimensionError = this.validateDimensions(dimensions, config.requireDimensions);
        if (dimensionError) {
          return { isValid: false, error: dimensionError };
        }
      } catch {
        // Skip dimension validation if we can't read the image
        console.warn('Unable to validate image dimensions');
      }
    }

    return { isValid: true };
  }

  /**
   * Validate using a preset configuration
   */
  static async validateWithPreset(
    file: File | Blob,
    preset: keyof typeof FILE_VALIDATION_PRESETS,
  ): Promise<ValidationResult> {
    return this.validate(file, FILE_VALIDATION_PRESETS[preset]);
  }

  /**
   * Get normalized MIME type from file
   */
  static normalizeFileType(file: File | Blob): string {
    const fileType = (file.type || '').toLowerCase();

    // Handle jpeg/jpg equivalence
    if (fileType === 'image/jpg') {
      return 'image/jpeg';
    }

    return fileType;
  }

  /**
   * Check if MIME type is allowed
   */
  private static isAllowedMimeType(fileType: string, allowedTypes: readonly string[]): boolean {
    // Normalize allowed types for comparison
    const normalizedAllowed = allowedTypes.map((type) => {
      const normalized = type.toLowerCase();
      return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
    });

    return normalizedAllowed.includes(fileType);
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? (parts[parts.length - 1] ?? '').toLowerCase() : '';
  }

  /**
   * Get extension from MIME type
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const normalized = (mimeType || '').toLowerCase();
    return MIME_TYPE_EXTENSIONS[normalized] || 'bin';
  }

  /**
   * Get MIME type from extension
   */
  static getMimeTypeFromExtension(extension: string): string | undefined {
    const ext = extension.toLowerCase();
    for (const [mime, mappedExt] of Object.entries(MIME_TYPE_EXTENSIONS)) {
      if (mappedExt === ext) {
        return mime;
      }
    }
    return undefined;
  }

  /**
   * Get image dimensions from file
   */
  private static async getImageDimensions(
    file: File | Blob,
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        // Server-side or no Image API available
        reject(new Error('Image dimension validation not available in this environment'));
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Validate image dimensions against requirements
   */
  private static validateDimensions(
    dimensions: { width: number; height: number },
    requirements: ImageDimensions,
  ): string | null {
    const { minWidth, minHeight, maxWidth, maxHeight } = requirements;

    if (minWidth && dimensions.width < minWidth) {
      return `Image width must be at least ${minWidth}px`;
    }
    if (minHeight && dimensions.height < minHeight) {
      return `Image height must be at least ${minHeight}px`;
    }
    if (maxWidth && dimensions.width > maxWidth) {
      return `Image width must not exceed ${maxWidth}px`;
    }
    if (maxHeight && dimensions.height > maxHeight) {
      return `Image height must not exceed ${maxHeight}px`;
    }

    return null;
  }

  /**
   * Check if a file is an image based on MIME type
   */
  static isImage(file: File | Blob): boolean {
    const mimeType = this.normalizeFileType(file);
    return mimeType.startsWith('image/');
  }

  /**
   * Check if a file is a document (PDF, etc.)
   */
  static isDocument(file: File | Blob): boolean {
    const mimeType = this.normalizeFileType(file);
    return mimeType === 'application/pdf'
      || mimeType.startsWith('application/')
      || mimeType.startsWith('text/');
  }
}

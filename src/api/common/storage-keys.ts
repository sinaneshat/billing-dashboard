/**
 * Centralized storage key management utilities
 * Provides consistent key generation, validation, and parsing
 */

export enum StoragePurpose {
  USER_AVATAR = 'user_avatar',
  COMPANY_LOGO = 'company_logo',
  COMPANY_BANNER = 'company_banner',
  DOCUMENT = 'document',
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  TEMP = 'temp',
}

export const STORAGE_PATH_PREFIXES: Record<StoragePurpose, string> = {
  [StoragePurpose.USER_AVATAR]: 'images/avatar',
  [StoragePurpose.COMPANY_LOGO]: 'images/logo',
  [StoragePurpose.COMPANY_BANNER]: 'images/banner',
  [StoragePurpose.DOCUMENT]: 'documents',
  [StoragePurpose.RECEIPT]: 'receipts',
  [StoragePurpose.INVOICE]: 'invoices',
  [StoragePurpose.TEMP]: 'temp',
};

export type StorageKeyInfo = {
  purpose: StoragePurpose;
  entityType: 'user' | 'organization' | 'temp';
  entityId: string;
  filename: string;
  extension: string;
  timestamp?: number;
};

/**
 * Storage key management utility
 */
export class StorageKeyManager {
  /**
   * Generate a storage key for a file
   */
  static generateKey(
    purpose: StoragePurpose,
    entityId: string,
    extension: string,
    options: { timestamp?: boolean; randomSuffix?: boolean } = {},
  ): string {
    const prefix = STORAGE_PATH_PREFIXES[purpose];
    const parts = [prefix, entityId];

    // Build filename
    const filenameParts: string[] = [];
    if (options.timestamp !== false) {
      filenameParts.push(Date.now().toString());
    }
    if (options.randomSuffix !== false) {
      const suffix = Math.random().toString(36).substring(2, 8);
      filenameParts.push(suffix);
    }

    // Ensure we have at least one part for the filename
    const filename = filenameParts.length > 0 ? filenameParts.join('-') : 'file';

    parts.push(`${filename}.${extension}`);
    return parts.join('/');
  }

  /**
   * Generate a temporary upload key
   */
  static generateTempKey(userId: string, extension: string): string {
    return this.generateKey(StoragePurpose.TEMP, userId, extension, {
      timestamp: true,
      randomSuffix: true,
    });
  }

  /**
   * Validate a storage key format and prevent path traversal
   */
  static validateKey(key: string): boolean {
    // Prevent path traversal attacks
    if (key.includes('..') || key.includes('//') || key.startsWith('/')) {
      return false;
    }

    // Check if key starts with a valid prefix
    const validPrefixes = Object.values(STORAGE_PATH_PREFIXES);
    const hasValidPrefix = validPrefixes.some(prefix => key.startsWith(`${prefix}/`));

    // Also allow temp uploads with proper structure
    if (!hasValidPrefix && !key.startsWith('temp/')) {
      return false;
    }

    // Ensure proper structure (at least 3 segments: prefix/entityId/filename)
    const segments = key.split('/');
    if (segments.length < 3) {
      return false;
    }

    return true;
  }

  /**
   * Extract purpose from a storage key
   */
  static extractPurpose(key: string): StoragePurpose | null {
    for (const [purpose, prefix] of Object.entries(STORAGE_PATH_PREFIXES)) {
      if (key.startsWith(`${prefix}/`)) {
        return purpose as StoragePurpose;
      }
    }
    return null;
  }

  /**
   * Parse a storage key into its components
   */
  static parseKey(key: string): StorageKeyInfo | null {
    const purpose = this.extractPurpose(key);
    if (!purpose) {
      return null;
    }

    const prefix = STORAGE_PATH_PREFIXES[purpose];
    const remainingPath = key.substring(prefix.length + 1); // +1 for the slash
    const segments = remainingPath.split('/');

    if (segments.length < 2) {
      return null;
    }

    const entityId = segments[0];
    const filename = segments[segments.length - 1];

    // Ensure filename exists
    if (!filename) {
      return null;
    }

    const extensionMatch = filename.match(/\.([^.]+)$/);
    const extension = extensionMatch ? extensionMatch[1] : '';

    // Determine entity type based on purpose
    let entityType: 'user' | 'organization' | 'temp';
    if (purpose === StoragePurpose.USER_AVATAR) {
      entityType = 'user';
    } else if (purpose === StoragePurpose.TEMP) {
      entityType = 'temp';
    } else {
      entityType = 'organization';
    }

    // Try to extract timestamp if present
    const timestampMatch = filename.match(/^(\d{13})/);
    const timestamp = timestampMatch?.[1] ? Number.parseInt(timestampMatch[1], 10) : undefined;

    return {
      purpose,
      entityType,
      entityId: entityId || '',
      filename,
      extension: extension || '',
      timestamp,
    };
  }

  /**
   * Validate that a key matches expected ownership
   */
  static validateOwnership(
    key: string,
    expectedUserId?: string,
    expectedOrgId?: string,
  ): { isValid: boolean; reason?: string } {
    const keyInfo = this.parseKey(key);
    if (!keyInfo) {
      return { isValid: false, reason: 'Invalid key format' };
    }

    // Check user ownership for user-specific resources
    if (keyInfo.entityType === 'user' && expectedUserId) {
      if (keyInfo.entityId !== expectedUserId) {
        return { isValid: false, reason: 'Key does not match user ID' };
      }
    }

    // Check organization ownership for org-specific resources
    if (keyInfo.entityType === 'organization' && expectedOrgId) {
      if (keyInfo.entityId !== expectedOrgId) {
        return { isValid: false, reason: 'Key does not match organization ID' };
      }
    }

    return { isValid: true };
  }

  /**
   * Build a storage key from components
   */
  static buildKey(info: StorageKeyInfo): string {
    const prefix = STORAGE_PATH_PREFIXES[info.purpose];
    return `${prefix}/${info.entityId}/${info.filename}`;
  }

  /**
   * Get all valid storage prefixes
   */
  static getAllPrefixes(): string[] {
    return Object.values(STORAGE_PATH_PREFIXES);
  }

  /**
   * Check if a key represents a public asset (e.g., company logos)
   */
  static isPublicAsset(key: string): boolean {
    const purpose = this.extractPurpose(key);
    return purpose === StoragePurpose.COMPANY_LOGO;
  }

  /**
   * Get the expected entity type for a purpose
   */
  static getEntityType(purpose: StoragePurpose): 'user' | 'organization' | 'temp' {
    switch (purpose) {
      case StoragePurpose.USER_AVATAR:
        return 'user';
      case StoragePurpose.TEMP:
        return 'temp';
      default:
        return 'organization';
    }
  }

  /**
   * Migrate an old key format to the new format
   */
  static migrateKey(oldKey: string, purpose: StoragePurpose): string | null {
    // Extract filename from old key
    const segments = oldKey.split('/');
    const filename = segments[segments.length - 1];

    // Ensure filename exists
    if (!filename) {
      return null;
    }

    const extensionMatch = filename.match(/\.([^.]+)$/);
    const extension = extensionMatch?.[1] || 'bin';

    // Try to extract entity ID from old format
    // This assumes old format might be like: uploads/userId/filename
    if (segments.length >= 2) {
      const entityId = segments[segments.length - 2];
      if (!entityId) {
        return null;
      }
      return this.generateKey(purpose, entityId, extension);
    }

    return null;
  }
}

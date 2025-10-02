/**
 * Application Constants
 *
 * Centralized constants for magic numbers, URLs, timeouts, limits,
 * and other hardcoded values used throughout the application.
 *
 * This file provides a single source of truth for all constants,
 * making them easier to maintain and update.
 */

// ============================================================================
// APPLICATION METADATA
// ============================================================================

export const APPLICATION = {
  NAME: 'Roundtable Dashboard',
  DESCRIPTION: 'AI collaboration platform where multiple models brainstorm together',
  VERSION: '1.0.0',
  AUTHOR: 'Roundtable Team',

  // URLs and endpoints - dynamically determined based on environment
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL
    || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:3000'),
  API_BASE_PATH: '/api',
  API_VERSION: 'v1',

  // Localization
  LOCALE: 'en-US',
  TIMEZONE: 'UTC',
  COUNTRY_CODE: 'US',
} as const;

// ============================================================================
// API CONSTANTS
// ============================================================================

export const API = {
  // Timeouts (in milliseconds)
  REQUEST_TIMEOUT: 30_000, // 30 seconds
  DATABASE_TIMEOUT: 10_000, // 10 seconds
  EXTERNAL_SERVICE_TIMEOUT: 15_000, // 15 seconds

  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Response limits
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_QUERY_DEPTH: 10,

  // Request size limits (in bytes)
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_JSON_SIZE: 1 * 1024 * 1024, // 1MB
  MAX_FORM_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

// ============================================================================
// AUTHENTICATION CONSTANTS
// ============================================================================

export const AUTH = {
  // Session configuration
  SESSION_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  REFRESH_TOKEN_DURATION: 90 * 24 * 60 * 60 * 1000, // 90 days

  // Token expiry times
  ACCESS_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
  RESET_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
  VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  INVITATION_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: false,

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  MAX_PASSWORD_RESETS_PER_HOUR: 3,
} as const;

// ============================================================================
// FILE UPLOAD CONSTANTS
// ============================================================================

export const FILE_UPLOAD = {
  // Size limits (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB

  // Allowed file types
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  AVATAR_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Upload limits
  MAX_FILES_PER_REQUEST: 5,
  MAX_UPLOADS_PER_USER_PER_DAY: 50,

  // Image dimensions
  MAX_IMAGE_WIDTH: 4000,
  MAX_IMAGE_HEIGHT: 4000,
  AVATAR_SIZE: 200,
  THUMBNAIL_SIZE: 150,
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION = {
  // String lengths
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 1000,
  MESSAGE_MAX_LENGTH: 500,
  BIO_MAX_LENGTH: 500,
  TITLE_MAX_LENGTH: 200,

  // Email validation
  EMAIL_MAX_LENGTH: 254,
  EMAIL_REGEX: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,

  // URL validation
  URL_MAX_LENGTH: 2000,
  URL_REGEX: /^https?:\/\/.+/,

  // UUID validation
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// ============================================================================
// CACHING CONSTANTS
// ============================================================================

export const CACHE = {
  // TTL values (in milliseconds)
  SHORT_TTL: 5 * 60 * 1000, // 5 minutes
  MEDIUM_TTL: 30 * 60 * 1000, // 30 minutes
  LONG_TTL: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG_TTL: 24 * 60 * 60 * 1000, // 24 hours

  // Specific cache times
  USER_SESSION_TTL: 30 * 60 * 1000, // 30 minutes

  // Cache keys prefixes
  PREFIX: {
    USER: 'user:',
    SESSION: 'session:',
  },
} as const;

// ============================================================================
// EMAIL CONSTANTS
// ============================================================================

export const EMAIL = {
  // Sender information
  DEFAULT_FROM_NAME: 'Roundtable',
  DEFAULT_FROM_EMAIL: 'noreply@roundtable.now',
  SUPPORT_EMAIL: 'support@roundtable.now',

  // Template types
  TEMPLATES: {
    WELCOME: 'welcome',
    EMAIL_VERIFICATION: 'email-verification',
    PASSWORD_RESET: 'password-reset',
  },

  // Rate limiting
  MAX_EMAILS_PER_USER_PER_HOUR: 5,
  MAX_EMAILS_PER_USER_PER_DAY: 20,

  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5_000, // 5 seconds
} as const;

// ============================================================================
// LOGGING CONSTANTS
// ============================================================================

export const LOGGING = {
  // Log levels
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4,
  },

  // Log rotation
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_FILES: 5,

  // Sensitive fields to redact
  SENSITIVE_FIELDS: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
  ],
} as const;

// ============================================================================
// ERROR CONSTANTS
// ============================================================================

export const ERRORS = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  },

  // Error code prefixes
  PREFIXES: {
    AUTH: 'AUTH_',
    VALIDATION: 'VAL_',
    SYSTEM: 'SYS_',
  },
} as const;

// ============================================================================
// DEVELOPMENT CONSTANTS
// ============================================================================

export const DEVELOPMENT = {
  // Debugging
  ENABLE_QUERY_LOGGING: process.env.NODE_ENV === 'development',
  ENABLE_DEBUG_HEADERS: process.env.NODE_ENV === 'development',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert milliseconds to seconds
 */
export function msToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

/**
 * Convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/**
 * Convert hours to milliseconds
 */
export function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

/**
 * Convert days to milliseconds
 */
export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ApplicationConstant = typeof APPLICATION;
export type ApiConstant = typeof API;
export type AuthConstant = typeof AUTH;
export type FileUploadConstant = typeof FILE_UPLOAD;
export type ValidationConstant = typeof VALIDATION;
export type CacheConstant = typeof CACHE;
export type EmailConstant = typeof EMAIL;
export type LoggingConstant = typeof LOGGING;
export type ErrorConstant = typeof ERRORS;
export type DevelopmentConstant = typeof DEVELOPMENT;

// Default export with all constants
export default {
  APPLICATION,
  API,
  AUTH,
  FILE_UPLOAD,
  VALIDATION,
  CACHE,
  EMAIL,
  LOGGING,
  ERRORS,
  DEVELOPMENT,

  // Helper functions
  msToSeconds,
  secondsToMs,
  minutesToMs,
  hoursToMs,
  daysToMs,
} as const;

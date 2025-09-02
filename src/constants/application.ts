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
  NAME: 'Roundtable Billing Dashboard',
  DESCRIPTION: 'Advanced billing solutions for AI collaboration platforms',
  VERSION: '1.0.0',
  AUTHOR: 'Roundtable Team',

  // URLs and endpoints
  BASE_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  API_BASE_PATH: '/api',
  API_VERSION: 'v1',

  // Localization
  LOCALE: 'en-US',
  TIMEZONE: 'Asia/Tehran',
  CURRENCY: 'USD', // Database stores USD, API converts to Rials
  COUNTRY_CODE: 'IR',
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
  WEBHOOK_RATE_LIMIT: 10, // per minute

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
// PAYMENT CONSTANTS
// ============================================================================

export const PAYMENT = {
  // ZarinPal configuration
  ZARINPAL_BASE_URL: 'https://api.zarinpal.com',
  ZARINPAL_SANDBOX_URL: 'https://sandbox.zarinpal.com',
  ZARINPAL_GATEWAY_URL: 'https://www.zarinpal.com/pg/StartPay',
  ZARINPAL_SANDBOX_GATEWAY_URL: 'https://sandbox.zarinpal.com/pg/StartPay',

  // Iranian Rial limits
  MIN_AMOUNT: 1_000, // 1,000 Rials (~$0.024)
  MAX_AMOUNT: 500_000_000, // 500M Rials (~$12,000)
  MAX_DAILY_AMOUNT: 50_000_000, // 50M Rials (~$1,200)

  // Transaction limits
  MAX_TRANSACTIONS_PER_DAY: 10,
  MAX_TRANSACTIONS_PER_MONTH: 100,
  MAX_FAILED_ATTEMPTS: 3,

  // Timeouts
  PAYMENT_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  VERIFICATION_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  CALLBACK_TIMEOUT: 30_000, // 30 seconds

  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2_000, // 2 seconds
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;

// ============================================================================
// SUBSCRIPTION CONSTANTS
// ============================================================================

export const SUBSCRIPTION = {
  // Billing periods (in days)
  MONTHLY_DAYS: 30,
  YEARLY_DAYS: 365,

  // Trial periods (in days)
  DEFAULT_TRIAL_DAYS: 7,
  EXTENDED_TRIAL_DAYS: 14,
  MAX_TRIAL_DAYS: 30,

  // Grace periods (in days)
  PAYMENT_GRACE_PERIOD: 3,
  CANCELLATION_GRACE_PERIOD: 1,
  REACTIVATION_GRACE_PERIOD: 30,

  // Limits
  MAX_SUBSCRIPTIONS_PER_USER: 5,
  MAX_PLAN_CHANGES_PER_MONTH: 2,

  // Prorations
  PRORATION_ENABLED: true,
  MIN_PRORATION_AMOUNT: 1_000, // 1,000 Rials
} as const;

// ============================================================================
// DIRECT DEBIT CONSTANTS
// ============================================================================

export const DIRECT_DEBIT = {
  // Contract configuration
  CONTRACT_DURATION_DAYS: 365, // 1 year
  AUTO_RENEWAL_ENABLED: true,

  // Banking limits (ZarinPal Payman limits)
  DAILY_TRANSACTION_LIMIT: 10,
  MONTHLY_TRANSACTION_LIMIT: 100,
  MAX_AMOUNT_PER_TRANSACTION: 500_000, // 500,000 Toman = 5,000,000 Rials

  // Contract statuses
  STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    SUSPENDED: 'suspended',
  },

  // Supported banks
  SUPPORTED_BANKS: [
    'mellat',
    'melli',
    'sepah',
    'tejarat',
    'saderat',
    'postbank',
    'keshavarzi',
    'maskan',
    'refah',
    'ansar',
    'parsian',
    'pasargad',
    'karafarin',
    'iran_zamin',
    'shahr',
    'day',
    'middle_east',
  ],
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

  // Iranian national ID validation
  NATIONAL_ID_LENGTH: 10,
  NATIONAL_ID_REGEX: /^\d{10}$/,

  // Mobile number validation (Iranian format)
  MOBILE_REGEX: /^(\+98|0)?9\d{9}$/,
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

  // Iranian postal code
  POSTAL_CODE_REGEX: /^\d{5}-?\d{5}$/,

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
  PRODUCT_LIST_TTL: 60 * 60 * 1000, // 1 hour
  SUBSCRIPTION_TTL: 10 * 60 * 1000, // 10 minutes
  PAYMENT_METHOD_TTL: 5 * 60 * 1000, // 5 minutes

  // Cache keys prefixes
  PREFIX: {
    USER: 'user:',
    PRODUCT: 'product:',
    SUBSCRIPTION: 'subscription:',
    PAYMENT: 'payment:',
    SESSION: 'session:',
  },
} as const;

// ============================================================================
// EMAIL CONSTANTS
// ============================================================================

export const EMAIL = {
  // Sender information
  DEFAULT_FROM_NAME: 'Roundtable Billing',
  DEFAULT_FROM_EMAIL: 'noreply@roundtable.now',
  SUPPORT_EMAIL: 'support@roundtable.now',

  // Template types
  TEMPLATES: {
    WELCOME: 'welcome',
    EMAIL_VERIFICATION: 'email-verification',
    PASSWORD_RESET: 'password-reset',
    PAYMENT_SUCCESS: 'payment-success',
    PAYMENT_FAILED: 'payment-failed',
    SUBSCRIPTION_CREATED: 'subscription-created',
    SUBSCRIPTION_CANCELLED: 'subscription-cancelled',
    INVOICE: 'invoice',
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
    PAYMENT: 'PAY_',
    SUBSCRIPTION: 'SUB_',
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
  ENABLE_MOCK_PAYMENTS: false, // Always disabled - production ready only
} as const;

// ============================================================================
// PRODUCT TIERS
// ============================================================================

export const PRODUCT_TIERS = {
  STARTER: {
    ID: 'starter',
    NAME: 'Starter Plan',
    FEATURES: ['1GB Storage', '10GB Bandwidth', '1 User Account', 'Email Support'],
    PRICE: 990_000, // 9,900 IRR
    BILLING_PERIOD: 'monthly' as const,
    POPULAR: false,
  },

  PROFESSIONAL: {
    ID: 'professional',
    NAME: 'Professional Plan',
    FEATURES: ['10GB Storage', '100GB Bandwidth', '5 User Accounts', 'Priority Support'],
    PRICE: 4_900_000, // 49,000 IRR
    BILLING_PERIOD: 'monthly' as const,
    POPULAR: true,
  },

  BUSINESS: {
    ID: 'business',
    NAME: 'Business Plan',
    FEATURES: ['100GB Storage', '1TB Bandwidth', '25 User Accounts', '24/7 Support'],
    PRICE: 9_900_000, // 99,000 IRR
    BILLING_PERIOD: 'monthly' as const,
    POPULAR: false,
  },

  ENTERPRISE: {
    ID: 'enterprise',
    NAME: 'Enterprise Plan',
    FEATURES: ['Unlimited Storage', 'Unlimited Bandwidth', 'Unlimited Users', 'Dedicated Support'],
    PRICE: 29_900_000, // 299,000 IRR
    BILLING_PERIOD: 'monthly' as const,
    POPULAR: false,
  },
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

/**
 * Convert Iranian Rials to Toman (divide by 10)
 */
export function rialsToToman(rials: number): number {
  return Math.floor(rials / 10);
}

/**
 * Convert Toman to Iranian Rials (multiply by 10)
 */
export function tomanToRials(toman: number): number {
  return toman * 10;
}

/**
 * Format Iranian currency
 */
export function formatIranianCurrency(amount: number, unit: 'rial' | 'toman' = 'rial'): string {
  const formatter = new Intl.NumberFormat('en-US');
  const displayAmount = unit === 'toman' ? rialsToToman(amount) : amount;
  const unitLabel = unit === 'toman' ? 'Toman' : 'Rial';
  return `${formatter.format(displayAmount)} ${unitLabel}`;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ApplicationConstant = typeof APPLICATION;
export type ApiConstant = typeof API;
export type PaymentConstant = typeof PAYMENT;
export type SubscriptionConstant = typeof SUBSCRIPTION;
export type DirectDebitConstant = typeof DIRECT_DEBIT;
export type AuthConstant = typeof AUTH;
export type FileUploadConstant = typeof FILE_UPLOAD;
export type ValidationConstant = typeof VALIDATION;
export type CacheConstant = typeof CACHE;
export type EmailConstant = typeof EMAIL;
export type LoggingConstant = typeof LOGGING;
export type ErrorConstant = typeof ERRORS;
export type DevelopmentConstant = typeof DEVELOPMENT;
export type ProductTiersConstant = typeof PRODUCT_TIERS;

// Default export with all constants
export default {
  APPLICATION,
  API,
  PAYMENT,
  SUBSCRIPTION,
  DIRECT_DEBIT,
  AUTH,
  FILE_UPLOAD,
  VALIDATION,
  CACHE,
  EMAIL,
  LOGGING,
  ERRORS,
  DEVELOPMENT,
  PRODUCT_TIERS,

  // Helper functions
  msToSeconds,
  secondsToMs,
  minutesToMs,
  hoursToMs,
  daysToMs,
  rialsToToman,
  tomanToRials,
  formatIranianCurrency,
} as const;

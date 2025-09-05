/**
 * Environment Variable Validation Middleware
 *
 * Provides comprehensive validation of required environment variables
 * following production-ready practices with detailed error reporting
 * and integration with existing error handling patterns.
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { createError } from '@/api/common/error-handling';
import { validateEnvironmentVariables } from '@/api/common/fetch-utilities';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { SafeEnvironmentSummary } from '@/api/types/http';

// ============================================================================
// ENVIRONMENT VARIABLE DEFINITIONS
// ============================================================================

/**
 * Critical environment variables that must be present and valid
 * These are required for core application functionality
 */
export const CRITICAL_ENV_VARS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'NODE_ENV',
] as const;

/**
 * Payment-related environment variables
 * Required for payment processing functionality
 */
export const PAYMENT_ENV_VARS = [
  'ZARINPAL_MERCHANT_ID',
  'ZARINPAL_ACCESS_TOKEN',
] as const;

/**
 * Storage-related environment variables
 * Required for file upload and storage functionality
 */
export const STORAGE_ENV_VARS = [
  'R2_PUBLIC_URL',
  'CLOUDFLARE_ACCOUNT_ID',
  'SIGNED_URL_SECRET',
] as const;

/**
 * Communication-related environment variables
 * Required for email and webhook functionality
 */
export const COMMUNICATION_ENV_VARS = [
  'FROM_EMAIL',
  'AWS_SES_ACCESS_KEY_ID',
  'AWS_SES_SECRET_ACCESS_KEY',
  'AWS_SES_REGION',
] as const;

/**
 * Optional environment variables that have defaults or are feature-specific
 */
export const OPTIONAL_ENV_VARS = [
  'EXTERNAL_WEBHOOK_URL',
  'WEBHOOK_URL',
  'WEBHOOK_SECRET',
  'API_MASTER_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
] as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates URL format for environment variables
 */
function isValidUrl(value: string): boolean {
  try {
    void new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates email format
 */
function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validates ZarinPal merchant ID format
 */
function isValidZarinpalMerchantId(value: string): boolean {
  // ZarinPal merchant ID should be 36 characters UUID-like format
  const merchantIdRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  return merchantIdRegex.test(value);
}

/**
 * Validates AWS region format
 */
function isValidAwsRegion(value: string): boolean {
  const regionRegex = /^[a-z]{2}-[a-z]+-\d+$/;
  return regionRegex.test(value);
}

/**
 * Comprehensive environment variable validation with detailed error reporting
 */
export function validateEnvironmentConfiguration(env: CloudflareEnv): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingCritical: string[];
  missingOptional: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];

  // Check critical environment variables
  for (const varName of CRITICAL_ENV_VARS) {
    if (!env[varName]) {
      missingCritical.push(varName);
      errors.push(`Missing critical environment variable: ${varName}`);
    }
  }

  // Validate specific environment variable formats
  if (env.BETTER_AUTH_URL && !isValidUrl(env.BETTER_AUTH_URL)) {
    errors.push('BETTER_AUTH_URL must be a valid URL');
  }

  if (env.DATABASE_URL && !isValidUrl(env.DATABASE_URL)) {
    errors.push('DATABASE_URL must be a valid URL');
  }

  if (env.R2_PUBLIC_URL && !isValidUrl(env.R2_PUBLIC_URL)) {
    errors.push('R2_PUBLIC_URL must be a valid URL');
  }

  // Validate payment-related variables
  if (env.ZARINPAL_MERCHANT_ID) {
    if (!isValidZarinpalMerchantId(env.ZARINPAL_MERCHANT_ID)) {
      errors.push('ZARINPAL_MERCHANT_ID must be a valid UUID format');
    }

    // Check for placeholder values
    const placeholderPatterns = ['your-merchant-id', 'merchant_id', 'xxx', '000'];
    const isPlaceholder = placeholderPatterns.some(pattern =>
      env.ZARINPAL_MERCHANT_ID!.toLowerCase().includes(pattern),
    );

    if (isPlaceholder) {
      if (env.NODE_ENV === 'production') {
        errors.push('ZARINPAL_MERCHANT_ID appears to be a placeholder value in production');
      } else {
        warnings.push('ZARINPAL_MERCHANT_ID appears to be a placeholder value');
      }
    }
  } else {
    missingOptional.push('ZARINPAL_MERCHANT_ID');
  }

  if (!env.ZARINPAL_ACCESS_TOKEN) {
    missingOptional.push('ZARINPAL_ACCESS_TOKEN');
  }

  // Validate email configuration
  if (env.FROM_EMAIL && !isValidEmail(env.FROM_EMAIL)) {
    errors.push('FROM_EMAIL must be a valid email address');
  }

  if (env.SES_REPLY_TO_EMAIL && !isValidEmail(env.SES_REPLY_TO_EMAIL)) {
    errors.push('SES_REPLY_TO_EMAIL must be a valid email address');
  }

  if (env.SES_VERIFIED_EMAIL && !isValidEmail(env.SES_VERIFIED_EMAIL)) {
    errors.push('SES_VERIFIED_EMAIL must be a valid email address');
  }

  // Validate AWS configuration
  if (env.AWS_SES_REGION && !isValidAwsRegion(env.AWS_SES_REGION)) {
    errors.push('AWS_SES_REGION must be a valid AWS region format (e.g., us-east-1)');
  }

  // Check for missing communication variables (as a group)
  const hasSomeEmailConfig = COMMUNICATION_ENV_VARS.some(varName => env[varName]);
  const hasAllEmailConfig = COMMUNICATION_ENV_VARS.every(varName => env[varName]);

  if (hasSomeEmailConfig && !hasAllEmailConfig) {
    const missingEmailVars = COMMUNICATION_ENV_VARS.filter(varName => !env[varName]);
    warnings.push(`Incomplete email configuration - missing: ${missingEmailVars.join(', ')}`);
  }

  // Validate numeric environment variables
  const numericVars = [
    'ZARINPAL_DEFAULT_CONTRACT_DURATION_DAYS',
    'ZARINPAL_DEFAULT_MAX_DAILY_COUNT',
    'ZARINPAL_DEFAULT_MAX_MONTHLY_COUNT',
    'ZARINPAL_DEFAULT_MAX_AMOUNT',
    'CARD_VERIFICATION_AMOUNT',
  ];

  for (const varName of numericVars) {
    if (env[varName as keyof CloudflareEnv] && Number.isNaN(Number(env[varName as keyof CloudflareEnv]))) {
      errors.push(`${varName} must be a valid number`);
    }
  }

  // Validate boolean environment variables
  const booleanVars = ['OPEN_NEXT_DEBUG', 'NEXT_PUBLIC_MAINTENANCE'];

  for (const varName of booleanVars) {
    if (env[varName as keyof CloudflareEnv] && !['true', 'false'].includes(env[varName as keyof CloudflareEnv] as string)) {
      warnings.push(`${varName} should be 'true' or 'false'`);
    }
  }

  // Check for required Cloudflare bindings
  if (!env.DB) {
    errors.push('Missing required Cloudflare D1 database binding (DB)');
  }

  if (!env.UPLOADS_R2_BUCKET) {
    warnings.push('Missing R2 bucket binding (UPLOADS_R2_BUCKET) - file upload functionality will be unavailable');
  }

  if (!env.KV) {
    warnings.push('Missing KV namespace binding (KV) - caching functionality may be limited');
  }

  const isValid = errors.length === 0 && missingCritical.length === 0;

  return {
    isValid,
    errors,
    warnings,
    missingCritical,
    missingOptional,
  };
}

// ============================================================================
// MIDDLEWARE IMPLEMENTATION
// ============================================================================

/**
 * Environment validation middleware that runs on application startup
 * Validates all required environment variables and provides detailed error reporting
 */
export function createEnvironmentValidationMiddleware() {
  return async (c: { env: CloudflareEnv }, next: () => Promise<void>) => {
    // Skip validation in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const validation = validateEnvironmentConfiguration(c.env);

    // Log validation results
    if (!validation.isValid) {
      apiLogger.error('Environment validation failed', {
        errors: validation.errors,
        missingCritical: validation.missingCritical,
        component: 'environment-validation',
      });

      // In production, fail fast on critical errors
      if (c.env.NODE_ENV === 'production' && validation.missingCritical.length > 0) {
        throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
          message: 'Application misconfiguration detected',
        });
      }

      // In development, provide detailed error information
      if (c.env.NODE_ENV === 'development') {
        const errorDetails = [
          ...validation.errors,
          ...validation.missingCritical.map(v => `Missing critical: ${v}`),
        ].join('\n');

        throw createError.internal(`Environment validation failed:\n${errorDetails}`);
      }
    }

    // Log warnings even if validation passes
    if (validation.warnings.length > 0) {
      apiLogger.warn('Environment validation warnings', {
        warnings: validation.warnings,
        missingOptional: validation.missingOptional,
        component: 'environment-validation',
      });
    }

    // Log successful validation in debug mode
    if (validation.isValid) {
      apiLogger.debug('Environment validation passed', {
        warningCount: validation.warnings.length,
        missingOptionalCount: validation.missingOptional.length,
        component: 'environment-validation',
      });
    }

    return next();
  };
}

/**
 * Validates specific environment variables required for a service
 * Can be used by individual services for targeted validation
 */
export function validateServiceEnvironment(
  env: CloudflareEnv,
  required: readonly (keyof CloudflareEnv)[],
  serviceName: string,
): void {
  try {
    // Use the original env parameter directly since validateEnvironmentVariables expects CloudflareEnv
    validateEnvironmentVariables(env, [...required]);
  } catch (error) {
    apiLogger.error(`${serviceName} environment validation failed`, {
      error: error instanceof Error ? error.message : String(error),
      required,
      component: 'service-environment-validation',
    });
    throw error;
  }
}

/**
 * Health check function that returns environment validation status
 * Can be used by health check endpoints
 */
export function getEnvironmentHealthStatus(env: CloudflareEnv): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  validation: ReturnType<typeof validateEnvironmentConfiguration>;
} {
  const validation = validateEnvironmentConfiguration(env);

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (validation.errors.length > 0 || validation.missingCritical.length > 0) {
    status = 'unhealthy';
  } else if (validation.warnings.length > 0 || validation.missingOptional.length > 3) {
    status = 'degraded';
  }

  return { status, validation };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a development-friendly environment configuration summary
 * Safe for logging (excludes sensitive values)
 * Using discriminated union pattern for maximum type safety (Context7 Pattern)
 */
export function createEnvironmentSummary(env: CloudflareEnv): SafeEnvironmentSummary {
  // Determine database connection status
  let databaseStatus: 'connected' | 'disconnected' | 'pending' = 'pending';
  if (env.DATABASE_URL) {
    // In a real implementation, you might test the connection
    databaseStatus = 'connected';
  } else {
    databaseStatus = 'disconnected';
  }

  // Determine payment gateway status
  let paymentStatus: 'configured' | 'missing' | 'invalid' = 'missing';
  if (env.ZARINPAL_MERCHANT_ID && env.ZARINPAL_ACCESS_TOKEN) {
    // Basic validation - in reality you'd validate the format/connectivity
    const isValidMerchantId = isValidZarinpalMerchantId(env.ZARINPAL_MERCHANT_ID);
    paymentStatus = isValidMerchantId ? 'configured' : 'invalid';
  }

  // Determine storage status
  let storageStatus: 'configured' | 'missing' | 'invalid' = 'missing';
  if (env.R2_PUBLIC_URL && env.CLOUDFLARE_ACCOUNT_ID && env.SIGNED_URL_SECRET) {
    const isValidR2Url = isValidUrl(env.R2_PUBLIC_URL);
    storageStatus = isValidR2Url ? 'configured' : 'invalid';
  }

  return {
    NODE_ENV: env.NODE_ENV || 'development',
    LOG_LEVEL: 'info',
    ENVIRONMENT_VERIFIED: !!(env.DATABASE_URL && env.BETTER_AUTH_SECRET && env.BETTER_AUTH_URL),
    DATABASE_CONNECTION_STATUS: databaseStatus,
    PAYMENT_GATEWAY_STATUS: paymentStatus,
    STORAGE_STATUS: storageStatus,
    TIMESTAMP: new Date().toISOString(),
  };
}

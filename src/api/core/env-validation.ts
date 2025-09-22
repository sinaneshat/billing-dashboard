/**
 * Environment Configuration Validation
 * Production-ready environment variable validation with security checks
 */

import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { apiLogger } from '@/api/middleware/hono-logger';

type EnvironmentConfig = {
  NODE_ENV: string;
  BETTER_AUTH_SECRET: string;
  NEXT_PUBLIC_ZARINPAL_MERCHANT_ID: string;
  ZARINPAL_ACCESS_TOKEN: string;
  CARD_VERIFICATION_AMOUNT?: string;
  CARD_VERIFICATION_DESCRIPTION?: string;
  EXTERNAL_WEBHOOK_URL?: string;
  AWS_SES_ACCESS_KEY_ID?: string;
  AWS_SES_SECRET_ACCESS_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  SIGNED_URL_SECRET?: string;
};

const PLACEHOLDER_VALUES = [
  'your-secret-key-here-change-in-production',
  'YOUR_ACTUAL_MERCHANT_ID_HERE',
  'YOUR_ACTUAL_ACCESS_TOKEN_HERE',
  'your-zarinpal-access-token',
  '00000000-0000-0000-0000-000000000000',
  'your-aws-ses-access-key',
  'your-aws-ses-secret-key',
  'your-signed-url-secret',
];

const ZARINPAL_SANDBOX_VALUES = [
  '36e0ea98-43fa-400d-a421-f7593b1c73bc', // Official sandbox merchant ID
  'zp-sandbox-access-token', // Official sandbox access token
];

const WEAK_SECRETS = [
  'secret',
  'password',
  'test',
  '123456',
  'changeme',
  'default',
];

/**
 * Validate environment configuration for production readiness
 */
export function validateEnvironmentConfig(env: Record<string, string | undefined>): EnvironmentConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required = [
    'NODE_ENV',
    'BETTER_AUTH_SECRET',
    'NEXT_PUBLIC_ZARINPAL_MERCHANT_ID',
    'ZARINPAL_ACCESS_TOKEN',
  ];

  // Check for missing required variables
  for (const key of required) {
    if (!env[key] || typeof env[key] !== 'string' || (env[key] as string).trim() === '') {
      // Only warn during build time, don't fail
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        warnings.push(`Missing required environment variable: ${key} (build time)`);
      } else {
        errors.push(`Missing required environment variable: ${key}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `Environment configuration errors:\n${errors.join('\n')}`,
    });
  }

  // Production-specific validations
  if (env.NODE_ENV === 'production') {
    // Check for placeholder values in production
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string' && PLACEHOLDER_VALUES.includes(value)) {
        errors.push(`Production deployment detected with placeholder value for ${key}. Please set real credentials.`);
      }
    }

    // Validate ZarinPal merchant ID format
    if (env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID) {
      const merchantIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!merchantIdPattern.test(env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID as string)) {
        errors.push('NEXT_PUBLIC_ZARINPAL_MERCHANT_ID must be a valid UUID format in production');
      }
    }

    // Validate secret strength in production
    if (env.BETTER_AUTH_SECRET) {
      const secret = env.BETTER_AUTH_SECRET as string;
      if (secret.length < 32) {
        errors.push('BETTER_AUTH_SECRET must be at least 32 characters in production');
      }
      if (WEAK_SECRETS.some(weak => secret.toLowerCase().includes(weak))) {
        errors.push('BETTER_AUTH_SECRET appears to be weak. Use a strong random string in production.');
      }
    }
  }

  // Development-specific warnings
  if (env.NODE_ENV === 'development') {
    if (PLACEHOLDER_VALUES.includes(env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID as string)
      || PLACEHOLDER_VALUES.includes(env.ZARINPAL_ACCESS_TOKEN as string)) {
      warnings.push('Using placeholder ZarinPal credentials in development. Payment features will not work properly.');
    } else if (ZARINPAL_SANDBOX_VALUES.includes(env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID as string)
      || ZARINPAL_SANDBOX_VALUES.includes(env.ZARINPAL_ACCESS_TOKEN as string)) {
      apiLogger.info('Using official ZarinPal sandbox credentials for development', {
        logType: 'auth',
        userId: 'system',
        action: 'permission_check',
        success: true,
        environment: 'development',
      });
    }
  }

  // Validate card verification amount
  if (env.CARD_VERIFICATION_AMOUNT) {
    const amount = Number.parseInt(env.CARD_VERIFICATION_AMOUNT as string, 10);
    if (Number.isNaN(amount) || amount < 100) {
      errors.push('CARD_VERIFICATION_AMOUNT must be a valid number >= 100 IRR');
    }
  }

  // Validate external webhook URL format
  if (env.EXTERNAL_WEBHOOK_URL) {
    try {
      const url = new URL(env.EXTERNAL_WEBHOOK_URL as string);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('EXTERNAL_WEBHOOK_URL must be a valid HTTP/HTTPS URL');
      }
    } catch {
      errors.push('EXTERNAL_WEBHOOK_URL must be a valid URL');
    }
  }

  if (errors.length > 0) {
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: `Environment configuration errors:\n${errors.join('\n')}`,
    });
  }

  // Log warnings
  if (warnings.length > 0) {
    apiLogger.warn('Environment configuration warnings', {
      logType: 'validation',
      fieldCount: warnings.length,
      validationType: 'headers',
      warnings,
    });
  }

  apiLogger.info(`Environment configuration validated for ${env.NODE_ENV} environment`, {
    logType: 'validation',
    fieldCount: Object.keys(env).length,
    validationType: 'headers',
    environment: env.NODE_ENV,
  });

  return env as EnvironmentConfig;
}

/**
 * Get validated environment configuration
 * Throws error if validation fails
 */
export function getValidatedEnv(): EnvironmentConfig {
  return validateEnvironmentConfig(process.env);
}

/**
 * Check if current environment is production
 */
export function isProduction(env?: EnvironmentConfig): boolean {
  const environment = env || process.env;
  return environment.NODE_ENV === 'production';
}

/**
 * Check if current environment is development
 */
export function isDevelopment(env?: EnvironmentConfig): boolean {
  const environment = env || process.env;
  return environment.NODE_ENV === 'development';
}

/**
 * Validate ZarinPal configuration specifically
 */
export function validateZarinPalConfig(env: EnvironmentConfig): void {
  if (!env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID || !env.ZARINPAL_ACCESS_TOKEN) {
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'ZarinPal credentials not configured. Set NEXT_PUBLIC_ZARINPAL_MERCHANT_ID and ZARINPAL_ACCESS_TOKEN.',
    });
  }

  if (isProduction(env)) {
    if (PLACEHOLDER_VALUES.includes(env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID)
      || PLACEHOLDER_VALUES.includes(env.ZARINPAL_ACCESS_TOKEN)
      || ZARINPAL_SANDBOX_VALUES.includes(env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID)
      || ZARINPAL_SANDBOX_VALUES.includes(env.ZARINPAL_ACCESS_TOKEN)) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Production deployment with sandbox/placeholder ZarinPal credentials detected. Please configure real production credentials.',
      });
    }
  }
}

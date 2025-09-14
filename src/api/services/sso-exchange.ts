import jwt from 'jsonwebtoken';

import { createError } from '@/api/common/error-handling';
import type { ErrorContext } from '@/api/core';
import type { ExchangeTokenPayload } from '@/api/routes/sso/schema';
import { ExchangeTokenPayloadSchema } from '@/api/routes/sso/schema';
import type { ApiEnv } from '@/api/types';

/**
 * SSO Token Exchange Service - Enterprise-grade JWT validation
 *
 * Follows API Development Guide patterns:
 * - Schema-first validation with zero casting
 * - Standardized error handling
 * - Proper UTF-8/Unicode support for international characters
 * - Type-safe operations
 *
 * Validates industry-standard JWT tokens from roundtable Supabase Edge Function.
 * Handles user data including international characters (Persian, Arabic, Cyrillic, etc.)
 */
export class SSOExchangeService {
  private readonly signingSecret: string;
  private readonly issuer = 'roundtable';
  private readonly algorithm = 'HS256';

  constructor(env: ApiEnv) {
    // Get signing secret from environment with proper validation
    this.signingSecret = env.Bindings.SSO_SIGNING_SECRET;

    if (!this.signingSecret) {
      throw createError.internal('SSO_SIGNING_SECRET is required for token exchange', {
        errorType: 'external_service',
        serviceName: 'sso-exchange-service',
        endpoint: 'token-verification',
      } satisfies ErrorContext);
    }
  }

  /**
   * Verify JWT token from roundtable using schema-first validation
   *
   * Features:
   * - Zero casting policy - uses Zod schema validation
   * - Proper UTF-8/Unicode support for international characters
   * - Standardized error handling with context
   * - Type-safe operations
   *
   * @param token - JWT token from roundtable Supabase Edge Function
   * @returns Promise<ExchangeTokenPayload> - Validated token payload
   * @throws AppError - Standardized errors with proper context
   */
  async verifyExchangeToken(token: string): Promise<ExchangeTokenPayload> {
    try {
      // Step 1: Verify JWT signature and structure
      const decoded = jwt.verify(token, this.signingSecret, {
        issuer: this.issuer,
        algorithms: [this.algorithm],
      });

      // Step 2: Schema-first validation (zero casting policy)
      const validationResult = ExchangeTokenPayloadSchema.safeParse(decoded);

      if (!validationResult.success) {
        throw createError.validation('Invalid token payload structure', {
          errorType: 'validation',
          fieldErrors: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
          schemaName: 'ExchangeTokenPayload',
        } satisfies ErrorContext);
      }

      // Return validated payload (type is guaranteed by schema)
      return validationResult.data;
    } catch (error) {
      // Handle JWT library specific errors with proper context
      if (error instanceof jwt.TokenExpiredError) {
        throw createError.tokenExpired('SSO token has expired', {
          errorType: 'authentication',
          failureReason: 'token_expired',
        } satisfies ErrorContext);
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw createError.unauthenticated('Invalid SSO token signature', {
          errorType: 'authentication',
          failureReason: 'missing_token',
        } satisfies ErrorContext);
      }

      // Re-throw our own validation errors
      if (error && typeof error === 'object' && 'code' in error && error.code === 'VALIDATION_ERROR') {
        throw error;
      }

      // Catch-all for unexpected errors
      throw createError.internal('SSO token verification failed', {
        errorType: 'external_service',
        serviceName: 'sso-exchange-service',
        endpoint: 'jwt-verification',
      } satisfies ErrorContext);
    }
  }

  /**
   * Extract user data for session creation with type safety
   *
   * @param payload - Validated token payload from verifyExchangeToken
   * @returns Type-safe user data for Better Auth session creation
   */
  extractUserData(payload: ExchangeTokenPayload): {
    readonly email: string;
    readonly name: string;
    readonly emailVerified: boolean;
    readonly ssoProvider: 'roundtable';
    readonly tokenIssuedAt: Date;
    readonly tokenExpiresAt: Date;
  } {
    return {
      email: payload.email,
      name: payload.name,
      emailVerified: true, // From authenticated roundtable session
      ssoProvider: 'roundtable',
      tokenIssuedAt: new Date(payload.iat * 1000),
      tokenExpiresAt: new Date(payload.exp * 1000),
    } as const;
  }

  /**
   * Generate redirect URL to plans page with optional pricing parameters
   *
   * @param options - Optional pricing parameters for pre-selection
   * @param options.priceId - Optional price ID for pre-selection
   * @param options.productId - Optional product ID for pre-selection
   * @returns URL string for redirect after successful SSO authentication
   */
  generateRedirectUrl(options?: {
    priceId?: string;
    productId?: string;
  }): string {
    const params = new URLSearchParams({
      source: 'roundtable',
      sso: 'true', // Indicate this came from SSO
    });

    // Add pricing parameters if provided (with validation)
    if (options?.priceId && options.priceId.trim()) {
      params.set('priceId', options.priceId.trim());
    }

    if (options?.productId && options.productId.trim()) {
      params.set('productId', options.productId.trim());
    }

    return `/dashboard/plans?${params.toString()}`;
  }

  /**
   * Static factory method for creating service instance
   * Follows dependency injection patterns
   */
  static create(env: ApiEnv): SSOExchangeService {
    return new SSOExchangeService(env);
  }
}

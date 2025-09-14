import { Buffer } from 'node:buffer';
import * as crypto from 'node:crypto';

import type { ExchangeTokenPayload } from '@/api/routes/sso/schema';
import type { ApiEnv } from '@/api/types';

/**
 * Minimal SSO Token Exchange Service
 *
 * Validates HMAC-SHA256 signed tokens from roundtable Supabase Edge Function.
 * Handles minimal user data: email, name, exp, iat, iss
 */
export class SSOExchangeService {
  private signingSecret: string;

  constructor(env: ApiEnv) {
    // Get signing secret from environment
    this.signingSecret = env.Bindings.SSO_SIGNING_SECRET || '';

    if (!this.signingSecret) {
      throw new Error('SSO_SIGNING_SECRET is required for token exchange');
    }
  }

  /**
   * Verify HMAC-signed exchange token from roundtable
   * Returns minimal payload if valid, throws if invalid
   */
  async verifyExchangeToken(signedToken: string): Promise<ExchangeTokenPayload> {
    try {
      // Split token into payload and signature
      const [payloadBase64, signature] = signedToken.split('.');
      if (!payloadBase64 || !signature) {
        throw new Error('Invalid token format');
      }

      // Decode payload
      const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson) as ExchangeTokenPayload;

      // Verify HMAC signature
      const expectedSignature = this.createSignature(payloadJson);
      const providedSignature = Buffer.from(signature, 'base64url');

      if (!crypto.timingSafeEqual(expectedSignature, providedSignature)) {
        throw new Error('Invalid token signature');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token has expired');
      }

      // Validate issuer (must match roundtable)
      if (payload.iss !== 'roundtable') {
        throw new Error('Invalid token issuer');
      }

      // Validate required minimal fields
      if (!payload.email || !payload.name) {
        throw new Error('Missing required user information in token');
      }

      return payload;
    } catch {
      throw new Error('Invalid or expired exchange token');
    }
  }

  /**
   * Create HMAC-SHA256 signature (matches roundtable implementation)
   */
  private createSignature(payload: string): Buffer {
    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest();
  }

  /**
   * Extract minimal user data for session creation
   */
  extractUserData(payload: ExchangeTokenPayload): {
    email: string;
    name: string;
    emailVerified: boolean;
  } {
    return {
      email: payload.email,
      name: payload.name,
      emailVerified: true, // From authenticated roundtable session
    };
  }

  /**
   * Generate redirect URL to plans page with optional pricing parameters
   */
  generateRedirectUrl(options?: {
    priceId?: string;
    productId?: string;
  }): string {
    const params = new URLSearchParams({
      source: 'roundtable',
    });

    // Add pricing parameters if provided
    if (options?.priceId) {
      params.set('priceId', options.priceId);
    }

    if (options?.productId) {
      params.set('productId', options.productId);
    }

    return `/dashboard/plans?${params.toString()}`;
  }
}

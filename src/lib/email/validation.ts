/**
 * Email Validation Utilities
 * Ensures email addresses are valid for billing and notifications
 */

import {
  DISPOSABLE_EMAIL_DOMAINS,
  EMAIL_REGEX,
  FREE_EMAIL_PROVIDERS,
  MAX_EMAIL_LENGTH,
  MAX_EMAIL_LOCAL_LENGTH,
  PROBLEMATIC_EMAIL_CHARS,
} from '@/constants/email';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic length check
  if (email.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  // RFC 5322 regex validation
  if (!EMAIL_REGEX.test(email)) {
    return false;
  }

  // Check local part length (before @)
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || parts[0].length > MAX_EMAIL_LOCAL_LENGTH) {
    return false;
  }

  return true;
}

/**
 * Check if email domain is disposable/temporary
 */
export function isDisposableEmail(email: string): boolean {
  if (!isValidEmail(email)) {
    return true; // Treat invalid emails as disposable
  }

  const parts = email.split('@');
  if (parts.length !== 2 || !parts[1]) {
    return true;
  }
  const domain = parts[1].toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validate billing email with stricter requirements
 */
export function isValidBillingEmail(email: string): {
  valid: boolean;
  reason?: string;
} {
  // Basic validation
  if (!isValidEmail(email)) {
    return {
      valid: false,
      reason: 'Invalid email format',
    };
  }

  // Check for disposable email
  if (isDisposableEmail(email)) {
    return {
      valid: false,
      reason: 'Disposable email addresses are not allowed for billing',
    };
  }

  // Check for special characters that might cause issues with payment processors
  if (PROBLEMATIC_EMAIL_CHARS.some(char => email.includes(char))) {
    return {
      valid: false,
      reason: 'Email contains invalid characters for billing',
    };
  }

  return { valid: true };
}

/**
 * Normalize email for consistency
 * - Lowercase
 * - Trim whitespace
 * - Remove dots from Gmail addresses (user.name@gmail.com -> username@gmail.com)
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  let normalized = email.toLowerCase().trim();

  // Gmail-specific normalization
  if (normalized.endsWith('@gmail.com')) {
    const parts = normalized.split('@');
    if (parts.length === 2) {
      const [localPart, domain] = parts;
      // Remove dots from local part
      const cleanedLocal = (localPart || '').replace(/\./g, '');
      // Remove everything after + (aliases)
      const baseLocal = cleanedLocal.split('+')[0];
      normalized = `${baseLocal}@${domain}`;
    }
  }

  return normalized;
}

/**
 * Extract domain from email
 * Internal utility function
 */
function getEmailDomain(email: string): string | null {
  if (!isValidEmail(email)) {
    return null;
  }
  const parts = email.split('@');
  return parts.length === 2 && parts[1] ? parts[1].toLowerCase() : null;
}

/**
 * Validate organization billing email requirements
 */
export function validateOrganizationBillingEmail(
  email: string,
  organizationDomain?: string,
): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check basic validity
  const validation = isValidBillingEmail(email);
  if (!validation.valid) {
    errors.push(validation.reason || 'Invalid email');
    return { valid: false, warnings, errors };
  }

  const emailDomain = getEmailDomain(email);

  // Warning if billing email domain doesn't match organization domain
  if (organizationDomain && emailDomain && !emailDomain.includes(organizationDomain)) {
    warnings.push(`Billing email domain (${emailDomain}) doesn't match organization domain (${organizationDomain})`);
  }

  // Warning for free email providers
  if (emailDomain && FREE_EMAIL_PROVIDERS.includes(emailDomain)) {
    warnings.push('Using a free email provider for billing. Consider using a business email.');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

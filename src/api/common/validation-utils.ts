// Consolidated validation utilities - extracted from response formatters
// to reduce duplication and improve reusability

// Type-safe validation functions
export function ensureNonNull<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

export function validatePassStatus(status: string | null): 'active' | 'expired' | 'revoked' | 'redeemed' | null {
  if (!status)
    return 'active';
  const validStatuses: Array<'active' | 'expired' | 'revoked' | 'redeemed'> = ['active', 'revoked', 'expired', 'redeemed'];
  return validStatuses.includes(status as 'active' | 'expired' | 'revoked' | 'redeemed') ? status as 'active' | 'expired' | 'revoked' | 'redeemed' : 'active';
}

export function validatePlatform(platform: string): 'apple' | 'google' | 'generic' {
  const validPlatforms: Array<'apple' | 'google' | 'generic'> = ['apple', 'google', 'generic'];
  return validPlatforms.includes(platform as 'apple' | 'google' | 'generic') ? platform as 'apple' | 'google' | 'generic' : 'generic';
}

// Date validation utilities
export function validateDateString(dateString: string | null): string | null {
  if (!dateString)
    return null;

  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

// Email validation with simple regex
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
  return emailRegex.test(email);
}

// UUID validation utility
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Shakewell ID validation
export function validateShakewellId(id: string): boolean {
  const idRegex = /^SW[A-Z0-9]{10}$/;
  return idRegex.test(id);
}

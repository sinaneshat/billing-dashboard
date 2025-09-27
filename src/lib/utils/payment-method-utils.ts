/**
 * Payment Method Utilities
 * Shared utility functions for payment method components to eliminate code duplication
 * Following DRY principles and frontend patterns established in frontend-patterns.md
 */

import {
  AlertTriangle,
  Calendar,
  Clock,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type PaymentMethodStatus = 'active' | 'pending_signature' | 'cancelled_by_user' | 'verification_failed' | 'expired';

export type StatusConfig = {
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

// =============================================================================
// BANK UTILITIES
// =============================================================================

/**
 * Bank code to Persian bank name mapping (only major banks)
 * Following Iranian banking standards
 */
export const BANK_NAMES: Record<string, string> = {
  '012': 'بانک ملت',
  '017': 'بانک ملی ایران',
  '018': 'بانک تجارت',
  '054': 'بانک پارسیان',
  '055': 'بانک اقتصاد نوین',
  '056': 'بانک سامان',
  '057': 'بانک پاسارگاد',
  '021': 'پست بانک ایران',
  '016': 'بانک کشاورزی',
  '015': 'بانک سپه',
} as const;

/**
 * Get Persian bank name from bank code
 */
export function getBankName(bankCode?: string | null): string {
  if (!bankCode) {
    return 'بانک';
  }
  return BANK_NAMES[bankCode] || 'بانک دیگر';
}

// =============================================================================
// STATUS UTILITIES
// =============================================================================

/**
 * Get comprehensive status configuration for payment method status
 * Follows established UI patterns for consistent status display
 */
export function getPaymentMethodStatusConfig(
  status: string,
  t: (key: string) => string,
): StatusConfig {
  const configs: Record<PaymentMethodStatus, StatusConfig> = {
    active: {
      variant: 'success',
      label: t('paymentMethods.status.active'),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      icon: ShieldCheck,
      description: t('paymentMethods.status.activeDescription'),
    },
    pending_signature: {
      variant: 'warning',
      label: t('paymentMethods.status.pendingSignature'),
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      icon: Clock,
      description: t('paymentMethods.status.pendingDescription'),
    },
    cancelled_by_user: {
      variant: 'destructive',
      label: t('paymentMethods.status.cancelled'),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      icon: X,
      description: t('paymentMethods.status.cancelledDescription'),
    },
    verification_failed: {
      variant: 'destructive',
      label: t('paymentMethods.status.verificationFailed'),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      icon: AlertTriangle,
      description: t('paymentMethods.status.verificationFailedDescription'),
    },
    expired: {
      variant: 'outline',
      label: t('paymentMethods.status.expired'),
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
      icon: Calendar,
      description: t('paymentMethods.status.expiredDescription'),
    },
  };

  return configs[status as PaymentMethodStatus] || {
    variant: 'outline',
    label: status,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    icon: Shield,
    description: 'Unknown status',
  };
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Mask sensitive information (phone numbers, account numbers)
 * Following security best practices for PII display
 */
export function maskSensitiveInfo(
  value: string,
  visibleCount: number = 4,
  maskChar: string = '●',
): string {
  if (!value || value.length <= visibleCount) {
    return value;
  }

  const visible = value.slice(-visibleCount);
  const masked = maskChar.repeat(value.length - visibleCount);
  return masked + visible;
}

/**
 * Format phone number for display (Iranian format)
 */
export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) {
    return '';
  }

  // Show last 4 digits with masked beginning
  return phone.length > 4 ? `****${phone.slice(-4)}` : phone;
}

/**
 * Format Iranian currency (IRR) with proper locale support
 * Following internationalization patterns from frontend-patterns.md
 */
export function formatIRR(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    style: 'currency',
    currency: 'IRR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date with locale support - handles both Date objects and string dates
 * Following internationalization patterns for consistent date display
 */
export function formatPaymentMethodDate(
  dateInput: Date | string | null | undefined,
  locale: string,
  style: 'short' | 'medium' | 'long' = 'short',
): string {
  if (!dateInput) {
    return '';
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  const options: Intl.DateTimeFormatOptions = {
    year: style === 'short' ? '2-digit' : 'numeric',
    month: style === 'short' ? 'short' : 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US', options);
}

// =============================================================================
// COMPONENT HELPERS
// =============================================================================

/**
 * Check if payment method can be set as default
 */
export function canSetAsDefault(paymentMethod: {
  isPrimary: boolean;
  contractStatus: string;
}): boolean {
  return !paymentMethod.isPrimary && paymentMethod.contractStatus === 'active';
}

/**
 * Generate contract reference display
 */
export function getContractReference(
  signatureHash?: string | null,
  length: number = 8,
): string {
  if (!signatureHash) {
    return '';
  }
  return `#${signatureHash.slice(-length)}`;
}

/**
 * Check if payment method has transaction limits
 */
export function hasTransactionLimits(paymentMethod: {
  maxTransactionAmount?: number | null;
  maxDailyAmount?: number | null;
  maxDailyCount?: number | null;
  maxMonthlyCount?: number | null;
}): boolean {
  return !!(
    paymentMethod.maxTransactionAmount
    || paymentMethod.maxDailyAmount
    || paymentMethod.maxDailyCount
    || paymentMethod.maxMonthlyCount
  );
}

// =============================================================================
// CALCULATION UTILITIES
// =============================================================================

/**
 * Calculate days remaining until contract expiry
 */
export function getDaysRemaining(expiryDate: Date | string | null | undefined): number | null {
  if (!expiryDate)
    return null;

  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get expiry status with appropriate urgency level
 */
export function getExpiryStatus(daysRemaining: number | null): {
  urgency: 'critical' | 'warning' | 'normal' | 'expired';
  color: string;
  message?: string;
} {
  if (daysRemaining === null) {
    return { urgency: 'normal', color: 'text-muted-foreground' };
  }

  if (daysRemaining <= 0) {
    return {
      urgency: 'expired',
      color: 'text-red-600 dark:text-red-400',
      message: 'Contract expired',
    };
  }
  if (daysRemaining <= 7) {
    return {
      urgency: 'critical',
      color: 'text-red-600 dark:text-red-400',
      message: `Expires in ${daysRemaining} days`,
    };
  }
  if (daysRemaining <= 30) {
    return {
      urgency: 'warning',
      color: 'text-yellow-600 dark:text-yellow-400',
      message: `Expires in ${daysRemaining} days`,
    };
  }

  return {
    urgency: 'normal',
    color: 'text-green-600 dark:text-green-400',
    message: `${daysRemaining} days remaining`,
  };
}

/**
 * Calculate age of the contract in days
 */
export function getContractAge(createdAt: Date | string | null | undefined): number | null {
  if (!createdAt)
    return null;

  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const today = new Date();

  const diffTime = today.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 ? diffDays : 0;
}

/**
 * Format contract duration for display
 */
export function formatContractDuration(durationDays?: number | null): string {
  if (!durationDays)
    return '';

  if (durationDays === 365)
    return '1 year';
  if (durationDays === 180)
    return '6 months';
  if (durationDays === 90)
    return '3 months';
  if (durationDays === 30)
    return '1 month';

  if (durationDays >= 365) {
    const years = Math.floor(durationDays / 365);
    return `${years} year${years > 1 ? 's' : ''}`;
  }

  if (durationDays >= 30) {
    const months = Math.floor(durationDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }

  return `${durationDays} days`;
}

/**
 * Get usage statistics message
 */
export function getUsageStats(lastUsedAt: Date | string | null | undefined): string {
  if (!lastUsedAt) {
    return 'Never used';
  }

  const lastUsed = lastUsedAt instanceof Date ? lastUsedAt : new Date(lastUsedAt);
  const today = new Date();

  const diffTime = today.getTime() - lastUsed.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0)
    return 'Used today';
  if (diffDays === 1)
    return 'Used yesterday';
  if (diffDays < 7)
    return `Used ${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Used ${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `Used ${months} month${months > 1 ? 's' : ''} ago`;
  }

  return 'Used over a year ago';
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate Iranian mobile phone number
 */
export function isValidIranianMobile(phone: string): boolean {
  return /^(?:\+98|0)?9\d{9}$/.test(phone);
}

/**
 * Normalize Iranian phone number to +98 format
 */
export function normalizeIranianMobile(phone: string): string {
  if (phone.startsWith('09')) {
    return `+98${phone.slice(1)}`;
  }
  if (phone.startsWith('9')) {
    return `+98${phone}`;
  }
  if (phone.startsWith('+98')) {
    return phone;
  }
  return phone;
}

/**
 * Brand Types for Maximum Type Safety (Context7 Advanced Pattern)
 * Creates distinct types that prevent accidental assignment between similar structures
 * Based on Context7 documentation for nominal typing with Zod
 */

import { z } from 'zod';

// ============================================================================
// ENTITY BRAND TYPES
// ============================================================================

/**
 * User-related brand types
 */
export const UserId = z.string().uuid().brand<'UserId'>();
export const SessionId = z.string().uuid().brand<'SessionId'>();
export const UserEmail = z.string().email().toLowerCase().brand<'UserEmail'>();

/**
 * Product and subscription brand types
 */
export const ProductId = z.string().uuid().brand<'ProductId'>();
export const SubscriptionId = z.string().uuid().brand<'SubscriptionId'>();
export const PlanId = z.string().uuid().brand<'PlanId'>();

/**
 * Payment-related brand types
 */
export const PaymentId = z.string().uuid().brand<'PaymentId'>();
export const TransactionId = z.string().min(1).brand<'TransactionId'>();
export const PaymentMethodId = z.string().uuid().brand<'PaymentMethodId'>();

/**
 * ZarinPal-specific brand types
 */
export const ZarinpalAuthority = z.string().length(36).regex(/^[A-Z0-9]+$/i).brand<'ZarinpalAuthority'>();
export const ZarinpalRefId = z.string().regex(/^\d+$/).brand<'ZarinpalRefId'>();
export const ZarinpalMerchantId = z.string().length(36).regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i).brand<'ZarinpalMerchantId'>();

/**
 * Currency brand types for safe financial calculations
 */
export const IranianRial = z.number().int().positive().min(1000).max(500_000_000).brand<'IranianRial'>();
export const USDollar = z.number().positive().multipleOf(0.01).max(50_000).brand<'USDollar'>();

/**
 * Iranian-specific brand types
 */
export const IranianNationalId = z.string()
  .regex(/^\d{10}$/, 'National ID must be exactly 10 digits')
  .refine((value) => {
    // Iranian national ID checksum validation
    if (value.length !== 10 || /^(\d)\1{9}$/.test(value))
      return false;

    const digits = value.split('').map(Number);
    const checkDigit = digits.pop()!;
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      const digit = digits[i];
      if (digit === undefined)
        return false;
      sum += digit * (10 - i);
    }

    const remainder = sum % 11;
    const expectedCheck = remainder < 2 ? remainder : 11 - remainder;
    return checkDigit === expectedCheck;
  }, 'Invalid Iranian national ID')
  .brand<'IranianNationalId'>();

export const IranianMobile = z.string()
  .regex(/^(\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format')
  .transform((phone) => {
    // Normalize to +98 format
    if (phone.startsWith('09'))
      return `+98${phone.slice(1)}`;
    if (phone.startsWith('9'))
      return `+98${phone}`;
    if (!phone.startsWith('+98'))
      return `+98${phone}`;
    return phone;
  })
  .brand<'IranianMobile'>();

export const IranianPostalCode = z.string()
  .regex(/^\d{5}-?\d{5}$/, 'Invalid Iranian postal code format')
  .transform(code => code.replace('-', ''))
  .brand<'IranianPostalCode'>();

// ============================================================================
// SYSTEM BRAND TYPES
// ============================================================================

/**
 * Request tracking brand types
 */
export const RequestId = z.string().uuid().brand<'RequestId'>();
export const TraceId = z.string().min(1).brand<'TraceId'>();

/**
 * File and media brand types
 */
export const FileId = z.string().uuid().brand<'FileId'>();
export const ImageUrl = z.string().url().brand<'ImageUrl'>();
export const SignedUrl = z.string().url().brand<'SignedUrl'>();

/**
 * Webhook and event brand types
 */
export const WebhookId = z.string().uuid().brand<'WebhookId'>();
export const EventId = z.string().uuid().brand<'EventId'>();
export const MessageId = z.string().min(1).brand<'MessageId'>();

// ============================================================================
// TYPE INFERENCE (Using different names to avoid redeclaration)
// ============================================================================

export type UserIdType = z.infer<typeof UserId>;
export type SessionIdType = z.infer<typeof SessionId>;
export type UserEmailType = z.infer<typeof UserEmail>;

export type ProductIdType = z.infer<typeof ProductId>;
export type SubscriptionIdType = z.infer<typeof SubscriptionId>;
export type PlanIdType = z.infer<typeof PlanId>;

export type PaymentIdType = z.infer<typeof PaymentId>;
export type TransactionIdType = z.infer<typeof TransactionId>;
export type PaymentMethodIdType = z.infer<typeof PaymentMethodId>;

export type ZarinpalAuthorityType = z.infer<typeof ZarinpalAuthority>;
export type ZarinpalRefIdType = z.infer<typeof ZarinpalRefId>;
export type ZarinpalMerchantIdType = z.infer<typeof ZarinpalMerchantId>;

export type IranianRialType = z.infer<typeof IranianRial>;
export type USDollarType = z.infer<typeof USDollar>;

export type IranianNationalIdType = z.infer<typeof IranianNationalId>;
export type IranianMobileType = z.infer<typeof IranianMobile>;
export type IranianPostalCodeType = z.infer<typeof IranianPostalCode>;

export type RequestIdType = z.infer<typeof RequestId>;
export type TraceIdType = z.infer<typeof TraceId>;

export type FileIdType = z.infer<typeof FileId>;
export type ImageUrlType = z.infer<typeof ImageUrl>;
export type SignedUrlType = z.infer<typeof SignedUrl>;

export type WebhookIdType = z.infer<typeof WebhookId>;
export type EventIdType = z.infer<typeof EventId>;
export type MessageIdType = z.infer<typeof MessageId>;

// ============================================================================
// BRAND TYPE UTILITIES
// ============================================================================

/**
 * Safe currency conversion utility
 * Prevents accidental mixing of different currencies
 */
export const CurrencyConverter = {
  rialToUsd: (rials: IranianRialType, exchangeRate: number): USDollarType => {
    const usdAmount = rials / exchangeRate;
    return USDollar.parse(Math.round(usdAmount * 100) / 100);
  },

  usdToRial: (usd: USDollarType, exchangeRate: number): IranianRialType => {
    const rialAmount = Math.round(usd * exchangeRate);
    return IranianRial.parse(rialAmount);
  },
};

/**
 * Type-safe ID generation utilities
 */
export const IdGenerator = {
  userId: (): UserIdType => UserId.parse(crypto.randomUUID()),
  productId: (): ProductIdType => ProductId.parse(crypto.randomUUID()),
  subscriptionId: (): SubscriptionIdType => SubscriptionId.parse(crypto.randomUUID()),
  paymentId: (): PaymentIdType => PaymentId.parse(crypto.randomUUID()),
  requestId: (): RequestIdType => RequestId.parse(crypto.randomUUID()),
  sessionId: (): SessionIdType => SessionId.parse(crypto.randomUUID()),
};

/**
 * Type-safe validation helpers
 */
export const BrandTypeValidators = {
  isUserId: (value: string): value is UserIdType => UserId.safeParse(value).success,
  isUserEmail: (value: string): value is UserEmailType => UserEmail.safeParse(value).success,
  isPaymentId: (value: string): value is PaymentIdType => PaymentId.safeParse(value).success,
  isIranianRial: (value: number): value is IranianRialType => IranianRial.safeParse(value).success,
  isZarinpalAuthority: (value: string): value is ZarinpalAuthorityType => ZarinpalAuthority.safeParse(value).success,
};

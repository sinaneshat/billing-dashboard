/**
 * Type-safe validation interfaces based on Context7 Hono patterns
 * Replaces Record<string, unknown> with proper schema-based types
 */

import { z } from 'zod';

// Validation error structure
export type ValidationError = {
  readonly field: string;
  readonly message: string;
  readonly code?: string;
  readonly expected?: string;
  readonly received?: string;
};

// Validation result types
export type ValidationSuccess<T> = {
  readonly success: true;
  readonly data: T;
};

export type ValidationFailure = {
  readonly success: false;
  readonly errors: ValidationError[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// Request validation schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const SortingSchema = z.object({
  sortBy: z.string().min(1),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Search filters discriminated union (Context7 Pattern)
 * Maximum type safety replacing Record<string, string>
 */
export const SearchFiltersSchema = z.discriminatedUnion('filterType', [
  z.object({
    filterType: z.literal('user_filter'),
    role: z.enum(['user', 'admin', 'moderator']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
  }),
  z.object({
    filterType: z.literal('payment_filter'),
    status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
    method: z.enum(['card', 'direct_debit', 'bank_transfer']).optional(),
    amountMin: z.number().nonnegative().optional(),
    amountMax: z.number().positive().optional(),
    currency: z.enum(['IRR', 'USD']).optional(),
  }),
  z.object({
    filterType: z.literal('subscription_filter'),
    status: z.enum(['active', 'cancelled', 'expired', 'pending']).optional(),
    planType: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
    autoRenew: z.boolean().optional(),
  }),
]);

export const SearchSchema = z.object({
  search: z.string().min(1).optional(),
  filters: SearchFiltersSchema.optional(),
});

export const IdParamsSchema = z.object({
  id: z.string().uuid(),
});

// Query parameter schemas
export const AdminUsersQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const PaymentMethodQuerySchema = PaginationSchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
  type: z.enum(['card', 'bank_account', 'digital_wallet']).optional(),
});

export const SubscriptionQuerySchema = PaginationSchema.extend({
  status: z.enum(['active', 'cancelled', 'expired', 'pending']).optional(),
  planType: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
});

// Request body schemas
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['user', 'admin']).default('user'),
});

export const UpdateUserSchema = CreateUserSchema.partial();

/**
 * Payment metadata discriminated union (Context7 Pattern)
 * Maximum type safety replacing Record<string, unknown>
 */
export const PaymentMetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscription_payment'),
    subscriptionId: z.string().uuid(),
    billingPeriod: z.enum(['monthly', 'yearly']),
    isRecurring: z.literal(true),
  }),
  z.object({
    type: z.literal('one_time_payment'),
    invoiceId: z.string().uuid().optional(),
    isRecurring: z.literal(false),
    purpose: z.enum(['purchase', 'fee', 'refund', 'adjustment']),
  }),
  z.object({
    type: z.literal('direct_debit'),
    contractId: z.string().uuid(),
    bankAccount: z.string().min(10).max(30),
    isRecurring: z.boolean(),
    maxAmount: z.number().positive(),
  }),
]);

export const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  description: z.string().min(1),
  metadata: PaymentMetadataSchema.optional(),
});

/**
 * Subscription metadata discriminated union (Context7 Pattern)
 */
export const SubscriptionMetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('trial'),
    trialEnd: z.string().datetime(),
    trialDays: z.number().int().positive(),
    autoRenew: z.boolean(),
  }),
  z.object({
    type: z.literal('active'),
    nextBilling: z.string().datetime(),
    autoRenew: z.boolean(),
    paymentMethod: z.enum(['card', 'direct_debit', 'bank_transfer']),
  }),
  z.object({
    type: z.literal('cancelled'),
    cancelledAt: z.string().datetime(),
    cancelReason: z.enum(['user_request', 'payment_failure', 'policy_violation']),
    refundIssued: z.boolean(),
  }),
]);

export const CreateSubscriptionSchema = z.object({
  productId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  metadata: SubscriptionMetadataSchema.optional(),
});

// Type inference from schemas
export type PaginationQuery = z.infer<typeof PaginationSchema>;
export type SortingQuery = z.infer<typeof SortingSchema>;
export type SearchQuery = z.infer<typeof SearchSchema>;
export type IdParams = z.infer<typeof IdParamsSchema>;
export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;
export type PaymentMethodQuery = z.infer<typeof PaymentMethodQuerySchema>;
export type SubscriptionQuery = z.infer<typeof SubscriptionQuerySchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type CreatePayment = z.infer<typeof CreatePaymentSchema>;
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;

// Validation utility functions
export function validatePagination(data: unknown): ValidationResult<PaginationQuery> {
  try {
    return { success: true, data: PaginationSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    }
    return { success: false, errors: [{ field: 'unknown', message: 'Validation failed' }] };
  }
}

export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): ValidationResult<T> => {
    try {
      return { success: true, data: schema.parse(data) };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        };
      }
      return { success: false, errors: [{ field: 'unknown', message: 'Validation failed' }] };
    }
  };
}

# Subscription Security & Payment-First Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan to secure the subscription purchase flow by enforcing single-subscription-per-user constraints and implementing payment-first logic to prevent subscription abuse and ensure proper billing.

## Current Architecture Analysis

### Database Schema Status
- **Current State**: Multiple active subscriptions allowed per user
- **Issue**: No database-level constraints preventing multiple active subscriptions
- **Security Gap**: Users can create unlimited subscriptions without immediate payment

### Backend API Status
- **Current State**: Subscriptions activate immediately upon creation
- **Issue**: No payment verification before activation
- **Security Gap**: Direct API access allows subscription creation without payment

### Frontend Flow Status
- **Current State**: Plan selection leads to immediate activation
- **Issue**: No payment confirmation step in UI
- **Security Gap**: Users can select multiple plans simultaneously

## Required Changes Overview

### 1. Database Schema Modifications
- [ ] Add unique constraint for single active subscription per user
- [ ] Update subscription table indexes for performance
- [ ] Add migration scripts for existing data cleanup

### 2. Backend API Security Enhancements
- [ ] Implement payment-first subscription creation logic
- [ ] Add immediate direct debit charging
- [ ] Enforce single subscription constraints
- [ ] Implement secure subscription switching logic
- [ ] Add comprehensive validation layers

### 3. Payment Integration Improvements
- [ ] Integrate ZarinPal direct debit charging
- [ ] Implement currency conversion (USD → IRR)
- [ ] Add payment failure handling
- [ ] Implement transaction rollback mechanisms

## Detailed Implementation Plan

## Phase 1: Database Schema Security (Priority: Critical)

### 1.1 Database Constraint Implementation

**Files to Modify:**
- `src/db/tables/billing.ts`
- `src/db/migrations/` (new migration file)

**Changes Required:**

```sql
-- Migration: Add unique constraint for single active subscription
CREATE UNIQUE INDEX CONCURRENTLY user_single_active_subscription_idx
ON subscription(user_id)
WHERE status = 'active';

-- Add check constraint to prevent status manipulation
ALTER TABLE subscription ADD CONSTRAINT valid_subscription_status
CHECK (status IN ('active', 'canceled', 'expired', 'pending'));
```

**Database Table Updates:**
```typescript
// src/db/tables/billing.ts additions
export const subscription = sqliteTable('subscription', {
  // ... existing fields
}, table => [
  // ... existing indexes

  // New security indexes
  index('subscription_user_active_unique').on(table.userId).where(eq(table.status, 'active')),
  index('subscription_security_audit_idx').on(table.userId, table.status, table.createdAt),

  // Performance indexes for billing queries
  index('subscription_billing_cycle_idx').on(table.status, table.nextBillingDate, table.paymentMethodId),
]);
```

### 1.2 Data Migration Strategy

**Migration Script Requirements:**
- [ ] Identify users with multiple active subscriptions
- [ ] Implement data consolidation strategy
- [ ] Create backup before migration
- [ ] Implement rollback procedures

## Phase 2: Backend Security Implementation (Priority: Critical)

### 2.1 Subscription Creation Security

**File:** `src/api/routes/subscriptions/handler.ts`

**Current Issue:**
```typescript
// SECURITY GAP: Immediate activation without payment
status: 'active' as const,
startDate: new Date(),
```

**Required Implementation:**

```typescript
// Enhanced subscription creation with payment-first logic
export const createSubscriptionHandler = createHandlerWithTransaction(
  {
    auth: 'session',
    validateBody: CreateSubscriptionRequestSchema,
    operationName: 'createSubscription',
  },
  async (c, tx) => {
    const user = c.get('user');
    const { productId, contractId } = c.validated.body;

    // STEP 1: Single Subscription Constraint Check
    const existingActiveSubscription = await tx.db.select()
      .from(subscription)
      .where(and(
        eq(subscription.userId, user.id),
        eq(subscription.status, 'active')
      ))
      .limit(1);

    if (existingActiveSubscription.length > 0) {
      throw createError.conflict('User already has an active subscription. Use subscription switching instead.');
    }

    // STEP 2: Validate Product and Payment Method
    const [productRecord, paymentMethodRecord] = await Promise.all([
      tx.db.select().from(product).where(eq(product.id, productId)).limit(1),
      tx.db.select().from(paymentMethodTable).where(eq(paymentMethodTable.id, contractId)).limit(1)
    ]);

    if (!productRecord[0] || !paymentMethodRecord[0]) {
      throw createError.notFound('Product or payment method not found');
    }

    // STEP 3: Currency Conversion (USD → IRR)
    const amountInRials = Math.round(productRecord[0].price * getCurrentUsdToIrrRate());

    // STEP 4: IMMEDIATE PAYMENT PROCESSING
    const zarinpalService = ZarinPalDirectDebitService.create(c.env);
    const paymentResult = await zarinpalService.chargeDirectDebit({
      amount: amountInRials,
      currency: 'IRR',
      description: `Subscription to ${productRecord[0].name}`,
      contractSignature: await decryptSignature(paymentMethodRecord[0].contractSignatureEncrypted),
      metadata: {
        subscriptionId: newSubscriptionId,
        userId: user.id,
        productId: productRecord[0].id,
      },
    });

    // STEP 5: Only Activate After Successful Payment
    if (!paymentResult.success) {
      c.logger.error('Payment failed during subscription creation', {
        userId: user.id,
        productId: productRecord[0].id,
        error: paymentResult.error,
      });
      throw createError.paymentFailed(`Payment failed: ${paymentResult.error}`);
    }

    // STEP 6: Create Subscription with Active Status
    const subscriptionData = {
      id: newSubscriptionId,
      userId: user.id,
      productId: productRecord[0].id,
      status: 'active' as const, // Only after successful payment
      startDate: new Date(),
      nextBillingDate: calculateNextBilling(productRecord[0].billingPeriod),
      currentPrice: productRecord[0].price,
      billingPeriod: productRecord[0].billingPeriod,
      paymentMethodId: paymentMethodRecord[0].id,
      directDebitContractId: contractId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // STEP 7: Record Payment Transaction
    const paymentData = {
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: newSubscriptionId,
      productId: productRecord[0].id,
      amount: amountInRials,
      currency: 'IRR',
      status: 'completed' as const,
      paymentMethod: 'zarinpal-direct-debit',
      zarinpalRefId: paymentResult.data?.refId?.toString(),
      zarinpalDirectDebitUsed: true,
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Execute atomic transaction
    await Promise.all([
      tx.db.insert(subscription).values(subscriptionData),
      tx.db.insert(payment).values(paymentData),
      tx.db.insert(billingEvent).values({
        id: crypto.randomUUID(),
        userId: user.id,
        subscriptionId: newSubscriptionId,
        paymentId: paymentData.id,
        paymentMethodId: paymentMethodRecord[0].id,
        eventType: 'subscription_created_with_payment',
        eventData: { paymentResult, subscriptionData },
        severity: 'info',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ]);

    return Responses.created(c, {
      subscriptionId: newSubscriptionId,
      paymentStatus: 'completed',
      amountCharged: amountInRials,
      currency: 'IRR',
      paymentRef: paymentResult.data?.refId,
    });
  },
);
```

### 2.2 Subscription Switching Implementation

**New Endpoint:** `PATCH /subscriptions/switch`

```typescript
export const switchSubscriptionHandler = createHandlerWithTransaction(
  {
    auth: 'session',
    validateBody: SwitchSubscriptionRequestSchema,
    operationName: 'switchSubscription',
  },
  async (c, tx) => {
    // STEP 1: Get current active subscription
    const currentSubscription = await tx.db.select()
      .from(subscription)
      .where(and(
        eq(subscription.userId, user.id),
        eq(subscription.status, 'active')
      ))
      .limit(1);

    if (!currentSubscription[0]) {
      throw createError.notFound('No active subscription to switch from');
    }

    // STEP 2: Calculate proration and pricing
    const proratedCredit = calculateProration(currentSubscription[0]);
    const newProductPrice = newProduct.price;
    const netAmount = newProductPrice - proratedCredit;

    // STEP 3: Process payment if upgrade (netAmount > 0)
    if (netAmount > 0) {
      const paymentResult = await processDirectDebitPayment(netAmount);
      if (!paymentResult.success) {
        throw createError.paymentFailed('Failed to charge for subscription upgrade');
      }
    }

    // STEP 4: Atomic subscription switch
    await Promise.all([
      // Cancel current subscription
      tx.db.update(subscription)
        .set({
          status: 'canceled',
          endDate: new Date(),
          cancellationReason: 'switched_to_new_plan',
          updatedAt: new Date()
        })
        .where(eq(subscription.id, currentSubscription[0].id)),

      // Create new subscription
      tx.db.insert(subscription).values(newSubscriptionData)
    ]);

    return Responses.ok(c, switchResult);
  },
);
```

### 2.3 Security Validation Layer

**File:** `src/api/middleware/subscription-security.ts`

```typescript
// New middleware for subscription security
export const subscriptionSecurityMiddleware = createMiddleware<ApiEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    throw createError.unauthenticated('Authentication required');
  }

  // Rate limiting for subscription operations
  const key = `subscription:${user.id}`;
  const attempts = await rateLimiter.check(key, { max: 3, window: 3600 }); // 3 per hour

  if (attempts.blocked) {
    throw createError.rateLimit('Too many subscription operations. Please try again later.');
  }

  await next();
});
```

## Phase 3: Payment Integration Security (Priority: High)

### 3.1 ZarinPal Direct Debit Integration

**File:** `src/api/services/subscription-payment.ts` (New)

```typescript
export class SubscriptionPaymentService {
  private zarinpalService: ZarinPalDirectDebitService;
  private currencyService: CurrencyExchangeService;

  async processSubscriptionPayment(params: {
    userId: string;
    productId: string;
    productPrice: number; // USD
    contractSignature: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResult> {

    // Step 1: Currency conversion with current rates
    const amountInRials = await this.currencyService.convertToIrr(params.productPrice);

    // Step 2: Validate minimum amount (ZarinPal requirement: min 1000 IRR)
    if (amountInRials < 1000) {
      throw new Error('Amount below minimum threshold for Iranian payments');
    }

    // Step 3: Process direct debit payment
    const paymentResult = await this.zarinpalService.chargeDirectDebit({
      amount: amountInRials,
      currency: 'IRR',
      description: `Subscription payment for user ${params.userId}`,
      contractSignature: params.contractSignature,
      metadata: {
        type: 'subscription',
        userId: params.userId,
        productId: params.productId,
        originalAmountUsd: params.productPrice,
        ...params.metadata,
      },
    });

    return {
      success: paymentResult.success,
      amountCharged: amountInRials,
      currency: 'IRR',
      referenceId: paymentResult.data?.refId,
      error: paymentResult.error,
    };
  }
}
```

### 3.2 Currency Conversion Service

**File:** `src/api/services/currency-exchange.ts` (Enhancement)

```typescript
// Add subscription-specific currency conversion
export class CurrencyExchangeService {
  async convertToIrr(usdAmount: number): Promise<number> {
    const rate = await this.getCurrentUsdToIrrRate();
    const amountInRials = Math.round(usdAmount * rate);

    // Smart rounding for Iranian market
    return this.smartRoundToman(amountInRials);
  }

  private smartRoundToman(amount: number): number {
    // Round to nearest 1000 IRR for better UX
    return Math.round(amount / 1000) * 1000;
  }
}
```

## Phase 4: API Security Enhancements (Priority: High)

### 4.1 Request Validation Schema Updates

**File:** `src/api/routes/subscriptions/schema.ts`

```typescript
// Enhanced validation schemas
export const CreateSubscriptionRequestSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  contractId: z.string().uuid('Invalid contract ID format'),
  confirmPayment: z.literal(true, 'Payment confirmation required'),
  securityToken: z.string().min(32, 'Security token required'), // CSRF-like protection
}).openapi('CreateSubscriptionRequest');

export const SwitchSubscriptionRequestSchema = z.object({
  newProductId: z.string().uuid('Invalid product ID format'),
  effectiveDate: z.enum(['immediate', 'next_cycle']).default('immediate'),
  confirmProration: z.boolean().default(true),
}).openapi('SwitchSubscriptionRequest');
```

### 4.2 Response Schema Updates

```typescript
export const CreateSubscriptionResponseDataSchema = z.object({
  subscriptionId: CoreSchemas.id(),
  paymentStatus: z.enum(['completed', 'failed', 'pending']),
  amountCharged: z.number().int().min(0),
  currency: z.literal('IRR'),
  paymentRef: z.string().optional(),
  activatedAt: CoreSchemas.timestamp(),
}).openapi('CreateSubscriptionData');
```

## Phase 5: Frontend Security Considerations (Priority: Medium)

### 5.1 UI Flow Security

**Files to Consider:**
- `src/components/billing/pricing-plans.tsx`
- `src/hooks/mutations/subscriptions.ts`

**Required Changes:**
- Add payment confirmation modal
- Implement loading states during payment processing
- Add error handling for payment failures
- Prevent multiple simultaneous subscription requests

### 5.2 State Management Security

```typescript
// Enhanced mutation with payment confirmation
export function useCreateSubscriptionMutation() {
  return useMutation({
    mutationFn: async (data: CreateSubscriptionRequest) => {
      // Client-side validation
      if (!data.confirmPayment) {
        throw new Error('Payment confirmation required');
      }

      return createSubscriptionService(data);
    },
    onSuccess: (result) => {
      if (result.paymentStatus !== 'completed') {
        throw new Error('Payment was not completed successfully');
      }
      // Invalidate queries only on successful payment
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.list });
    },
  });
}
```

## Implementation Checklist

### Database Security
- [ ] **Critical**: Add unique constraint for single active subscription per user
- [ ] **Critical**: Create migration script for existing data cleanup
- [ ] **High**: Add indexes for performance optimization
- [ ] **High**: Implement constraint checks in application layer
- [ ] **Medium**: Add database triggers for audit logging

### Backend API Security
- [ ] **Critical**: Implement payment-first subscription creation logic
- [ ] **Critical**: Add immediate direct debit charging in subscription handler
- [ ] **Critical**: Enforce single subscription constraint in all endpoints
- [ ] **Critical**: Implement secure subscription switching endpoint
- [ ] **High**: Add comprehensive input validation with Zod schemas
- [ ] **High**: Implement rate limiting for subscription operations
- [ ] **High**: Add security middleware for subscription endpoints
- [ ] **High**: Enhance error handling with proper rollback mechanisms
- [ ] **Medium**: Add request correlation IDs for debugging
- [ ] **Medium**: Implement comprehensive audit logging

### Payment Integration Security
- [ ] **Critical**: Integrate ZarinPal direct debit service in subscription flow
- [ ] **Critical**: Implement proper currency conversion (USD → IRR)
- [ ] **Critical**: Add payment failure handling and transaction rollback
- [ ] **High**: Implement payment retry mechanisms for failed transactions
- [ ] **High**: Add payment amount validation (minimum thresholds)
- [ ] **Medium**: Implement payment confirmation webhooks
- [ ] **Medium**: Add payment analytics and monitoring

### API Response Security
- [ ] **High**: Update response schemas to include payment status
- [ ] **High**: Add proper error codes for payment-related failures
- [ ] **High**: Implement structured error responses with context
- [ ] **Medium**: Add response signing for sensitive operations
- [ ] **Medium**: Implement response caching strategies

### Frontend Security Considerations
- [ ] **High**: Add payment confirmation modals
- [ ] **High**: Implement proper loading states during payment
- [ ] **High**: Add error handling for payment failures in UI
- [ ] **Medium**: Prevent concurrent subscription requests
- [ ] **Medium**: Add client-side payment validation
- [ ] **Low**: Implement payment success/failure animations

### Testing & Validation
- [ ] **Critical**: Create comprehensive test suite for payment flow
- [ ] **Critical**: Test subscription switching scenarios
- [ ] **Critical**: Test payment failure scenarios and rollbacks
- [ ] **High**: Add integration tests for ZarinPal direct debit
- [ ] **High**: Test database constraints under load
- [ ] **High**: Test concurrent subscription creation attempts
- [ ] **Medium**: Add performance tests for subscription operations
- [ ] **Medium**: Test currency conversion accuracy
- [ ] **Medium**: Add security penetration testing

### Security Monitoring
- [ ] **High**: Add metrics for failed payment attempts
- [ ] **High**: Monitor subscription creation rate limits
- [ ] **High**: Add alerts for multiple subscription attempts
- [ ] **Medium**: Implement fraud detection patterns
- [ ] **Medium**: Add geographic payment analysis
- [ ] **Low**: Implement user behavior analytics

### Documentation & Compliance
- [ ] **High**: Document new API endpoints and security measures
- [ ] **High**: Update API documentation with payment flow diagrams
- [ ] **Medium**: Create incident response procedures for payment failures
- [ ] **Medium**: Document data retention policies for payment data
- [ ] **Low**: Create user guides for subscription management

## Risk Mitigation Strategies

### Payment Failures
- **Issue**: Direct debit payments may fail due to insufficient funds or bank issues
- **Mitigation**: Implement retry mechanisms with exponential backoff
- **Monitoring**: Alert on payment failure rates above 5%

### Database Constraint Violations
- **Issue**: Unique constraint violations during high-concurrency scenarios
- **Mitigation**: Implement proper error handling and user feedback
- **Monitoring**: Track constraint violation rates and optimize accordingly

### Currency Exchange Rate Fluctuations
- **Issue**: USD to IRR conversion rates may change rapidly
- **Mitigation**: Cache rates for short periods (15 minutes) and implement rate limiting
- **Monitoring**: Alert on significant rate changes (>5% in 1 hour)

### API Security Vulnerabilities
- **Issue**: Direct API access could bypass payment requirements
- **Mitigation**: Multiple validation layers and comprehensive testing
- **Monitoring**: Rate limiting and anomaly detection for API usage patterns

## Success Metrics

### Security Metrics
- Zero successful subscription creations without payment
- <1% payment failure rate during subscription creation
- <0.1% constraint violation rate during concurrent operations
- 100% audit trail coverage for subscription operations

### Performance Metrics
- <2 seconds for subscription creation with payment
- <1 second for subscription switching operations
- >99.5% uptime for subscription endpoints
- <100ms response time for subscription validation checks

### Business Metrics
- Reduced subscription churn due to payment failures
- Improved revenue recognition through immediate payment
- Enhanced user trust through secure payment processing
- Compliance with Iranian payment regulations

## Rollback Procedures

### Database Changes
1. **Backup Strategy**: Full database backup before migration
2. **Rollback Script**: Prepared SQL scripts to reverse constraint additions
3. **Data Recovery**: Procedures to restore from backup if needed
4. **Monitoring**: Real-time monitoring during migration execution

### API Changes
1. **Feature Flags**: Implement toggles for new payment logic
2. **Gradual Rollout**: Deploy to staging and preview environments first
3. **Circuit Breakers**: Automatic fallback to previous logic on high error rates
4. **Manual Override**: Admin controls to disable new features if needed

### Payment Integration
1. **Mock Modes**: Ability to switch to mock payment processing
2. **Rate Limiting**: Emergency rate limiting for payment operations
3. **Notification System**: Immediate alerts for payment processing issues
4. **Rollback Timeline**: <30 minutes from issue identification to rollback completion

---

## Conclusion

This implementation plan addresses critical security vulnerabilities in the subscription purchase flow by enforcing single-subscription constraints and implementing payment-first logic. The phased approach ensures systematic implementation with proper testing and monitoring at each stage.

The focus on backend security prevents users from circumventing payment requirements through direct API access or frontend manipulation, while the comprehensive validation layers ensure data integrity and proper business rule enforcement.

Success of this implementation will result in a secure, compliant, and user-friendly subscription management system that prevents abuse while providing excellent user experience for legitimate customers.
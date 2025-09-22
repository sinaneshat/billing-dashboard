# Backend Patterns - Comprehensive Implementation Guide

> **Context Prime Document**: Essential reference for all backend development in the billing dashboard project. This document consolidates patterns from 10 specialized backend analysis agents and serves as the single source of truth for implementation standards.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Route Patterns](#authentication-route-patterns)
3. [Payment Route Patterns](#payment-route-patterns)
4. [Subscription Route Patterns](#subscription-route-patterns)
5. [Payment Methods Route Patterns](#payment-methods-route-patterns)
6. [Webhook Route Patterns](#webhook-route-patterns)
7. [Service Layer Patterns](#service-layer-patterns)
8. [Middleware Patterns](#middleware-patterns)
9. [Core Framework Patterns](#core-framework-patterns)
10. [Common Utilities Patterns](#common-utilities-patterns)
11. [System Routes & Infrastructure Patterns](#system-routes-infrastructure-patterns)
12. [Implementation Guidelines](#implementation-guidelines)

---

## Architecture Overview

The billing dashboard implements a modern, type-safe API architecture built on **Hono.js** with **Cloudflare Workers**, **Drizzle ORM**, and **Better Auth**. The architecture emphasizes:

- **Factory Pattern Handlers** with integrated validation and authentication
- **Zero-Casting Type Safety** using Zod schemas and type guards
- **Transactional Database Operations** for consistency
- **Comprehensive Audit Trails** through billing events
- **ZarinPal Integration** for Iranian payment processing
- **Middleware-Based Security** with rate limiting and CSRF protection

### Core Directory Structure
```
src/api/
├── routes/{domain}/           # Domain-specific routes (3-file pattern)
│   ├── route.ts              # OpenAPI route definitions
│   ├── handler.ts            # Business logic with factory pattern
│   └── schema.ts             # Zod validation schemas
├── services/                 # Business logic services
├── middleware/               # Cross-cutting concerns
├── core/                     # Framework foundations
├── common/                   # Shared utilities
├── types/                    # Type definitions
├── utils/                    # Helper functions
├── patterns/                 # Base patterns (repositories)
└── scheduled/                # Background tasks
```

---

## Authentication Route Patterns

### File Organization Pattern
**Reference**: `src/api/routes/auth/route.ts:8-26`

Authentication follows the **three-file pattern** consistently:
- **route.ts**: OpenAPI route definitions with Zod schemas
- **handler.ts**: Business logic implementation using factory pattern
- **schema.ts**: Request/response validation schemas

### Route Definition Pattern
```typescript
export const secureMeRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['auth'],
  summary: 'Get current authenticated user',
  description: 'Returns information about the currently authenticated user',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Current user information retrieved successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(SecureMePayloadSchema),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Authentication required' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
```

### Handler Factory Pattern
**Reference**: `src/api/routes/auth/handler.ts:14-54`

```typescript
export const secureMeHandler: RouteHandler<typeof secureMeRoute, ApiEnv> = createHandler(
  {
    auth: 'session',      // Authentication mode
    operationName: 'getMe', // For logging and tracing
  },
  async (c) => {
    const user = c.get('user');
    const session = c.get('session');

    if (!user || !session) {
      throw createError.unauthenticated('Valid session required for user information');
    }

    // Structured logging with operation context
    c.logger.info('Retrieving current user information from Better Auth session', {
      logType: 'operation',
      operationName: 'getMe',
      userId: user.id,
      resource: session.id,
    });

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    } as const;

    return Responses.ok(c, payload);
  },
);
```

### Better Auth Integration
**Reference**: `src/lib/auth/server/index.ts:51-111`

```typescript
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || `${getBaseUrl()}/api/auth`,
  database: createAuthAdapter(),

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 15, // 15 minutes cache
    },
  },

  plugins: [
    nextCookies(),
    admin(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { emailService } = await import('@/lib/email/ses-service');
        await emailService.sendMagicLink(email, url);
      },
    }),
  ],
});
```

### Schema Validation Best Practices
**Reference**: `src/api/routes/auth/schema.ts:6-35`

```typescript
export const SecureMePayloadSchema = z.object({
  userId: CoreSchemas.id().openapi({
    example: 'cm4abc123def456ghi',
    description: 'Better Auth user identifier',
  }),
  email: CoreSchemas.email().openapi({
    example: 'user@example.com',
    description: 'User email address',
  }),
  emailVerified: z.boolean().openapi({
    example: true,
    description: 'Whether the user email has been verified',
  }),
  // ... other fields with OpenAPI metadata
}).openapi('SecureMePayload');
```

**Key Principles**:
- Always use `CoreSchemas.id()`, `CoreSchemas.email()` for consistency
- Every field requires `.openapi()` with example and description
- Export inferred types: `export type SecureMePayload = z.infer<typeof SecureMePayloadSchema>`

---

## Payment Route Patterns

### Route Structure Pattern
**Reference**: `src/api/routes/payments/route.ts:8-25`

Payment routes follow the established pattern with comprehensive error handling:

```typescript
export const getPaymentsRoute = createRoute({
  method: 'get',
  path: '/payments',
  tags: ['payments'],
  summary: 'Get user payment history',
  description: 'Get all payments for the authenticated user',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Payment history retrieved successfully',
      content: {
        'application/json': { schema: GetPaymentsResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});
```

### ZarinPal Service Integration
**Reference**: `src/api/services/zarinpal.ts:304-344`

```typescript
async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
  // 1. Input validation using Zod schema
  const validatedRequest = PaymentRequestSchema.parse(request);

  const payload = {
    merchant_id: this.config.merchantId,
    amount: validatedRequest.amount,
    currency: validatedRequest.currency,
    description: validatedRequest.description,
    callback_url: validatedRequest.callbackUrl,
    metadata: validatedRequest.metadata,
  };

  try {
    // 2. HTTP request with authorization
    const rawResult = await this.post<typeof payload, PaymentResponse>(
      '/pg/v4/payment/request.json',
      payload,
      { Authorization: `Bearer ${this.config.accessToken}` },
      'request payment',
    );

    // 3. Response validation
    const validatedResult = PaymentResponseSchema.parse(rawResult);

    // 4. Handle ZarinPal error codes
    if (validatedResult.data && validatedResult.data.code !== 100) {
      const errorMessage = this.getZarinPalErrorMessage(validatedResult.data.code);
      throw new HTTPException(HttpStatusCodes.PAYMENT_REQUIRED, {
        message: `Payment request failed: ${errorMessage} (Code: ${validatedResult.data.code})`,
      });
    }

    return validatedResult;
  } catch (error) {
    throw this.handleError(error, 'request payment', {
      errorType: 'payment' as const,
      provider: 'zarinpal' as const,
    });
  }
}
```

### Payment State Management
**Reference**: `src/db/tables/billing.ts:154-156`

```typescript
status: text('status', {
  enum: ['pending', 'completed', 'failed', 'refunded', 'canceled'],
}).notNull().default('pending'),
```

**State Transitions**:
- `pending` → `completed`: Successful payment verification
- `pending` → `failed`: Payment rejection or verification failure
- `pending` → `canceled`: User cancellation before completion
- `completed` → `refunded`: Administrative refund (rare)

### Transaction Safety Pattern
**Reference**: `src/api/routes/webhooks/handler.ts:824-1190`

```typescript
export const zarinPalWebhookHandler = createHandlerWithTransaction(
  {
    auth: 'public',
    validateBody: ZarinPalWebhookRequestSchema,
    operationName: 'zarinPalWebhook',
  },
  async (c, tx) => {  // 'tx' is the transaction context
    // All database operations use the transaction context
    await tx.insert(webhookEvent).values({
      id: crypto.randomUUID(),
      source: 'zarinpal',
      eventType: `payment.${webhookPayload.status === 'OK' ? 'completed' : 'failed'}`,
      rawPayload: webhookPayload,
    });

    // Find payment by authority
    const paymentResults = await tx.select().from(payment)
      .where(eq(payment.zarinpalAuthority, webhookPayload.authority))
      .limit(1);

    if (paymentRecord && webhookPayload.status === 'OK') {
      // Verify payment with ZarinPal
      const verification = await zarinPal.verifyPayment({
        authority: webhookPayload.authority,
        amount: paymentRecord.amount,
      });

      if (verification.data?.code === 100) {
        // Update payment status atomically
        await tx.update(payment)
          .set({
            status: 'completed',
            zarinpalRefId: verification.data?.ref_id?.toString(),
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payment.id, paymentRecord.id));

        // Update related subscription if exists
        if (paymentRecord.subscriptionId) {
          await tx.update(subscription)
            .set({
              status: 'active',
              startDate: new Date(),
              nextBillingDate: calculateNextBilling(),
              updatedAt: new Date(),
            })
            .where(eq(subscription.id, paymentRecord.subscriptionId));
        }

        // Create billing event for audit trail
        await tx.insert(billingEvent).values({
          id: crypto.randomUUID(),
          userId: paymentRecord.userId,
          paymentId: paymentRecord.id,
          subscriptionId: paymentRecord.subscriptionId,
          eventType: 'payment_success',
          eventData: { verificationData: verification.data },
          createdAt: new Date(),
        });
      }
    }

    return Responses.ok(c, { received: true, processed: true });
  },
);
```

### Drizzle-Zod Integration
**Reference**: `src/api/routes/payments/schema.ts:4-23`

```typescript
import { paymentSelectSchema, productSelectSchema, subscriptionSelectSchema } from '@/db/validation/billing';

// Single source of truth - use drizzle-zod schemas with OpenAPI metadata
const PaymentSchema = paymentSelectSchema.openapi({
  example: {
    id: 'pay_123',
    userId: 'user_123',
    subscriptionId: 'sub_123',
    productId: 'prod_123',
    amount: 99000,
    currency: 'IRR',
    status: 'completed',
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000123456789',
    zarinpalRefId: '123456789',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});
```

---

## Subscription Route Patterns

### Factory Pattern with Transaction Support
**Reference**: `src/api/routes/subscriptions/handler.ts:144`

```typescript
export const createSubscriptionHandler = createHandlerWithTransaction(
  {
    auth: 'session',
    validateBody: CreateSubscriptionRequestSchema,
    operationName: 'createSubscription',
  },
  async (c, tx) => {
    // Validation chain
    // 1. Validate product exists and is active
    // 2. Check for existing active subscriptions
    // 3. Validate payment method/contract

    // Direct debit contract creation
    const subscriptionData = {
      id: crypto.randomUUID(),
      userId: user.id,
      productId: productRecord.id,
      status: 'active' as const,
      startDate: new Date(),
      nextBillingDate: productRecord.billingPeriod === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null,
      currentPrice: productRecord.price,
      billingPeriod: productRecord.billingPeriod,
      paymentMethodId: paymentMethodRecord.id,
      directDebitContractId: contractId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tx.insert(subscription).values(subscriptionData);

    // Billing event audit trail
    await tx.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: newSubscriptionId,
      eventType: 'subscription_created_direct_debit',
      eventData: { /* comprehensive event data */ },
      severity: 'info',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Webhook dispatch (non-blocking)
    await dispatchRoundtableWebhook(subscriptionData, userRecord);
  },
);
```

### Subscription Lifecycle Management
**Reference**: `src/db/tables/billing.ts` schema definitions

```typescript
status: text('status', {
  enum: ['active', 'canceled', 'expired', 'pending'],
}).notNull().default('pending')
```

**Lifecycle Flow**:
1. **pending** → **active** (on successful payment/contract activation)
2. **active** → **canceled** (user cancellation)
3. **active** → **expired** (billing failure/contract expiry)

### Billing Cycle Automation
**Reference**: Database schema and billing logic

```typescript
startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
endDate: integer('end_date', { mode: 'timestamp' }), // null for active
nextBillingDate: integer('next_billing_date', { mode: 'timestamp' }), // For recurring

// Billing automation index for cron jobs
index('subscription_billing_automation_idx').on(
  table.status,           // active subscriptions only
  table.nextBillingDate,  // due for billing
  table.paymentMethodId   // has payment method
),
```

### Iranian-Specific Validation
**Reference**: `src/api/routes/subscriptions/schema.ts:99-127`

```typescript
export const IranianValidationSchemas = {
  mobileNumber: z.string()
    .regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format'),
  rialAmount: z.number()
    .int('Rial amounts must be whole numbers')
    .min(1000, 'Minimum amount is 1,000 IRR')
    .max(1000000000, 'Maximum amount is 1,000,000,000 IRR'),
};
```

### Plan Change with Proration
**Reference**: `src/api/routes/subscriptions/handler.ts:460`

```typescript
// Proration calculation
const totalBillingPeriodMs = 30 * 24 * 60 * 60 * 1000;
const remainingTimeMs = nextBillingDate.getTime() - now.getTime();
const remainingRatio = Math.max(0, remainingTimeMs / totalBillingPeriodMs);

// Credit for unused time
prorationCredit = Math.floor(subscriptionRecord.currentPrice * remainingRatio);

// Charge for new plan
const newPlanCharge = Math.floor(newProductRecord.price * remainingRatio);
netAmount = newPlanCharge - prorationCredit;
```

---

## Payment Methods Route Patterns

### ZarinPal Payman Three-Endpoint Flow
**Reference**: `src/api/routes/payment-methods/route.ts:79-183`

1. **Contract Creation** with bank validation
2. **Contract Verification** after user signing
3. **Contract Cancellation** for user control

### Contract Signature Encryption
**Reference**: `src/api/routes/payment-methods/handler.ts:292-308`

```typescript
// Encrypt the signature before storing
const { encrypted, hash } = await encryptSignature(verifyResult.data.signature);

// Create payment method with encrypted contract signature
const [newPaymentMethod] = await db
  .insert(paymentMethod)
  .values({
    userId: user.id,
    contractType: 'direct_debit_contract',
    contractSignatureEncrypted: encrypted,    // AES-GCM encrypted
    contractSignatureHash: hash,              // SHA-256 hash for uniqueness
    contractStatus: 'active',
    isPrimary: false,
    isActive: true,
  })
  .returning();
```

### Cryptographic Security Pattern
**Reference**: `src/api/utils/crypto.ts:13-93`

```typescript
// Derive encryption key from BETTER_AUTH_SECRET using PBKDF2
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.BETTER_AUTH_SECRET),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('zarinpal-signature-salt'), // Fixed salt for deterministic key
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
```

### Iranian Validation Patterns
**Reference**: `src/api/routes/payment-methods/schema.ts:97-122`

```typescript
export const CreateContractRequestSchema = z.object({
  mobile: z.string().regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format').openapi({
    example: '09123456789',
    description: 'Customer mobile number',
  }),
  ssn: z.string().regex(/^\d{10}$/, 'Iranian national ID must be exactly 10 digits').optional().openapi({
    example: '0480123456',
    description: 'Customer national ID (optional)',
  }),
  expireAt: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'Date must be in Y-m-d H:i:s format').openapi({
    example: '2025-12-31 23:59:59',
    description: 'Contract expiry date (minimum 30 days)',
  }),
});
```

### Atomic Default Payment Method Setting
**Reference**: `src/api/routes/payment-methods/handler.ts:119-133`

```typescript
// Atomic operation: Set all user's payment methods isPrimary = false
await tx
  .update(paymentMethod)
  .set({ isPrimary: false, updatedAt: new Date() })
  .where(eq(paymentMethod.userId, user.id));

// Set target payment method as primary
await tx
  .update(paymentMethod)
  .set({
    isPrimary: true,
    lastUsedAt: new Date(),
    updatedAt: new Date(),
  })
  .where(eq(paymentMethod.id, id));
```

---

## Webhook Route Patterns

### Multi-Layer Security Validation
**Reference**: `src/api/routes/webhooks/handler.ts:734-814`

```typescript
async function validateWebhookSecurity(c: { req: { header: (name: string) => string | undefined } }): Promise<void> {
  const clientIP = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const userAgent = c.req.header('user-agent') || '';
  const timestamp = c.req.header('x-zarinpal-timestamp') || '';

  // Rate limiting: max 10 requests per minute per IP
  const rateLimitKey = `webhook:${clientIP}`;
  const current = webhookRateLimiter.get(rateLimitKey);
  if (current && current.count >= maxRequests) {
    throw createError.rateLimit('Webhook rate limit exceeded');
  }

  // Validate User-Agent
  if (!userAgent.toLowerCase().includes('zarinpal')) {
    throw createError.unauthorized('Invalid webhook source');
  }

  // Timestamp validation (prevent replay attacks)
  if (timestamp) {
    const timeDiff = Math.abs(currentTimestamp - webhookTimestamp);
    if (timeDiff > 300) {  // 5 minute window
      throw createError.unauthorized('Webhook timestamp validation failed');
    }
  }

  // IP whitelist validation for production
  const zarinpalIPRanges = ['185.231.115.0/24', '5.253.26.0/24'];
  if (!isLocalhost && process.env.NODE_ENV === 'production') {
    const isValidIP = zarinpalIPRanges.some(range => range.includes(clientIP));
    if (!isValidIP) {
      throw createError.unauthorized('Webhook request from unauthorized IP');
    }
  }
}
```

### Stripe-Compatible Event Generation
**Reference**: `src/api/routes/webhooks/handler.ts:276-305`

```typescript
static createPaymentSucceededEvent(paymentId: string, customerId: string, amount: number, metadata?: Record<string, string>, paymentMethodId?: string): WebhookEvent {
  const event = {
    id: this.generateEventId(),
    object: 'event' as const,
    type: 'payment_intent.succeeded' as const,
    created: this.toUnixTimestamp(new Date()),
    data: {
      object: {
        id: paymentId,
        object: 'payment_intent' as const,
        amount: Math.round(amount),
        currency: 'irr' as const,
        customer: customerId,
        status: 'succeeded' as const,
        payment_method: paymentMethodId,
        description: `Payment for subscription ${metadata?.subscriptionId || ''}`.trim(),
        created: this.toUnixTimestamp(new Date()),
        metadata: metadata || {},
      },
    },
    livemode: process.env.NODE_ENV === 'production',
    api_version: '2024-01-01',
  };

  // Validate against Stripe schema
  const validation = StripeWebhookEventSchema.safeParse(event);
  if (!validation.success) {
    throw new Error(`Invalid webhook event schema: ${validation.error.message}`);
  }
  return validation.data;
}
```

### Event Processing Workflow
**Reference**: `src/api/routes/webhooks/handler.ts:898-1026`

1. **Verify Payment**: Call ZarinPal verification API
2. **Update Payment**: Set status to `completed`, add ref_id and card_hash
3. **Update Subscription**: Activate subscription if pending
4. **Generate Events**: Create Stripe-compatible webhook events
5. **Forward Events**: Send to external webhook endpoints

### Comprehensive Audit Logging
**Reference**: `src/db/tables/billing.ts:270-290`

```typescript
export const webhookEvent = sqliteTable('webhook_event', {
  id: text('id').primaryKey(),
  source: text('source').notNull().default('zarinpal'),
  eventType: text('event_type').notNull(),
  paymentId: text('payment_id').references(() => payment.id),
  rawPayload: text('raw_payload', { mode: 'json' }).notNull(),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  forwardedToExternal: integer('forwarded_to_external', { mode: 'boolean' }),
  forwardedAt: integer('forwarded_at', { mode: 'timestamp' }),
  externalWebhookUrl: text('external_webhook_url'),
  processingError: text('processing_error'),
  forwardingError: text('forwarding_error'),
});
```

---

## Service Layer Patterns

### Class-Based Service Architecture
**Reference**: `src/api/services/zarinpal.ts:295-298`

```typescript
// Factory pattern with environment validation
class ZarinPalService {
  private config: ZarinPalConfig;

  static getConfig(): ZarinPalConfig {
    const { env } = getCloudflareContext();

    // Critical validation - fail fast if credentials missing
    if (!env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID || !env.ZARINPAL_ACCESS_TOKEN) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'ZarinPal credentials not configured. Set NEXT_PUBLIC_ZARINPAL_MERCHANT_ID and ZARINPAL_ACCESS_TOKEN.',
      });
    }

    const config = {
      serviceName: 'ZarinPal',
      baseUrl: isSandbox ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com',
      timeout: 30000,
      retries: 3,
      merchantId: env.NEXT_PUBLIC_ZARINPAL_MERCHANT_ID,
      accessToken: env.ZARINPAL_ACCESS_TOKEN,
      isSandbox: env.NODE_ENV === 'development',
    };

    return ZarinPalConfigSchema.parse(config); // Zod validation
  }
}
```

### Direct Debit Multi-Step Workflow
**Reference**: `src/api/services/zarinpal-direct-debit.ts:437-519`

```typescript
async requestContract(request: DirectDebitContractRequest): Promise<DirectDebitContractResponse> {
  // Multi-step validation with Iranian-specific patterns
  const requestResult = validateWithSchema(DirectDebitContractRequestSchema, request);
  if (!requestResult.success) {
    const errorMessage = requestResult.errors[0]?.message || 'Contract request validation failed';
    throw new Error(`Direct debit contract request validation failed: ${errorMessage}`);
  }

  try {
    const rawResult = await this.post<typeof payload, DirectDebitContractResponse>(
      '/pg/v4/payman/request.json',
      payload,
      {},
      'contract request',
    );

    // Enhanced error handling for common direct debit setup issues
    if (errorMessage.includes('merchant have not access') || errorMessage.includes('-80')) {
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message: 'Direct debit service is not enabled for this merchant account. Please contact ZarinPal support to enable the direct debit (Payman) service first.',
      });
    }

    return validatedResult;
  } catch (error) {
    throw this.handleError(error, 'request contract', {
      errorType: 'payment' as const,
      provider: 'zarinpal' as const,
    });
  }
}
```

### Currency Exchange with Smart Caching
**Reference**: `src/api/services/currency-exchange.ts:63-65`

```typescript
// In-memory caching with fallback strategy
private cachedRate: { rate: number; timestamp: number } | null = null;
private fallbackRate = 42000; // Hardcoded fallback when API fails

// Smart rounding algorithm for Iranian pricing psychology
private smartRoundToman(amount: number): number {
  if (amount < 1000) return Math.ceil(amount / 100) * 100;     // Round to 100s
  if (amount < 10000) return Math.ceil(amount / 500) * 500;    // Round to 500s
  if (amount < 100000) return Math.ceil(amount / 1000) * 1000; // Round to 1000s
  // ... progressive rounding based on amount
}
```

### Consistent Error Transformation
**Reference**: `src/api/services/zarinpal.ts:228-254`

```typescript
private handleError(
  error: unknown,
  operationName: string,
  context: { errorType: 'payment' | 'network'; provider: 'zarinpal' },
): HTTPException {
  if (error instanceof HTTPException) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Specific error type handling
  if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
    return new HTTPException(HttpStatusCodes.REQUEST_TIMEOUT, {
      message: `ZarinPal ${operationName} timed out: ${errorMessage}`,
    });
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
      message: `ZarinPal ${operationName} network error: ${errorMessage}`,
    });
  }

  return new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
    message: `ZarinPal ${operationName} failed: ${errorMessage}`,
  });
}
```

---

## Middleware Patterns

### Layered Middleware Architecture
**Reference**: `src/api/index.ts:108-204`

The middleware chain follows this specific order:

1. **Logging & Formatting** (`prettyJSON`, `honoLoggerMiddleware`, `errorLoggerMiddleware`)
2. **Security & Headers** (`secureHeaders`, `requestId`, `contextStorage`)
3. **Performance** (`timing`, `timeout`, `bodyLimit`)
4. **CORS & CSRF Protection** (environment-aware configuration)
5. **Error Handling** (`enhancedErrorHandler`)
6. **Authentication** (`attachSession`)
7. **Rate Limiting** (`RateLimiterFactory.create('api')`)

### Session Attachment vs. Enforcement
**Reference**: `src/api/middleware/auth.ts:12-39`

```typescript
// Attach session if present; does not enforce authentication
export const attachSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (sessionData?.user && sessionData?.session) {
      c.set('session', sessionData.session);
      c.set('user', sessionData.user);
    } else {
      c.set('session', null);
      c.set('user', null);
    }
    c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());
  } catch (error) {
    // Log error but don't throw - allow unauthenticated requests
    c.set('session', null);
    c.set('user', null);
  }
  return next();
});
```

### Enhanced Error Handler with Circuit Breaker
**Reference**: `src/api/middleware/enhanced-error-handler.ts:55-111`

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt = 0;

  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'closed':
        return true; // Normal operation
      case 'open':
        if (now >= this.nextAttempt) {
          this.state = 'half-open';
          return true; // Test if service recovered
        }
        return false; // Block requests
      case 'half-open':
        return true; // Allow limited testing
    }
  }
}
```

### Rate Limiter Factory with Presets
**Reference**: `src/api/middleware/rate-limiter-factory.ts:27-76`

```typescript
export const RATE_LIMIT_PRESETS = {
  upload: { windowMs: 60 * 60 * 1000, maxRequests: 100 },
  read: { windowMs: 60 * 1000, maxRequests: 300 },
  delete: { windowMs: 60 * 60 * 1000, maxRequests: 50 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
  organization: { windowMs: 60 * 60 * 1000, maxRequests: 200 },
  ip: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },
};
```

### Environment Validation Middleware
**Reference**: `src/api/middleware/environment-validation.ts:30-83`

```typescript
const CRITICAL_ENV_VARS = ['NODE_ENV', 'BETTER_AUTH_SECRET'];
const PAYMENT_ENV_VARS = ['NEXT_PUBLIC_ZARINPAL_MERCHANT_ID', 'ZARINPAL_ACCESS_TOKEN'];
const EMAIL_ENV_VARS = ['AWS_SES_REGION', 'AWS_SES_FROM_EMAIL'];
const OAUTH_ENV_VARS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const WEBHOOK_ENV_VARS = ['NEXT_PUBLIC_ROUNDTABLE_WEBHOOK_URL', 'WEBHOOK_SECRET'];
```

### Structured Logging with Context
**Reference**: `src/api/middleware/hono-logger.ts:93-104`

```typescript
apiError(c: Context, message: string, error?: unknown): void {
  const errorContext = {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('User-Agent'),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: isDevelopment ? error.stack : undefined
    } : error,
  };
}
```

---

## Core Framework Patterns

### Unified Module System
**Reference**: `src/api/core/index.ts:1-225`

The core framework provides a single entry point with organized exports:

```typescript
// Single entry point for type-safe, unified API system
import { Schemas, Validators, Responses, createHandler } from '@/api/core';

// Usage example
const handler = createHandler({
  auth: 'session',
  validateBody: Schemas.CoreSchemas.email(),
  operationName: 'CreateUser'
}, async (c) => {
  const email = c.validated.body;
  return Responses.created(c, { userId: 'user_123' });
});
```

### Type-Safe Validation System
**Reference**: `src/api/core/validation.ts:49-67`

```typescript
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;
export type ValidationSuccess<T> = { readonly success: true; readonly data: T };
export type ValidationFailure = { readonly success: false; readonly errors: ValidationError[] };

export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(issue => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
    })),
  };
}
```

### Iranian-Specific Core Schemas
**Reference**: `src/api/core/schemas.ts:121-185`

```typescript
// Iranian national ID with checksum validation
export function iranianNationalIdSchema(message?: string) {
  return z.string()
    .regex(/^\d{10}$/, 'National ID must be exactly 10 digits')
    .refine((value) => {
      // Iranian national ID checksum validation
      if (value.length !== 10 || /^(\d)\1{9}$/.test(value)) return false;
      // Luhn-like checksum algorithm for Iranian IDs
      // ... checksum implementation
    }, message ?? 'Invalid Iranian national ID');
}

// Mobile number normalization
export function iranianMobileSchema() {
  return z.string()
    .regex(/^(\+98|0)?9\d{9}$/, 'Invalid Iranian mobile format')
    .transform((phone) => {
      // Normalize to +98 format
      if (phone.startsWith('09')) return `+98${phone.slice(1)}`;
      // ... other normalization rules
    });
}
```

### Discriminated Union Response System
**Reference**: `src/api/core/responses.ts:60-76`

```typescript
export function ok<T>(c: Context, data: T, additionalMeta?: ResponseMetadata): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      ...extractResponseMetadata(c),
      ...getPerformanceMetadata(c),
      ...additionalMeta,
    },
  };
  return c.json(response, HttpStatusCodes.OK);
}
```

### Enhanced HTTP Exception Factory
**Reference**: `src/api/core/http-exceptions.ts:151-192`

```typescript
export class EnhancedHTTPException extends HTTPException {
  public readonly errorCode?: ErrorCode;
  public readonly severity?: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly correlationId?: string;
  public readonly timestamp: Date;

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      errorCode: this.errorCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }
}
```

### Handler Factory with Validation Pipeline
**Reference**: `src/api/core/handlers.ts:184-337`

```typescript
// Authentication mode handling
async function applyAuthentication(c: Context, authMode: AuthMode): Promise<void> {
  const { auth } = await import('@/lib/auth/server');

  switch (authMode) {
    case 'session':
      const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!sessionData?.user || !sessionData?.session) {
        throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
          message: 'Authentication required',
        });
      }
      c.set('session', sessionData.session);
      c.set('user', sessionData.user);
      break;
    // ... other auth modes
  }
}
```

---

## Common Utilities Patterns

### ZarinPal Error Processing
**Reference**: `src/api/common/zarinpal-error-utils.ts`

```typescript
// Type-safe ZarinPal error parsing
function parseZarinPalApiResponse(responseText: string): {
  isError: boolean;
  zarinPalError?: ZarinPalError;
  parsedData?: unknown;
}

// Structured HTTPException creation
export function createZarinPalHTTPException(
  operation: string,
  httpStatus: number,
  responseText: string,
): never {
  const { isError, zarinPalError } = parseZarinPalApiResponse(responseText);

  if (isError && zarinPalError) {
    throw HTTPExceptionFactory.zarinPalError({
      message: `ZarinPal ${operation} failed: ${zarinPalMessage}`,
      operation,
      zarinpalCode: String(zarinPalCode),
      zarinpalMessage: zarinPalMessage,
      details: {
        original_http_status: httpStatus,
        response_body: responseText,
      },
    });
  }
}
```

### Type-Safe FormData Processing
**Reference**: `src/api/common/form-utils.ts`

```typescript
// Type guard approach instead of casting
function isFile(entry: FormDataEntryValue | null): entry is File {
  return entry instanceof File;
}

// Safe file extraction with HTTP exceptions
export function extractFile(formData: FormData, fieldName: string): File {
  const entry = formData.get(fieldName);

  if (!entry) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Missing required file: ${fieldName}`,
    });
  }

  if (!isFile(entry)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: `Invalid file type for field: ${fieldName}`,
    });
  }

  return entry;
}
```

### Production-Ready HTTP Client
**Reference**: `src/api/common/fetch-utilities.ts`

```typescript
// Circuit breaker state management
type CircuitBreakerState = {
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  state: 'closed' | 'open' | 'half-open';
};

const circuitBreakers = new Map<string, CircuitBreakerState>();

function shouldAllowRequest(url: string, config: FetchConfig): boolean {
  if (!config.circuitBreaker) return true;

  const state = getCircuitBreakerState(url);
  const now = Date.now();

  switch (state.state) {
    case 'closed': return true;
    case 'open':
      if (now >= state.nextAttemptTime) {
        state.state = 'half-open';
        return true;
      }
      return false;
    case 'half-open': return true;
  }
}
```

### Safe Logger with Data Sanitization
**Reference**: `src/lib/utils/safe-logger.ts`

```typescript
// Comprehensive sensitive pattern detection
const SENSITIVE_PATTERNS = [
  /password/i, /secret/i, /token/i, /auth/i,
  /card[_-]?number/i, /cvv/i, /pin/i,
  /national[_-]?id/i, /ssn/i, /phone/i,
  /merchant[_-]?id/i, /signature/i,
] as const;

const REDACTED_FIELDS = new Set([
  'password', 'secret', 'token', 'merchantId',
  'nationalId', 'cardNumber', 'signature',
]);
```

### Discriminated Union Metadata
**Reference**: `src/api/common/metadata-utils.ts`

```typescript
// Context7 Pattern - Maximum type safety replacing Record<string, unknown>
const MetadataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscription'),
    planChangeHistory: z.array(z.object({
      fromProductId: z.string(),
      toProductId: z.string(),
      fromPrice: z.number(),
      toPrice: z.number(),
      changedAt: z.string().datetime(),
      effectiveDate: z.string().datetime(),
    })).optional(),
    autoRenewal: z.boolean().optional(),
    trialEnd: z.string().datetime().optional(),
  }),
  z.object({
    type: z.literal('payment'),
    paymentMethod: z.enum(['card', 'bank_transfer', 'wallet']).optional(),
    retryAttempts: z.number().int().min(0).optional(),
    failureReason: z.string().optional(),
  }),
]);
```

---

## System Routes & Infrastructure Patterns

### Health Check Architecture
**Reference**: `src/api/routes/system/handler.ts:44-116`

```typescript
// Comprehensive dependency checking
const healthChecks = [
  // Database health check
  {
    name: 'database',
    check: async () => {
      const db = await getDbAsync();
      await db.select().from(user).limit(1);
      return { status: 'healthy' as const };
    }
  },
  // Environment validation check
  {
    name: 'environment',
    check: async () => {
      const validation = validateEnvironment();
      return {
        status: validation.isHealthy ? 'healthy' as const : 'degraded' as const,
        details: validation.summary,
      };
    }
  }
];

// Status aggregation logic
const healthyCount = results.filter(r => r.status === 'healthy').length;
const degradedCount = results.filter(r => r.status === 'degraded').length;
const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;

const overallStatus = unhealthyCount > 0 ? 'unhealthy' :
                     degradedCount > 0 ? 'degraded' : 'healthy';
```

### Scheduled Task Patterns
**Reference**: `src/api/scheduled/monthly-billing.ts:100-605`

```typescript
// Cloudflare Workers optimization
const WORKER_TIMEOUT_MS = 28000; // 28-second limit
const MAX_BATCH_SIZE = 100; // D1 database limits
const CHUNK_SIZE = 50; // Process in chunks

// Database operation patterns
const isD1 = typeof db.batch === 'function';
if (isD1) {
  // Use batch operations for D1
  await db.batch(operations);
} else {
  // Use transactions for BetterSQLite3
  await db.transaction(async (tx) => {
    for (const operation of operations) {
      await operation(tx);
    }
  });
}
```

### Repository Base Pattern
**Reference**: `src/api/patterns/base-repository.ts:224-1013`

```typescript
// Type-safe repository architecture
export abstract class BaseRepository<
  TTable extends Table,
  TSelectSchema extends z.ZodSchema,
  TInsertSchema extends z.ZodSchema,
  TUpdateSchema extends z.ZodSchema
> {
  protected abstract table: TTable;
  protected abstract selectSchema: TSelectSchema;
  protected abstract insertSchema: TInsertSchema;
  protected abstract updateSchema: TUpdateSchema;

  // CRUD operations with automatic validation
  async create(data: z.infer<TInsertSchema>): Promise<OperationResult<TSelectType>> {
    const validationResult = validateWithSchema(this.insertSchema, data);
    if (!validationResult.success) {
      return { success: false, errors: validationResult.errors };
    }

    // Automatic audit field injection
    const auditData = {
      ...validationResult.data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.db.insert(this.table).values(auditData).returning();
    return { success: true, data: result[0] };
  }
}
```

### Type Organization Patterns
**Reference**: `src/api/types/logger.ts`, `src/api/types/metadata.ts`

```typescript
// Discriminated union logging contexts
export const LogContextSchema = z.discriminatedUnion('logType', [
  z.object({
    logType: z.literal('request'),
    method: z.string(),
    path: z.string(),
    statusCode: z.number().optional(),
    duration: z.number().optional(),
  }),
  z.object({
    logType: z.literal('database'),
    operation: z.enum(['select', 'insert', 'update', 'delete']),
    table: z.string(),
    affectedRows: z.number().optional(),
  }),
  z.object({
    logType: z.literal('payment'),
    provider: z.enum(['zarinpal', 'stripe', 'paypal']),
    amount: z.number(),
    currency: z.string(),
    status: z.enum(['pending', 'completed', 'failed']),
  }),
]).passthrough(); // Allow additional properties
```

---

## Implementation Guidelines

### 1. Core Principles

**Type Safety First**
- Use Zod schemas for all input/output validation
- Implement discriminated unions instead of `Record<string, unknown>`
- Apply type guards instead of type assertions
- Export TypeScript types from all schemas

**Zero-Casting Pattern**
- No `any` types or unsafe casting (`as` keyword)
- Use function overloads for type safety
- Implement proper type guards for runtime checks
- Validate external data through schemas

**Transaction-First Database Operations**
- Use `createHandlerWithTransaction` for multi-step operations
- Apply database transactions for related updates
- Create audit trails through `billingEvent` table
- Implement proper error rollback handling

### 2. File Organization Standards

**Three-File Pattern for Routes**
```
src/api/routes/{domain}/
├── route.ts          # OpenAPI route definitions
├── handler.ts        # Business logic implementation
└── schema.ts         # Request/response validation
```

**Consistent Import Structure**
```typescript
// 1. External dependencies
import { createRoute } from '@hono/zod-openapi';
import { HttpStatusCodes } from 'stoker/http-status-codes';

// 2. Internal core imports
import { createHandler, Responses, createError } from '@/api/core';

// 3. Domain-specific imports
import { getDbAsync } from '@/db';
import { user, subscription } from '@/db/tables/billing';

// 4. Local imports
import { CreateUserSchema, UserResponseSchema } from './schema';
```

### 3. Authentication Patterns

**Handler Authentication Modes**
- `'session'`: Requires authenticated user session
- `'session-optional'`: Attaches session if available
- `'public'`: No authentication required
- `'api-key'`: External API key authentication

**Session Context Usage**
```typescript
const handler = createHandler({
  auth: 'session',
  operationName: 'getUser',
}, async (c) => {
  const user = c.get('user');      // Always available with session auth
  const session = c.get('session'); // Always available with session auth
  // ... implementation
});
```

### 4. Error Handling Standards

**Use Factory Methods**
```typescript
// Import standardized error creators
import { createError } from '@/api/core';

// Use specific error types
throw createError.notFound('User not found');
throw createError.badRequest('Invalid email format');
throw createError.paymentFailed('ZarinPal transaction failed');
```

**Iranian Payment Context**
```typescript
// ZarinPal-specific errors
throw HTTPExceptionFactory.zarinPalError({
  operation: 'payment_request',
  zarinpalCode: '-33',
  zarinpalMessage: 'Amount below minimum threshold',
});
```

### 5. Schema Definition Standards

**OpenAPI Integration**
```typescript
export const CreateUserSchema = z.object({
  email: CoreSchemas.email().openapi({
    example: 'user@example.com',
    description: 'User email address',
  }),
  name: z.string().min(1).openapi({
    example: 'John Doe',
    description: 'User display name',
  }),
}).openapi('CreateUserRequest');

// Export TypeScript type
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
```

**Iranian Validation Integration**
```typescript
// Use built-in Iranian validators
import { IranianValidationSchemas } from '@/api/core';

const contractSchema = z.object({
  mobile: IranianValidationSchemas.mobileNumber,
  amount: IranianValidationSchemas.rialAmount,
});
```

### 6. Database Operation Patterns

**Transaction Usage**
```typescript
export const complexOperationHandler = createHandlerWithTransaction({
  auth: 'session',
  validateBody: OperationSchema,
  operationName: 'complexOperation',
}, async (c, tx) => {
  // All operations use transaction context 'tx'
  const result1 = await tx.insert(table1).values(data1);
  const result2 = await tx.update(table2).set(data2);

  // Create audit trail
  await tx.insert(billingEvent).values({
    userId: user.id,
    eventType: 'operation_completed',
    eventData: { result1, result2 },
  });

  return Responses.ok(c, { success: true });
});
```

**Query Patterns**
```typescript
// Use Drizzle ORM patterns with proper typing
const subscriptions = await db
  .select()
  .from(subscription)
  .where(and(
    eq(subscription.userId, user.id),
    eq(subscription.status, 'active')
  ))
  .orderBy(desc(subscription.createdAt));
```

### 7. Service Integration Patterns

**ZarinPal Service Usage**
```typescript
import { ZarinPalService } from '@/api/services/zarinpal';

const zarinpal = ZarinPalService.create();
const paymentResult = await zarinpal.requestPayment({
  amount: 99000,
  currency: 'IRR',
  description: 'Subscription payment',
  callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/payment/callback`,
  metadata: { subscriptionId: 'sub_123' },
});
```

**Error Context Preservation**
```typescript
try {
  const result = await externalService.call();
} catch (error) {
  throw createError.externalServiceError(
    'Payment gateway unavailable',
    {
      errorType: 'payment',
      provider: 'zarinpal',
      operation: 'payment_request',
      originalError: error instanceof Error ? error.message : String(error),
    }
  );
}
```

### 8. Logging and Monitoring

**Structured Logging**
```typescript
c.logger.info('Payment processed successfully', {
  logType: 'payment',
  provider: 'zarinpal',
  amount: 99000,
  currency: 'IRR',
  paymentId: 'pay_123',
  userId: user.id,
});
```

**Performance Monitoring**
```typescript
const startTime = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - startTime;

c.logger.info('Operation completed', {
  logType: 'performance',
  operation: 'expensiveOperation',
  duration,
  recordsProcessed: result.length,
});
```

### 9. Iranian Business Requirements

**Currency Handling**
- All amounts stored in Iranian Rials (smallest unit)
- Use `IranianValidationSchemas.rialAmount` for validation
- Implement currency conversion with smart rounding

**Mobile Number Normalization**
- Accept formats: `09123456789`, `+989123456789`, `9123456789`
- Normalize to `+98` format for storage
- Use `IranianValidationSchemas.mobileNumber` schema

**National ID Validation**
- Implement checksum validation for Iranian national IDs
- Use `iranianNationalIdSchema()` from core schemas
- Handle edge cases (repeated digits, invalid checksums)

### 10. Security Implementation

**Input Sanitization**
```typescript
import { sanitizeInput } from '@/api/core';

const sanitizedData = sanitizeInput(userInput, {
  allowedTags: [], // No HTML tags
  maxLength: 1000,
  stripXSS: true,
});
```

**Contract Signature Security**
```typescript
import { encryptSignature, decryptSignature } from '@/api/utils/crypto';

// Encrypt before storage
const { encrypted, hash } = await encryptSignature(signature);

// Store encrypted signature and hash
await db.insert(paymentMethod).values({
  contractSignatureEncrypted: encrypted,
  contractSignatureHash: hash,
});
```

### 11. Performance Optimization

**Cloudflare Workers Patterns**
```typescript
// Check if D1 database (Cloudflare)
const isD1 = typeof db.batch === 'function';

if (isD1) {
  // Use batch operations for better D1 performance
  await db.batch(operations);
} else {
  // Use transactions for local SQLite
  await db.transaction(async (tx) => {
    for (const op of operations) await op(tx);
  });
}
```

**Caching Strategies**
```typescript
// Service-level caching with TTL
private cache = new Map<string, { data: T; expires: number }>();

async getCachedData(key: string): Promise<T | null> {
  const cached = this.cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}
```

### 12. Testing Integration

**Handler Testing Pattern**
```typescript
import { testClient } from '@hono/testing';
import { app } from '@/api';

const client = testClient(app);

test('should create subscription', async () => {
  const response = await client.subscriptions.$post({
    json: {
      productId: 'prod_123',
      contractId: 'contract_123',
    },
  });

  expect(response.status).toBe(201);
  const result = await response.json();
  expect(result.success).toBe(true);
});
```

---

## Summary

This comprehensive backend patterns document serves as the definitive guide for all backend development in the billing dashboard project. It consolidates analysis from 10 specialized agents covering:

- **Authentication & Authorization** with Better Auth integration
- **Payment Processing** with ZarinPal API integration
- **Subscription Management** with Iranian business logic
- **Payment Methods** with encrypted contract storage
- **Webhook Processing** with security validation
- **Service Layer** architecture and error handling
- **Middleware** for cross-cutting concerns
- **Core Framework** foundations and utilities
- **Common Utilities** for shared functionality
- **System Infrastructure** and monitoring

**Key Architectural Principles**:

1. **Type Safety**: Zero-casting with Zod schemas and discriminated unions
2. **Transaction Safety**: Database consistency with comprehensive audit trails
3. **Iranian Compliance**: Mobile numbers, national IDs, Rial amounts, ZarinPal integration
4. **Security First**: Encrypted storage, input sanitization, rate limiting
5. **Performance**: Cloudflare Workers optimization, caching, circuit breakers
6. **Observability**: Structured logging, error correlation, health monitoring

All backend development should reference this document and follow the established patterns to ensure consistency, maintainability, and compliance with Iranian business requirements.

---

**Last Updated**: Generated by 10 parallel research-analyst agents analyzing the complete backend codebase
**Context Prime**: Essential reference for `backend-pattern-expert` and other specialized agents
**Maintenance**: Update when adding new domains or changing core patterns
# Backend Patterns - Implementation Guide

> **Context Prime Document**: Essential reference for all backend development in the Roundtable Platform. This document serves as the single source of truth for backend implementation standards.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Patterns](#authentication-patterns)
3. [API Route Patterns](#api-route-patterns)
4. [Service Layer Patterns](#service-layer-patterns)
5. [Middleware Patterns](#middleware-patterns)
6. [Database Patterns](#database-patterns)
7. [Error Handling](#error-handling)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Architecture Overview

The Roundtable Platform implements a modern, type-safe API architecture built on:
- **Hono.js** - Fast, lightweight web framework
- **Cloudflare Workers** - Edge runtime for global performance
- **Drizzle ORM** - Type-safe database operations
- **Better Auth** - Modern authentication
- **Zod** - Runtime type validation

### Core Principles

- **Factory Pattern Handlers** with integrated validation and authentication
- **Zero-Casting Type Safety** using Zod schemas and type guards
- **Batch-First Database Operations** for atomic consistency (Cloudflare D1)
- **Middleware-Based Security** with rate limiting and CSRF protection
- **OpenAPI Documentation** auto-generated from code

### Directory Structure

```
src/api/
├── routes/{domain}/           # Domain-specific routes (3-file pattern)
│   ├── route.ts              # OpenAPI route definitions
│   ├── handler.ts            # Business logic implementation
│   └── schema.ts             # Zod validation schemas
├── services/                 # Business logic services (currently empty - to be implemented)
├── middleware/               # Cross-cutting concerns
├── core/                     # Framework foundations
├── common/                   # Shared utilities
└── types/                    # Type definitions
```

---

## Authentication Patterns

### Better Auth Integration

**Reference**: `src/lib/auth/server/index.ts`

```typescript
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: createAuthAdapter(),

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  plugins: [
    nextCookies(),
    admin(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await emailService.sendMagicLink(email, url);
      },
    }),
  ],
});
```

### Session Middleware

**Reference**: `src/api/middleware/auth.ts`

The project uses two middleware patterns for session management:

**1. requireSession - For Protected Routes**
```typescript
export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  const { session, user } = await authenticateSession(c);

  if (!user || !session) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      res: new Response(JSON.stringify({
        code: HttpStatusCodes.UNAUTHORIZED,
        message: 'Authentication required',
        details: 'Valid session required to access this resource',
      }), {
        status: HttpStatusCodes.UNAUTHORIZED,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Session realm="api"',
        },
      }),
    });
  }

  return next();
});
```

**2. attachSession - For Optional Authentication**
```typescript
export const attachSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    await authenticateSession(c);
  } catch (error) {
    // Log error but don't throw - allow unauthenticated requests to proceed
    apiLogger.apiError(c, 'Error retrieving Better Auth session', error);
    c.set('session', null);
    c.set('user', null);
  }
  return next();
});
```

**3. Handler Factory Authentication (Preferred)**
```typescript
// Modern approach - authentication integrated into handler
export const handler = createHandler(
  {
    auth: 'session', // or 'session-optional', 'public', 'api-key'
    operationName: 'getUser',
  },
  async (c) => {
    // Session and user automatically available in context
    const user = c.get('user');
    const session = c.get('session');
    // ... implementation
  }
);
```

---

## API Route Patterns

### Three-File Pattern

Every API domain follows this structure:

**1. route.ts** - OpenAPI Route Definitions
```typescript
export const secureMeRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['users'],
  summary: 'Get current authenticated user',
  request: {
    params: z.object({
      id: CoreSchemas.id(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'User retrieved successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(SecureMePayloadSchema),
        },
      },
    },
  },
});
```

**2. handler.ts** - Business Logic
```typescript
export const secureMeHandler = createHandler(
  {
    auth: 'session',
    operationName: 'getUser',
  },
  async (c) => {
    const { id } = c.req.valid('param');
    const user = c.get('user');

    c.logger.info('Fetching user', {
      logType: 'operation',
      operationName: 'getUser',
      userId: user.id,
      targetId: id,
    });

    const targetUser = await db.query.user.findFirst({
      where: eq(tables.user.id, id),
    });

    if (!targetUser) {
      throw createError.notFound('User not found');
    }

    return Responses.ok(c, targetUser);
  },
);
```

**3. schema.ts** - Validation Schemas
```typescript
export const SecureMePayloadSchema = z.object({
  id: CoreSchemas.id().openapi({
    example: 'cm4abc123',
    description: 'User identifier',
  }),
  email: CoreSchemas.email().openapi({
    example: 'user@example.com',
  }),
  name: z.string().min(1).openapi({
    example: 'John Doe',
  }),
}).openapi('User');

export type User = z.infer<typeof SecureMePayloadSchema>;
```

---

## Service Layer Patterns

### Service Organization

The `/src/api/services/` directory is currently empty. Services will be implemented as needed to handle business logic and external integrations following these patterns:

**When implementing services, follow this structure:**

```typescript
class ExampleService {
  constructor(private config: ServiceConfig) {}

  async performOperation(params: OperationParams): Promise<OperationResult> {
    // Implementation with proper error handling and logging
  }

  private async internalHelper(data: HelperData): Promise<HelperResult> {
    // Implementation
  }
}

export const exampleService = new ExampleService(getServiceConfig());
```

### Service Best Practices (for future implementations)

1. **Dependency Injection**: Pass configuration through constructor
2. **Error Handling**: Wrap external calls in try-catch with proper error types
3. **Logging**: Use structured logging for all operations
4. **Type Safety**: Return typed results, never `any`

**Note**: Currently, business logic is implemented directly in route handlers. The service layer will be introduced when needed for:
- Complex business logic that spans multiple routes
- External API integrations
- Reusable operations across different domains

---

## Middleware Patterns

### Available Middleware Files

Located in `/src/api/middleware/`:

- **auth.ts** - Session authentication (`attachSession`, `requireSession`)
- **rate-limiter-factory.ts** - Rate limiting with preset configurations
- **size-limits.ts** - Request/response size validation
- **hono-logger.ts** - Structured logging for API requests
- **environment-validation.ts** - Environment variable validation
- **index.ts** - Middleware exports

**Note**: CORS and CSRF middleware are configured inline in `/src/api/index.ts` (lines 79-139), not as separate middleware files.

### Authentication Middleware

**Reference**: `src/api/middleware/auth.ts`

The project provides a shared authentication helper and two middleware patterns:

**Internal Helper Function**:
```typescript
// authenticateSession - Shared authentication helper
// Extracts session from request headers and sets context variables
// Used internally by attachSession and requireSession middleware
async function authenticateSession(c: Context<ApiEnv>): Promise<{
  session: SelectSession | null;
  user: SelectUser | null;
}> {
  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  // Normalize undefined fields to null for proper type safety
  const session = sessionData?.session ? {
    ...sessionData.session,
    ipAddress: sessionData.session.ipAddress ?? null,
    userAgent: sessionData.session.userAgent ?? null,
    impersonatedBy: sessionData.session.impersonatedBy ?? null,
  } as SelectSession : null;

  const user = sessionData?.user ? {
    ...sessionData.user,
    image: sessionData.user.image ?? null,
    role: sessionData.user.role ?? null,
    banned: sessionData.user.banned ?? null,
    banReason: sessionData.user.banReason ?? null,
    banExpires: sessionData.user.banExpires ?? null,
  } as SelectUser : null;

  c.set('session', session);
  c.set('user', user);
  c.set('requestId', c.req.header('x-request-id') || crypto.randomUUID());

  return { session, user };
}
```

**Public Middleware - attachSession**:
```typescript
// Attach session if present; does not enforce authentication
// Allows unauthenticated requests to proceed
export const attachSession = createMiddleware<ApiEnv>(async (c, next) => {
  try {
    await authenticateSession(c);
  } catch (error) {
    // Log error but don't throw
    apiLogger.apiError(c, 'Error retrieving Better Auth session', error);
    c.set('session', null);
    c.set('user', null);
  }
  return next();
});
```

**Public Middleware - requireSession**:
```typescript
// Require an authenticated session using Better Auth
// Throws 401 Unauthorized if session is missing or invalid
export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  const { session, user } = await authenticateSession(c);

  if (!user || !session) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      res: new Response(JSON.stringify({
        code: HttpStatusCodes.UNAUTHORIZED,
        message: 'Authentication required',
        details: 'Valid session required to access this resource',
      }), {
        status: HttpStatusCodes.UNAUTHORIZED,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Session realm="api"',
        },
      }),
    });
  }

  return next();
});
```

### Rate Limiting Middleware

**Reference**: `src/api/middleware/rate-limiter-factory.ts`

```typescript
import { RateLimiterFactory } from '@/api/middleware/rate-limiter-factory';

// Use preset configurations
app.use('*', RateLimiterFactory.create('api')); // General API rate limiting
app.use('/auth/*', RateLimiterFactory.create('auth')); // Auth-specific limits
app.use('/upload/*', RateLimiterFactory.create('upload')); // Upload limits

// Custom rate limiter
const customLimiter = RateLimiterFactory.createCustom({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests',
});
```

### Size Limits Middleware

**Reference**: `src/api/middleware/size-limits.ts`

```typescript
import {
  createRequestSizeLimitMiddleware,
  createFileUploadSizeLimitMiddleware,
  DEFAULT_SIZE_LIMITS,
} from '@/api/middleware/size-limits';

// Request size validation
app.use('*', createRequestSizeLimitMiddleware({
  requestBody: 10 * 1024 * 1024, // 10MB
}));

// File upload size validation
app.use('/upload/*', createFileUploadSizeLimitMiddleware({
  fileUpload: 50 * 1024 * 1024, // 50MB
}));
```

### Logging Middleware

**Reference**: `src/api/middleware/hono-logger.ts`

```typescript
import { honoLoggerMiddleware, errorLoggerMiddleware } from '@/api/middleware/hono-logger';

// Request/response logging
app.use('*', honoLoggerMiddleware);

// Error logging
app.use('*', errorLoggerMiddleware);
```

### Environment Validation Middleware

**Reference**: `src/api/middleware/environment-validation.ts`

```typescript
import { createEnvironmentValidationMiddleware } from '@/api/middleware/environment-validation';

// Validate required environment variables on startup
app.use('*', createEnvironmentValidationMiddleware());
```

### CORS and CSRF Configuration

**Reference**: `src/api/index.ts` (lines 79-139)

CORS and CSRF are configured inline in the main API file, not as separate middleware:

```typescript
// CORS configuration (inline in index.ts)
app.use('*', (c, next) => {
  const appUrl = c.env.NEXT_PUBLIC_APP_URL;
  const webappEnv = c.env.NEXT_PUBLIC_WEBAPP_ENV || 'local';
  const isDevelopment = webappEnv === 'local' || c.env.NODE_ENV === 'development';

  const allowedOrigins: string[] = [];
  if (isDevelopment) {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  if (appUrl && !appUrl.includes('localhost')) {
    allowedOrigins.push(appUrl);
  }

  const middleware = cors({
    origin: (origin) => {
      if (!origin) return origin;
      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  });
  return middleware(c, next);
});

// CSRF protection (inline in index.ts)
function csrfMiddleware(c: Context<ApiEnv>, next: Next) {
  const appUrl = c.env.NEXT_PUBLIC_APP_URL;
  // ... similar origin configuration
  const middleware = csrf({ origin: allowedOrigins });
  return middleware(c, next);
}

// Applied selectively to protected routes
app.use('/auth/me', csrfMiddleware, requireSession);
```

---

## Database Patterns

### Drizzle ORM Usage

```typescript
// Query pattern
const users = await db.query.user.findMany({
  where: eq(tables.user.emailVerified, true),
  orderBy: desc(tables.user.createdAt),
  limit: 10,
});

// Insert pattern
const newUser = await db.insert(tables.user).values({
  email: 'user@example.com',
  name: 'John Doe',
}).returning();

// Update pattern
await db.update(tables.user)
  .set({ emailVerified: true })
  .where(eq(tables.user.id, userId));

// Delete pattern
await db.delete(tables.user)
  .where(eq(tables.user.id, userId));
```

### 🚨 Batch Operations - Cloudflare D1 Pattern (REQUIRED)

**⚠️ CRITICAL**: Traditional `db.transaction()` is **PROHIBITED** with Cloudflare D1. Use `db.batch()` instead.

**Why Batch Operations?**
- Cloudflare D1 is optimized for batch operations, not transactions
- Batches provide atomic execution with better performance in serverless
- Transactions have limitations and performance issues in D1
- ESLint rules enforce batch-first architecture

#### Pattern 1: Manual Batch Operations

```typescript
// ✅ CORRECT: Using db.batch() for atomic operations
const [insertResult, updateResult] = await db.batch([
  db.insert(tables.user).values({ email, name }).returning(),
  db.insert(tables.profile).values({ userId: newUserId, bio: '' })
]);

// Multiple operations in single atomic batch
await db.batch([
  db.insert(tables.stripeCustomer).values(customer),
  db.update(tables.user).set({ hasCustomer: true }).where(eq(tables.user.id, userId)),
  db.insert(tables.webhookEvent).values(eventLog)
]);
```

#### Pattern 2: createHandlerWithBatch (RECOMMENDED)

The `createHandlerWithBatch` factory provides automatic batch accumulation:

```typescript
// ✅ RECOMMENDED: Automatic batching in handlers
export const createUserHandler = createHandlerWithBatch(
  {
    auth: 'session',
    validateBody: CreateUserSchema,
  },
  async (c, batch) => {
    const body = c.validated.body;

    // Operations are automatically accumulated in batch
    const [newUser] = await batch.db.insert(tables.user).values({
      email: body.email,
      name: body.name,
    }).returning();

    // This operation is added to the same batch
    await batch.db.insert(tables.profile).values({
      userId: newUser.id,
      bio: body.bio || '',
    });

    // Batch executes atomically when handler completes
    return Responses.ok(c, { user: newUser });
  }
);
```

**How it works:**
1. All `batch.db.*` operations are collected during handler execution
2. At handler completion, all operations execute in single atomic batch
3. If any operation fails, all operations rollback automatically
4. Zero boilerplate - just use `batch.db` instead of `db`

#### Pattern 3: Conditional Batch Operations

```typescript
export const syncStripeHandler = createHandlerWithBatch(
  { auth: 'session' },
  async (c, batch) => {
    // Conditional operations still batched atomically
    await batch.db.insert(tables.stripeCustomer).values(customer);

    if (hasSubscription) {
      await batch.db.insert(tables.stripeSubscription).values(subscription);
    }

    if (hasInvoices) {
      await batch.db.insert(tables.stripeInvoice).values(invoice);
    }

    // All operations execute atomically together
  }
);
```

#### Pattern 4: Upsert in Batches

```typescript
await db.batch([
  db.insert(tables.stripeCustomer).values(customer).onConflictDoUpdate({
    target: tables.stripeCustomer.id,
    set: { email: customer.email, updatedAt: new Date() }
  }),
  db.insert(tables.stripeSubscription).values(subscription)
]);
```

#### ❌ PROHIBITED Pattern: db.transaction()

```typescript
// ❌ WRONG: This will trigger ESLint error and TypeScript error
await db.transaction(async (tx) => {
  await tx.insert(tables.user).values(newUser);
  await tx.update(tables.user).set({ verified: true });
});

// Error: local/no-db-transactions
// Error: Property 'transaction' does not exist on type 'D1BatchDatabase'
```

#### Migration from Transactions to Batches

**Before (Transaction):**
```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.update(users).set({ verified: true }).where(eq(users.id, userId));
  await tx.delete(users).where(eq(users.inactive, true));
});
```

**After (Batch):**
```typescript
await db.batch([
  db.insert(users).values(newUser),
  db.update(users).set({ verified: true }).where(eq(users.id, userId)),
  db.delete(users).where(eq(users.inactive, true))
]);
```

**After (Batch Handler - Recommended):**
```typescript
export const handler = createHandlerWithBatch({ auth: 'session' }, async (c, batch) => {
  await batch.db.insert(users).values(newUser);
  await batch.db.update(users).set({ verified: true }).where(eq(users.id, userId));
  await batch.db.delete(users).where(eq(users.inactive, true));
});
```

#### Type Safety

The project enforces batch-first architecture through:

**TypeScript Types:**
```typescript
import type { D1BatchDatabase } from '@/db/d1-types';

const db = await getDbAsync(); // Returns D1BatchDatabase<Schema>
// db.transaction() -> TypeScript error: Property 'transaction' does not exist
// db.batch() -> ✅ Correct
```

**ESLint Rules:**
- `local/no-db-transactions`: Blocks db.transaction() usage (ERROR)
- `local/prefer-batch-handler`: Suggests createHandlerWithBatch (WARNING)
- `local/batch-context-awareness`: Prefer batch.db over getDbAsync() (WARNING)

**Reference Implementation:**
- `src/api/routes/billing/handler.ts:171-283` - Stripe checkout with batch operations
- `src/api/services/stripe-sync.service.ts:131-165` - Subscription upsert in batch
- `src/api/core/handlers.ts:490-605` - createHandlerWithBatch implementation
- `src/db/d1-types.ts` - Type definitions and patterns
- `eslint-local-rules.js` - ESLint enforcement

**Further Reading:**
- [Cloudflare D1 Batch API](https://developers.cloudflare.com/d1/build-with-d1/d1-client-api/#batch-statements)
- [Drizzle ORM Batch Operations](https://orm.drizzle.team/docs/batch-api)

---

## Error Handling

### Structured Errors

```typescript
// Create typed errors
throw createError.notFound('Resource not found', {
  resource: 'user',
  id: userId,
});

throw createError.badRequest('Invalid input', {
  field: 'email',
  reason: 'Email already exists',
});

throw createError.unauthenticated('Authentication required');

throw createError.forbidden('Insufficient permissions');

throw createError.internal('Internal server error');
```

### Response Helpers

```typescript
// Success responses
return Responses.ok(c, data);
return Responses.created(c, newResource);

// Error responses  
return Responses.error(c, 'Error message', HttpStatusCodes.BAD_REQUEST);
return Responses.notFound(c, 'Resource not found');
```

---

## Implementation Guidelines

### 1. Route Creation Checklist

- [ ] Create route definition in `route.ts`
- [ ] Add Zod schema in `schema.ts`
- [ ] Implement handler in `handler.ts` using `createHandler`
- [ ] Add OpenAPI documentation with examples
- [ ] Include proper error responses
- [ ] Add structured logging
- [ ] Test with authentication

### 2. Database Operation Guidelines

- [ ] Use transactions for multi-table operations
- [ ] Include proper error handling
- [ ] Log all database operations
- [ ] Use type-safe queries with Drizzle
- [ ] Validate input with Zod schemas

### 3. Security Checklist

- [ ] Authenticate requests with session middleware
- [ ] Validate all input with Zod
- [ ] Sanitize user input
- [ ] Use CSRF protection for mutations
- [ ] Implement rate limiting
- [ ] Log security-relevant events

### 4. Code Quality Standards

- [ ] Zero TypeScript `any` types
- [ ] No type casting unless absolutely necessary
- [ ] Comprehensive error handling
- [ ] Structured logging for all operations
- [ ] OpenAPI documentation complete
- [ ] Follow established patterns

---

## Conclusion

These patterns ensure consistency, type safety, and maintainability across the Roundtable Platform backend. Always reference existing implementations when adding new features, and maintain these established patterns for optimal developer experience.

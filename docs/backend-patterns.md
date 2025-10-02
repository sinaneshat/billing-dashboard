# Backend Patterns - Implementation Guide

> **Context Prime Document**: Essential reference for all backend development in the Roundtable Dashboard. This document serves as the single source of truth for backend implementation standards.

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

The Roundtable Dashboard implements a modern, type-safe API architecture built on:
- **Hono.js** - Fast, lightweight web framework
- **Cloudflare Workers** - Edge runtime for global performance
- **Drizzle ORM** - Type-safe database operations
- **Better Auth** - Modern authentication
- **Zod** - Runtime type validation

### Core Principles

- **Factory Pattern Handlers** with integrated validation and authentication
- **Zero-Casting Type Safety** using Zod schemas and type guards
- **Transactional Database Operations** for data consistency
- **Middleware-Based Security** with rate limiting and CSRF protection
- **OpenAPI Documentation** auto-generated from code

### Directory Structure

```
src/api/
├── routes/{domain}/           # Domain-specific routes (3-file pattern)
│   ├── route.ts              # OpenAPI route definitions
│   ├── handler.ts            # Business logic implementation
│   └── schema.ts             # Zod validation schemas
├── services/                 # Business logic services
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

```typescript
export const requireSession = createMiddleware(async (c, next) => {
  const sessionUser = await getSessionUser(c);
  
  if (!sessionUser?.user || !sessionUser?.session) {
    throw createError.unauthenticated('Authentication required');
  }

  c.set('user', sessionUser.user);
  c.set('session', sessionUser.session);
  
  await next();
});
```

---

## API Route Patterns

### Three-File Pattern

Every API domain follows this structure:

**1. route.ts** - OpenAPI Route Definitions
```typescript
export const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  tags: ['users'],
  summary: 'Get user by ID',
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
          schema: createApiResponseSchema(UserSchema),
        },
      },
    },
  },
});
```

**2. handler.ts** - Business Logic
```typescript
export const getUserHandler = createHandler(
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
export const UserSchema = z.object({
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

export type User = z.infer<typeof UserSchema>;
```

---

## Service Layer Patterns

### Service Organization

Services handle business logic and external integrations:

```typescript
class EmailService {
  constructor(private config: EmailConfig) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${this.config.appUrl}/verify?token=${token}`;
    
    await this.send({
      to: email,
      subject: 'Verify your email',
      template: 'verification',
      data: { url },
    });
  }

  private async send(params: EmailParams): Promise<void> {
    // Implementation
  }
}

export const emailService = new EmailService(getEmailConfig());
```

### Service Best Practices

1. **Dependency Injection**: Pass configuration through constructor
2. **Error Handling**: Wrap external calls in try-catch with proper error types
3. **Logging**: Use structured logging for all operations
4. **Type Safety**: Return typed results, never `any`

---

## Middleware Patterns

### Authentication Middleware

```typescript
export const attachSession = createMiddleware(async (c, next) => {
  const sessionUser = await getSessionUser(c);
  
  if (sessionUser?.user && sessionUser?.session) {
    c.set('user', sessionUser.user);
    c.set('session', sessionUser.session);
  }
  
  await next();
});
```

### Logging Middleware

```typescript
export const honoLoggerMiddleware = logger((message, ...args) => {
  apiLogger.info(message, {
    component: 'hono-logger',
    logType: 'system',
    data: args,
  });
});
```

### Error Handling Middleware

```typescript
export const errorLoggerMiddleware = createMiddleware(async (c, next) => {
  try {
    await next();
  } catch (error) {
    apiLogger.error('Request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: c.req.path,
      method: c.req.method,
      component: 'error-middleware',
    });
    throw error;
  }
});
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

### Transaction Pattern

```typescript
await db.transaction(async (tx) => {
  const user = await tx.insert(tables.user).values({
    email,
    name,
  }).returning();

  await tx.insert(tables.profile).values({
    userId: user[0].id,
    bio: '',
  });
});
```

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

These patterns ensure consistency, type safety, and maintainability across the Roundtable Dashboard backend. Always reference existing implementations when adding new features, and maintain these established patterns for optimal developer experience.

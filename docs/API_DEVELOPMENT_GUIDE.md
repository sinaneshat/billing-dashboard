# API Development Guide - Billing Dashboard

## 🎯 **Overview**

This guide establishes the **unified, type-safe development patterns** for all API endpoints in the Billing Dashboard. Following these patterns ensures **zero type casting**, **consistent error handling**, **maximum reusability**, and **optimal developer experience**.

## 🏗️ **Architecture Principles**

### **1. Schema-First Development**
- **All types are inferred from Zod schemas** - never define types separately
- **Zero casting policy** - no `as Type`, `any` casting, or manual type assertions
- **Validation at boundaries** - all external data must be validated
- **Discriminated unions** for results - explicit success/failure patterns

### **2. Factory Pattern**
- **Unified handler creation** - `createHandler` and `createHandlerWithTransaction`
- **Consistent authentication** - built-in auth modes
- **Automatic validation** - request/response validation
- **Error handling** - standardized error responses

### **3. Repository Pattern**
- **BaseRepository** - extends for all data access
- **Type-safe queries** - validated results with discriminated unions
- **Transaction support** - automatic transaction management
- **Audit fields** - consistent created/updated metadata

## 📁 **Directory Structure**

```
src/api/
├── core/              # Core infrastructure (handlers, responses, schemas)
├── common/            # Shared utilities (validation, error handling, patterns)  
├── patterns/          # Reusable patterns (repositories, services)
├── routes/            # API endpoints organized by domain
│   ├── auth/          # Authentication endpoints
│   ├── payments/      # Payment-related endpoints
│   ├── subscriptions/ # Subscription management
│   └── ...
├── middleware/        # Request/response middleware
├── repositories/      # Data access layer
└── services/          # Business logic services
```

## 🚀 **Development Workflow**

### **Step 1: Define Schemas**

```typescript
// route/schema.ts
import { z } from 'zod';
import { createEntitySchema, createInsertSchema, createUpdateSchema } from '@/api/common/schema-first-patterns';
import { CoreSchemas } from '@/api/core';

// 1. Define entity schema
export const UserSchema = createEntitySchema({
  email: CoreSchemas.email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']),
  isActive: z.boolean().default(true),
}, { withAudit: true, withSoftDelete: true });

// 2. Create derived schemas
export const CreateUserSchema = createInsertSchema(UserSchema);
export const UpdateUserSchema = createUpdateSchema(UserSchema);
export const UserParamsSchema = z.object({
  id: CoreSchemas.uuid(),
});

// 3. Export inferred types
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
```

### **Step 2: Define Routes**

```typescript
// route/route.ts  
import { createRoute, z } from '@hono/zod-openapi';
import { Responses } from '@/api/core';
import { CreateUserSchema, UpdateUserSchema, UserParamsSchema, UserSchema } from './schema';

export const createUserRoute = createRoute({
  method: 'post',
  path: '/users',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserSchema } },
    },
  },
  responses: {
    201: Responses.schema(UserSchema, 'User created successfully'),
    400: Responses.validationError(),
    401: Responses.unauthorized(),
  },
  tags: ['Users'],
  summary: 'Create new user',
});
```

### **Step 3: Create Handlers**

```typescript
// route/handler.ts
import type { RouteHandler } from '@hono/zod-openapi';
import { createHandler, Responses } from '@/api/core';
import { UserRepository } from '@/api/repositories/user-repository';
import type { ApiEnv } from '@/api/types';
import type { createUserRoute } from './route';
import { CreateUserSchema, UserParamsSchema } from './schema';

export const createUserHandler: RouteHandler<typeof createUserRoute, ApiEnv> = createHandler({
  auth: 'session',
  body: CreateUserSchema,
  operationName: 'CreateUser',
}, async (c) => {
  const userData = c.validated.body;
  
  const result = await UserRepository.create(userData);
  if (!result.success) {
    throw createError.database('Failed to create user');
  }
  
  return Responses.created(c, result.data);
});
```

### **Step 4: Repository Implementation**

```typescript
// repositories/user-repository.ts
import { BaseRepository } from '@/api/patterns/base-repository';
import { users } from '@/db/schema';
import type { User, CreateUser, UpdateUser } from '@/api/routes/users/schema';
import { UserSchema, CreateUserSchema, UpdateUserSchema } from '@/api/routes/users/schema';

export class UserRepository extends BaseRepository<User, CreateUser, UpdateUser> {
  constructor() {
    super(
      users, // Drizzle table
      {
        tableName: 'users',
        primaryKey: 'id',
        hasAuditFields: true,
        hasSoftDelete: true,
      },
      {
        select: UserSchema,
        insert: CreateUserSchema,
        update: UpdateUserSchema,
      }
    );
  }

  // Custom methods can be added
  async findByEmail(email: string) {
    return this.findFirst({ email });
  }
}

export const userRepository = new UserRepository();
```

## 🛠️ **Handler Configuration**

### **Authentication Modes**

```typescript
// Public endpoint
createHandler({ auth: 'public' }, handler);

// Requires session
createHandler({ auth: 'session' }, handler);

// Requires API key  
createHandler({ auth: 'api-key' }, handler);

// Optional session
createHandler({ auth: 'session-optional' }, handler);
```

### **Validation Configuration**

```typescript
createHandler({
  auth: 'session',
  body: CreateUserSchema,        // Request body validation
  query: ListQuerySchema,        // Query params validation  
  params: UserParamsSchema,      // URL params validation
  operationName: 'CreateUser',   // For logging/monitoring
}, async (c) => {
  // c.validated.body - validated request body
  // c.validated.query - validated query params
  // c.validated.params - validated URL params
});
```

### **Transaction Support**

```typescript
// Automatic transaction wrapping
export const updateUserHandler = createHandlerWithTransaction({
  auth: 'session',
  body: UpdateUserSchema,
  params: UserParamsSchema,
  operationName: 'UpdateUser',
}, async (c, tx) => {
  // tx is the transaction object
  const result = await UserRepository.update(
    c.validated.params.id, 
    c.validated.body,
    { tx }
  );
  
  return Responses.success(c, result.data);
});
```

## 📊 **Response Patterns**

### **Standard Responses**

```typescript
import { Responses } from '@/api/core';

// Success responses
return Responses.success(c, userData);           // 200
return Responses.created(c, newUser);           // 201  
return Responses.accepted(c, taskId);           // 202
return Responses.noContent(c);                  // 204

// Paginated responses
return Responses.paginated(c, {
  items: users,
  total: 100,
  page: 1, 
  limit: 20
});

// Error responses (thrown, not returned)
throw createError.validation('Invalid email format');
throw createError.notFound('User not found'); 
throw createError.unauthorized('Access denied');
```

### **Custom Response Schemas**

```typescript
// In route definition
responses: {
  200: Responses.schema(UserSchema, 'User retrieved successfully'),
  404: Responses.notFound('User not found'),
}
```

## 🔧 **Repository Patterns**

### **BaseRepository Methods**

```typescript
class UserRepository extends BaseRepository<User, CreateUser, UpdateUser> {
  // Inherited methods:
  async create(data: CreateUser) => QueryResult<User>
  async findById(id: string) => QueryResult<User | null>
  async update(id: string, data: UpdateUser) => QueryResult<User>
  async delete(id: string) => QueryResult<boolean>
  async findFirst(where: Partial<User>) => QueryResult<User | null>
  async findMany(options: QueryOptions) => QueryResult<{ items: User[], total: number }>
}
```

### **Custom Repository Methods**

```typescript
class UserRepository extends BaseRepository<User, CreateUser, UpdateUser> {
  async findActiveUsers(): Promise<QueryResult<User[]>> {
    try {
      const result = await this.db
        .select()
        .from(this.table)
        .where(eq(this.table.isActive, true));
        
      return this.parseQueryResult(result);
    } catch (error) {
      return this.handleError(error, 'findActiveUsers');
    }
  }
}
```

## ⚡ **Validation Patterns**

### **Zero Casting Validation**

```typescript
import { parseWithSchema } from '@/api/common/universal-validation';

// ✅ Correct - No casting
const result = parseWithSchema(data, UserSchema);
if (!result.success) {
  throw createError.validation(result.error);
}
const validUser = result.data; // Type is User

// ❌ Wrong - Never do this  
const user = data as User;
```

### **Schema Utilities**

```typescript
import { 
  createEntitySchema, 
  createInsertSchema, 
  createUpdateSchema,
  createValidator,
  createTypeGuard 
} from '@/api/common/schema-first-patterns';

// Create type guards
const isUser = createTypeGuard(UserSchema);
if (isUser(data)) {
  // data is now type User
}

// Create validators  
const validateUser = createValidator(UserSchema);
const result = validateUser(data); // Returns ValidationResult<User>
```

## 🚨 **Error Handling**

### **Standard Error Types**

```typescript
import { createError } from '@/api/common/error-handling';

// Validation errors
throw createError.validation('Invalid email format');

// Not found errors  
throw createError.notFound('User not found');

// Authentication/authorization
throw createError.unauthorized('Access denied');
throw createError.forbidden('Insufficient permissions');

// Business logic errors
throw createError.conflict('User already exists');
throw createError.database('Failed to save user');
```

### **Error Context**

```typescript
throw createError.validation('Invalid input', {
  errorType: 'validation',
  fieldErrors: [
    { field: 'email', message: 'Invalid email format' }
  ]
});
```

## 📝 **Best Practices**

### **✅ DO**

1. **Always use schema-first development**
2. **Use createHandler/createHandlerWithTransaction**
3. **Extend BaseRepository for data access**
4. **Use discriminated unions for results**
5. **Validate at API boundaries**
6. **Use Responses utility for consistency**
7. **Follow the established directory structure**
8. **Write descriptive operation names for monitoring**

### **❌ DON'T**

1. **Never use type casting (`as Type`, `any`)**
2. **Don't create manual type definitions alongside schemas**
3. **Don't bypass validation with direct database access**
4. **Don't create custom response formats**
5. **Don't mix authentication patterns**
6. **Don't ignore transaction requirements for multi-step operations**
7. **Don't create repositories without extending BaseRepository**

## 🔍 **Code Examples**

### **Complete CRUD Endpoint**

```typescript
// schema.ts
export const ProductSchema = createEntitySchema({
  name: z.string().min(1).max(255),
  price: CoreSchemas.amount(),
  category: z.enum(['premium', 'standard']),
  isActive: z.boolean().default(true),
}, { withAudit: true });

export const CreateProductSchema = createInsertSchema(ProductSchema);
export const UpdateProductSchema = createUpdateSchema(ProductSchema);

// route.ts
export const listProductsRoute = createRoute({
  method: 'get',
  path: '/products',
  request: { query: ListQuerySchema },
  responses: {
    200: Responses.paginated(ProductSchema, 'Products retrieved'),
  },
});

// handler.ts  
export const listProductsHandler = createHandler({
  auth: 'session',
  query: ListQuerySchema,
  operationName: 'ListProducts',
}, async (c) => {
  const query = c.validated.query;
  
  const result = await ProductRepository.findMany({
    pagination: { page: query.page, limit: query.limit },
    filters: query.filters,
  });
  
  if (!result.success) {
    throw createError.database('Failed to fetch products');
  }
  
  return Responses.paginated(c, result.data);
});
```

## 🧪 **Testing Patterns**

```typescript
// Use the same schemas for testing
import { ProductSchema } from '@/api/routes/products/schema';

describe('Products API', () => {
  test('should create product with valid data', async () => {
    const productData = {
      name: 'Test Product',
      price: 1000,
      category: 'premium',
    };
    
    // Validate test data against schema
    const validation = parseWithSchema(productData, CreateProductSchema);
    expect(validation.success).toBe(true);
    
    const response = await testClient.products.create.$post({
      json: productData
    });
    
    expect(response.status).toBe(201);
  });
});
```

## 🚀 **Migration Guide**

When updating existing endpoints to follow these patterns:

1. **Extract schemas** from existing validation code
2. **Replace manual handlers** with `createHandler`
3. **Update data access** to use repository pattern  
4. **Standardize responses** using `Responses` utility
5. **Remove type casting** and use proper validation
6. **Add proper error handling** with `createError`

## 📚 **Reference**

- **Handler Factory**: `src/api/core/handlers.ts`
- **Response Utilities**: `src/api/core/responses.ts`
- **Schema Patterns**: `src/api/common/schema-first-patterns.ts`
- **Base Repository**: `src/api/patterns/base-repository.ts`
- **Validation Utilities**: `src/api/common/universal-validation.ts`
- **Error Handling**: `src/api/common/error-handling.ts`

---

**Following these patterns ensures type safety, consistency, and maintainability across all API endpoints.**
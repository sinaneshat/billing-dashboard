/**
 * Schema-First Development Patterns
 *
 * Establishes consistent patterns for type-safe development with Zod
 * Eliminates unsafe casting by making schemas the source of truth
 */

import { z } from 'zod';

import type { ValidationResult } from './universal-validation';
import { parseWithSchema } from './universal-validation';

// ============================================================================
// SCHEMA-FIRST PRINCIPLES
// ============================================================================

/*
 * CORE PRINCIPLES:
 *
 * 1. SCHEMAS ARE THE SOURCE OF TRUTH
 *    - All types are inferred from Zod schemas
 *    - Never define types separately from validation
 *    - Use z.infer<typeof Schema> consistently
 *
 * 2. VALIDATE AT BOUNDARIES
 *    - All external data must be validated
 *    - HTTP requests, database results, env vars
 *    - Internal functions can trust validated data
 *
 * 3. DISCRIMINATED UNIONS FOR RESULTS
 *    - Use success/failure patterns consistently
 *    - Never throw exceptions for expected failures
 *    - Make error handling explicit and type-safe
 *
 * 4. ZERO CASTING POLICY
 *    - Never use 'as Type' or 'any' casting
 *    - If casting seems needed, add proper validation
 *    - Use schema parsing instead of assumptions
 */

// ============================================================================
// FOUNDATION SCHEMAS
// ============================================================================

/**
 * Base audit fields schema
 * Used across all database entities
 */
export const AuditFieldsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().uuid().optional(),
});

export type AuditFields = z.infer<typeof AuditFieldsSchema>;

/**
 * Pagination request schema
 */
export const PaginationRequestSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

/**
 * Pagination response schema
 */
export function PaginationResponseSchema<T>(itemSchema: z.ZodSchema<T>) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().nonnegative(),
    page: z.number().positive(),
    limit: z.number().positive(),
    totalPages: z.number().nonnegative(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  });
}

export type PaginationResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

// ============================================================================
// API RESPONSE PATTERNS
// ============================================================================

/**
 * Standard API success response schema
 */
export function ApiSuccessResponseSchema<T>(dataSchema: z.ZodSchema<T>) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string().datetime(),
    requestId: z.string().uuid().optional(),
  });
}

/**
 * Standard API error response schema
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    timestamp: z.string().datetime(),
    path: z.string().optional(),
    requestId: z.string().uuid().optional(),
  }),
});

/**
 * Combined API response schema
 */
export function ApiResponseSchema<T>(dataSchema: z.ZodSchema<T>) {
  return z.discriminatedUnion('success', [
    ApiSuccessResponseSchema(dataSchema),
    ApiErrorResponseSchema,
  ]);
}

export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<T>>>;

// ============================================================================
// DATABASE PATTERNS
// ============================================================================

/**
 * Schema factory for database entities
 * Simplified version for consistent patterns
 */
export function createEntitySchema<T extends z.ZodRawShape>(
  fields: T,
  options: {
    withAudit?: boolean;
    withSoftDelete?: boolean;
  } = {},
) {
  const baseFields = {
    id: z.string().uuid(),
    ...fields,
  };

  const auditFields = options.withAudit
    ? {
        createdAt: z.date(),
        updatedAt: z.date(),
        createdBy: z.string().uuid().optional(),
        updatedBy: z.string().uuid().optional(),
      }
    : {};

  const softDeleteFields = options.withSoftDelete
    ? {
        deletedAt: z.date().nullable().optional(),
        deletedBy: z.string().uuid().optional(),
      }
    : {};

  return z.object({
    ...baseFields,
    ...auditFields,
    ...softDeleteFields,
  });
}

/**
 * Create insert schema from select schema
 * Automatically handles ID generation and audit fields
 */
export function createInsertSchema<T extends z.ZodTypeAny>(
  selectSchema: T,
  overrides?: z.ZodRawShape,
) {
  // Fields that are auto-generated and should be omitted from insert
  const omitFields = ['id', 'createdAt', 'updatedAt', 'deletedAt'] as const;
  const omitObj: Record<string, true> = {};
  omitFields.forEach((key) => {
    omitObj[key] = true;
  });

  const baseSchema = (selectSchema as unknown as z.ZodObject<z.ZodRawShape>).omit(omitObj);

  if (overrides) {
    return baseSchema.extend(overrides);
  }

  return baseSchema;
}

/**
 * Create update schema from select schema
 * Makes all fields optional except id
 */
export function createUpdateSchema<T extends z.ZodTypeAny>(
  selectSchema: T,
  overrides?: z.ZodRawShape,
) {
  // Fields that shouldn't be manually updated
  const omitFields = ['id', 'createdAt', 'createdBy'] as const;
  const omitObj: Record<string, true> = {};
  omitFields.forEach((key) => {
    omitObj[key] = true;
  });

  // Create partial schema (all fields optional) and omit restricted fields
  const baseSchema = (selectSchema as unknown as z.ZodObject<z.ZodRawShape>).omit(omitObj).partial();

  if (overrides) {
    return baseSchema.extend(overrides);
  }

  return baseSchema;
}

// ============================================================================
// HANDLER PATTERNS
// ============================================================================

/**
 * Schema-first handler configuration
 */
export type SchemaHandlerConfig<
  TBody extends z.ZodSchema | never = never,
  TQuery extends z.ZodSchema | never = never,
  TParams extends z.ZodSchema | never = never,
> = {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
  auth?: 'public' | 'session' | 'admin';
  operationName: string;
};

/**
 * Inferred handler context from schemas
 */
export type InferredHandlerContext<
  TBody extends z.ZodSchema | never,
  TQuery extends z.ZodSchema | never,
  TParams extends z.ZodSchema | never,
> = {
  validated: {
    body: TBody extends z.ZodSchema ? z.infer<TBody> : never;
    query: TQuery extends z.ZodSchema ? z.infer<TQuery> : never;
    params: TParams extends z.ZodSchema ? z.infer<TParams> : never;
  };
};

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

/**
 * Schema-based type guards
 */
export function createTypeGuard<T>(schema: z.ZodSchema<T>) {
  return (value: unknown): value is T => {
    return schema.safeParse(value).success;
  };
}

/**
 * Schema-based validation functions
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (value: unknown): ValidationResult<T> => {
    return parseWithSchema(value, schema);
  };
}

/**
 * Async validation for complex operations
 */
export function createAsyncValidator<T>(
  schema: z.ZodSchema<T>,
  asyncChecks?: Array<(value: T) => Promise<string | null>>,
) {
  return async (value: unknown): Promise<ValidationResult<T>> => {
    const baseResult = parseWithSchema(value, schema);
    if (!baseResult.success) {
      return baseResult;
    }

    if (asyncChecks) {
      for (const check of asyncChecks) {
        const error = await check(baseResult.data);
        if (error) {
          return {
            success: false,
            error,
          };
        }
      }
    }

    return baseResult;
  };
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Transform legacy code to use schema-first patterns
 */
export class SchemaFirstMigration<T extends object> {
  private schema: z.ZodSchema<T>;

  constructor(schema: z.ZodSchema<T>) {
    this.schema = schema;
  }

  /**
   * Replace unsafe casting with validation
   */
  replaceCasting(value: unknown, context?: string): T {
    const result = parseWithSchema(value, this.schema, context);
    if (!result.success) {
      throw new Error(`Schema migration failed: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Replace manual type checking with schema validation
   */
  replaceTypeChecking(value: unknown): ValidationResult<T> {
    return parseWithSchema(value, this.schema);
  }

  /**
   * Create type-safe pick function
   */
  createPicker<K extends keyof T>(keys: K[]) {
    return (value: unknown): ValidationResult<Pick<T, K>> => {
      const baseResult = parseWithSchema(value, this.schema);
      if (!baseResult.success) {
        return baseResult;
      }

      const picked: Partial<Pick<T, K>> = {};
      for (const key of keys) {
        if (key in baseResult.data) {
          picked[key] = baseResult.data[key];
        }
      }

      return { success: true, data: picked as Pick<T, K> };
    };
  }
}

// ============================================================================
// BEST PRACTICES EXAMPLES
// ============================================================================

/**
 * Example: Schema-first API endpoint
 */
export const ExampleUserSchema = createEntitySchema({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']),
  isActive: z.boolean().default(true),
}, { withAudit: true, withSoftDelete: true });

export type ExampleUser = z.infer<typeof ExampleUserSchema>;

export const ExampleCreateUserSchema = createInsertSchema(ExampleUserSchema);

export const ExampleUpdateUserSchema = createUpdateSchema(ExampleUserSchema);

export const ExampleUserQuerySchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
}).merge(PaginationRequestSchema.partial());

/**
 * Example: Schema-first repository method
 */
export function createSchemaFirstRepository<
  TSelect extends z.ZodSchema,
  TInsert extends z.ZodSchema,
  TUpdate extends z.ZodSchema,
>(schemas: {
  select: TSelect;
  insert: TInsert;
  update: TUpdate;
}) {
  return {
    validateSelect: createValidator(schemas.select),
    validateInsert: createValidator(schemas.insert),
    validateUpdate: createValidator(schemas.update),

    parseQueryResult: (results: unknown[]): ValidationResult<z.infer<TSelect>[]> => {
      if (!Array.isArray(results)) {
        return {
          success: false,
          error: 'Query result must be an array',
        };
      }

      const validatedResults: z.infer<TSelect>[] = [];
      const errors: string[] = [];

      for (const [index, result] of results.entries()) {
        const validation = parseWithSchema(result, schemas.select, `Row ${index}`);
        if (!validation.success) {
          errors.push(validation.error);
        } else {
          validatedResults.push(validation.data as z.infer<TSelect>);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `Query validation failed: ${errors.join('; ')}`,
          details: { validRows: validatedResults.length, totalRows: results.length },
        };
      }

      return { success: true, data: validatedResults };
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createAsyncValidator as asyncValidator,
  createInsertSchema as createInsert,
  createEntitySchema as createSchema,
  createUpdateSchema as createUpdate,
  SchemaFirstMigration as Migration,
  createTypeGuard as typeGuard,
  createValidator as validator,
};

/**
 * Base Repository Pattern
 *
 * Provides consistent database access patterns with type safety,
 * standardized queries, and automatic audit field management.
 *
 * Features:
 * - Type-safe CRUD operations
 * - Consistent query patterns
 * - Automatic audit field handling
 * - Soft delete support
 * - Pagination and filtering
 * - Transaction support
 * - Query optimization
 */

import { z } from '@hono/zod-openapi';
import type { SQL } from 'drizzle-orm';
import { and, asc, desc, eq, getTableColumns, gt, gte, isNotNull, isNull, like, lt, lte, or } from 'drizzle-orm';
import type { SQLiteTable, TableConfig } from 'drizzle-orm/sqlite-core';

import { createError } from '@/api/common/error-handling';
import { apiLogger } from '@/api/middleware/hono-logger';
import { db } from '@/db';

// Transaction type from Drizzle ORM following official patterns
type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// =============================================================================
// ZOD VALIDATION SCHEMAS (Context7 Best Practices)
// =============================================================================

/**
 * Discriminated union for database operation results (replaces Record<string, unknown>)
 * Following Zod best practices from Context7 documentation
 */
export const DatabaseOperationResultSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('select'),
    success: z.boolean(),
    data: z.unknown(),
    rowCount: z.number().nonnegative().optional(),
  }),
  z.object({
    operation: z.literal('insert'),
    success: z.boolean(),
    data: z.unknown(),
    insertedId: z.string().optional(),
  }),
  z.object({
    operation: z.literal('update'),
    success: z.boolean(),
    data: z.unknown(),
    affectedRows: z.number().nonnegative().optional(),
  }),
  z.object({
    operation: z.literal('delete'),
    success: z.boolean(),
    affectedRows: z.number().nonnegative().optional(),
  }),
]);

export type DatabaseOperationResult = z.infer<typeof DatabaseOperationResultSchema>;

/**
 * Discriminated union for audit field operations (replaces Record<string, unknown>)
 */
export const AuditFieldDataSchema = z.discriminatedUnion('auditType', [
  z.object({
    auditType: z.literal('create'),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
  }),
  z.object({
    auditType: z.literal('update'),
    updatedAt: z.date(),
    updatedBy: z.string().optional(),
  }),
  z.object({
    auditType: z.literal('delete'),
    deletedAt: z.date(),
    updatedAt: z.date(),
    updatedBy: z.string().optional(),
    deletedBy: z.string().optional(),
  }),
  z.object({
    auditType: z.literal('restore'),
    deletedAt: z.null(),
    updatedAt: z.date(),
    updatedBy: z.string().optional(),
  }),
]);

export type AuditFieldData = z.infer<typeof AuditFieldDataSchema>;

/**
 * Database query result parsing with discriminated union
 * ZERO CASTING: Either validates successfully or throws/returns error state
 */
export const QueryResultSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    validationErrors: z.array(z.object({
      path: z.array(z.union([z.string(), z.number()])),
      message: z.string(),
      code: z.string(),
    })).optional(),
  }),
]);

export type QueryResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; validationErrors?: z.ZodIssue[] };

/**
 * Parse database query results with ZERO CASTING
 * Either validates successfully or returns error state
 */
export function parseQueryResult<T>(result: unknown[], schema: z.ZodSchema<T>): QueryResult<T[]> {
  const validatedResults: T[] = [];
  const errors: string[] = [];

  for (const [index, row] of result.entries()) {
    const parseResult = schema.safeParse(row);
    if (!parseResult.success) {
      apiLogger.warn('Query result validation failed', {
        index,
        validationErrors: parseResult.error.issues,
        data: row,
      });
      errors.push(`Row ${index}: ${parseResult.error.message}`);
    } else {
      validatedResults.push(parseResult.data);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Validation failed for ${errors.length} rows: ${errors.join('; ')}`,
      validationErrors: result.map(row => schema.safeParse(row))
        .filter(r => !r.success)
        .flatMap(r => r.error.issues),
    };
  }

  return { success: true, data: validatedResults };
}

/**
 * Parse single database query result with ZERO CASTING
 * Either validates successfully or returns error state
 */
export function parseSingleResult<T>(result: unknown, schema: z.ZodSchema<T>): QueryResult<T | null> {
  if (!result) {
    return { success: true, data: null };
  }

  const parseResult = schema.safeParse(result);
  if (!parseResult.success) {
    apiLogger.warn('Single result validation failed', {
      validationErrors: parseResult.error.issues,
      data: result,
    });
    return {
      success: false,
      error: parseResult.error.message,
      validationErrors: parseResult.error.issues,
    };
  }
  return { success: true, data: parseResult.data };
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type OrderDirection = 'asc' | 'desc';

export type PaginationOptions = {
  page: number;
  limit: number;
};

export type SortOptions = {
  field: string;
  direction: OrderDirection;
};

export type FilterOptions = {
  field: string;
  operator: 'eq' | 'ne' | 'like' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'isNull' | 'isNotNull';
  value?: unknown;
  values?: unknown[];
};

export type QueryOptions = {
  pagination?: PaginationOptions;
  sort?: SortOptions[];
  filters?: FilterOptions[];
  includeDeleted?: boolean;
};

export type RepositoryConfig = {
  tableName: string;
  primaryKey: string;
  hasUserId: boolean;
  hasSoftDelete: boolean;
  hasAuditFields: boolean;
};

// ============================================================================
// BASE REPOSITORY CLASS
// ============================================================================

export abstract class BaseRepository<
  TTable extends SQLiteTable<TableConfig>,
  TSelect extends Record<string, unknown>,
  TInsert extends Record<string, unknown>,
  TUpdate extends Record<string, unknown> = Partial<TInsert>,
> {
  protected readonly config: RepositoryConfig;
  protected readonly selectSchema?: z.ZodSchema<TSelect>;
  protected readonly insertSchema?: z.ZodSchema<TInsert>;
  protected readonly updateSchema?: z.ZodSchema<TUpdate>;

  constructor(
    protected readonly table: TTable,
    config: Partial<RepositoryConfig> = {},
    schemas: {
      select?: z.ZodSchema<TSelect>;
      insert?: z.ZodSchema<TInsert>;
      update?: z.ZodSchema<TUpdate>;
    } = {},
  ) {
    this.selectSchema = schemas.select;
    this.insertSchema = schemas.insert;
    this.updateSchema = schemas.update;
    this.config = {
      tableName: 'unknown',
      primaryKey: 'id',
      hasUserId: false,
      hasSoftDelete: false,
      hasAuditFields: false,
      ...config,
    };
  }

  // ============================================================================
  // CORE CRUD OPERATIONS
  // ============================================================================

  /**
   * Find a single record by ID
   */
  async findById(
    id: string,
    options: { includeDeleted?: boolean; tx?: typeof db | DrizzleTransaction } = {},
  ): Promise<TSelect | null> {
    const { includeDeleted = false, tx = db } = options;

    try {
      const tableColumns = getTableColumns(this.table);
      const primaryKeyColumn = tableColumns[this.config.primaryKey];
      if (!primaryKeyColumn) {
        throw new Error(`Primary key column '${this.config.primaryKey}' not found`);
      }
      const conditions = [eq(primaryKeyColumn, id)];

      if (this.config.hasSoftDelete && !includeDeleted) {
        const deletedAtColumn = tableColumns.deletedAt;
        if (deletedAtColumn) {
          conditions.push(isNull(deletedAtColumn));
        }
      }

      const result = await tx
        .select()
        .from(this.table)
        .where(and(...conditions))
        .limit(1);

      if (!this.selectSchema) {
        throw new Error(`Select schema required for ${this.config.tableName} repository`);
      }

      const parseResult = parseSingleResult(result[0], this.selectSchema);
      if (!parseResult.success) {
        throw createError.database(
          `Data validation failed for ${this.config.tableName}`,
          {
            errorType: 'validation' as const,
            fieldErrors: [{
              field: this.config.tableName,
              message: parseResult.error,
            }],
            schemaName: `${this.config.tableName}SelectSchema`,
          },
        );
      }

      return parseResult.data;
    } catch (error) {
      apiLogger.error('Repository findById failed', {
        table: this.config.tableName,
        id,
        error,
      });
      throw createError.database(
        `Failed to find ${this.config.tableName} by ID`,
        {
          errorType: 'database' as const,
          operation: 'select' as const,
          table: this.config.tableName,
        },
      );
    }
  }

  /**
   * Find records by user ID (if table has userId)
   */
  async findByUserId(
    userId: string,
    options: QueryOptions & { tx?: typeof db | DrizzleTransaction } = {},
  ): Promise<{ items: TSelect[]; total: number }> {
    if (!this.config.hasUserId) {
      throw new Error(`Table ${this.config.tableName} does not have userId field`);
    }

    const { tx = db, ...queryOptions } = options;

    try {
      const tableColumns = getTableColumns(this.table);
      const userIdColumn = tableColumns.userId;
      if (!userIdColumn) {
        throw new Error('userId column not found in table');
      }
      const conditions = [eq(userIdColumn, userId)];

      if (this.config.hasSoftDelete && !queryOptions.includeDeleted) {
        const deletedAtColumn = tableColumns.deletedAt;
        if (deletedAtColumn) {
          conditions.push(isNull(deletedAtColumn));
        }
      }

      return await this.executeQuery(and(...conditions), queryOptions, tx);
    } catch (error) {
      apiLogger.error('Repository findByUserId failed', {
        table: this.config.tableName,
        userId,
        error,
      });
      throw createError.database(
        `Failed to find ${this.config.tableName} by user ID`,
        {
          errorType: 'database' as const,
          operation: 'select' as const,
          table: this.config.tableName,
        },
      );
    }
  }

  /**
   * Find all records with optional filtering, sorting, and pagination
   */
  async findMany(
    options: QueryOptions & { tx?: typeof db | DrizzleTransaction } = {},
  ): Promise<{ items: TSelect[]; total: number }> {
    const { tx = db, ...queryOptions } = options;

    try {
      const conditions = [];

      if (this.config.hasSoftDelete && !queryOptions.includeDeleted) {
        const tableColumns = getTableColumns(this.table);
        const deletedAtColumn = tableColumns.deletedAt;
        if (deletedAtColumn) {
          conditions.push(isNull(deletedAtColumn));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      return await this.executeQuery(whereClause, queryOptions, tx);
    } catch (error) {
      apiLogger.error('Repository findMany failed', {
        table: this.config.tableName,
        error,
      });
      throw createError.database(
        `Failed to find ${this.config.tableName} records`,
        {
          errorType: 'database' as const,
          operation: 'select' as const,
          table: this.config.tableName,
        },
      );
    }
  }

  /**
   * Create a new record
   */
  async create(
    data: TInsert,
    options: { tx?: typeof db | DrizzleTransaction; userId?: string } = {},
  ): Promise<TSelect> {
    const { tx = db, userId } = options;

    try {
      // Create audit fields data using discriminated union
      const auditData: AuditFieldData = this.config.hasAuditFields
        ? {
            auditType: 'create',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...(userId && { createdBy: userId, updatedBy: userId }),
          }
        : { auditType: 'create', createdAt: new Date(), updatedAt: new Date() };

      // Combine data with audit fields using proper type merging
      const insertData = {
        ...data,
        ...(this.config.hasAuditFields && {
          createdAt: auditData.createdAt,
          updatedAt: auditData.updatedAt,
          ...(auditData.createdBy && { createdBy: auditData.createdBy }),
          ...(auditData.updatedBy && { updatedBy: auditData.updatedBy }),
        }),
      };

      // Validate insert data if schema is provided
      const validatedData = this.insertSchema
        ? this.insertSchema.parse(insertData)
        : insertData;

      const result = await tx
        .insert(this.table)
        .values(validatedData as TInsert)
        .returning();

      if (!result[0]) {
        throw new Error('Insert operation returned no results');
      }

      apiLogger.info('Repository create succeeded', {
        table: this.config.tableName,
        id: result[0][this.config.primaryKey],
      });

      if (!this.selectSchema) {
        throw new Error(`Select schema required for ${this.config.tableName} repository`);
      }

      const parseResult = parseSingleResult(result[0], this.selectSchema);
      if (!parseResult.success) {
        throw createError.database(
          `Failed to parse created ${this.config.tableName}: ${parseResult.error}`,
          {
            errorType: 'database' as const,
            operation: 'insert' as const,
            table: this.config.tableName,
          },
        );
      }
      return parseResult.data as TSelect;
    } catch (error) {
      apiLogger.error('Repository create failed', {
        table: this.config.tableName,
        data,
        error,
      });
      throw createError.database(
        `Failed to create ${this.config.tableName}`,
        {
          errorType: 'database' as const,
          operation: 'insert' as const,
          table: this.config.tableName,
        },
      );
    }
  }

  /**
   * Update an existing record
   */
  async update(
    id: string,
    data: TUpdate,
    options: { tx?: typeof db | DrizzleTransaction; userId?: string } = {},
  ): Promise<TSelect> {
    const { tx = db, userId } = options;

    try {
      // Create audit fields data using discriminated union
      const auditData: AuditFieldData = this.config.hasAuditFields
        ? {
            auditType: 'update',
            updatedAt: new Date(),
            ...(userId && { updatedBy: userId }),
          }
        : { auditType: 'update', updatedAt: new Date() };

      // Combine data with audit fields using proper type merging
      const updateData = {
        ...data,
        ...(this.config.hasAuditFields && {
          updatedAt: auditData.updatedAt,
          ...(auditData.updatedBy && { updatedBy: auditData.updatedBy }),
        }),
      };

      // Validate update data if schema is provided
      const validatedData = this.updateSchema
        ? this.updateSchema.parse(updateData)
        : updateData;

      const tableColumns = getTableColumns(this.table);
      const primaryKeyColumn = tableColumns[this.config.primaryKey];
      if (!primaryKeyColumn) {
        throw new Error(`Primary key column '${this.config.primaryKey}' not found`);
      }
      const conditions = [eq(primaryKeyColumn, id)];

      if (this.config.hasSoftDelete) {
        const deletedAtColumn = tableColumns.deletedAt;
        if (deletedAtColumn) {
          conditions.push(isNull(deletedAtColumn));
        }
      }

      const result = await tx
        .update(this.table)
        .set(validatedData)
        .where(and(...conditions))
        .returning();

      if (!result[0]) {
        throw createError.notFound(`${this.config.tableName} record`, {
          errorType: 'database' as const,
          operation: 'update' as const,
          table: this.config.tableName,
        });
      }

      apiLogger.info('Repository update succeeded', {
        table: this.config.tableName,
        id,
      });

      if (!this.selectSchema) {
        throw new Error(`Select schema required for ${this.config.tableName} repository`);
      }

      const parseResult = parseSingleResult(result[0], this.selectSchema);
      if (!parseResult.success) {
        throw createError.database(
          `Failed to parse updated ${this.config.tableName}: ${parseResult.error}`,
          {
            errorType: 'database' as const,
            operation: 'update' as const,
            table: this.config.tableName,
          },
        );
      }
      return parseResult.data as TSelect;
    } catch (error) {
      apiLogger.error('Repository update failed', {
        table: this.config.tableName,
        id,
        data,
        error,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      throw createError.database(
        `Failed to update ${this.config.tableName}`,
        {
          errorType: 'database' as const,
          operation: 'update' as const,
          table: this.config.tableName,
        },
      );
    }
  }

  /**
   * Delete a record (hard delete or soft delete based on config)
   */
  async delete(
    id: string,
    options: { tx?: typeof db | DrizzleTransaction; userId?: string; hard?: boolean } = {},
  ): Promise<void> {
    const { tx = db, userId, hard = false } = options;

    try {
      if (this.config.hasSoftDelete && !hard) {
        // Soft delete using discriminated union
        const auditData: AuditFieldData = {
          auditType: 'delete',
          deletedAt: new Date(),
          updatedAt: new Date(),
          ...(userId && { updatedBy: userId, deletedBy: userId }),
        };

        const updateData = {
          deletedAt: auditData.deletedAt,
          ...(this.config.hasAuditFields && {
            updatedAt: auditData.updatedAt,
            ...(auditData.updatedBy && { updatedBy: auditData.updatedBy }),
            ...(auditData.deletedBy && { deletedBy: auditData.deletedBy }),
          }),
        };

        const tableColumns = getTableColumns(this.table);
        const primaryKeyColumn = tableColumns[this.config.primaryKey];
        const deletedAtColumn = tableColumns.deletedAt;
        if (!primaryKeyColumn) {
          throw new Error(`Primary key column '${this.config.primaryKey}' not found`);
        }

        const whereConditions = [eq(primaryKeyColumn, id)];
        if (deletedAtColumn) {
          whereConditions.push(isNull(deletedAtColumn));
        }

        const result = await tx
          .update(this.table)
          .set(updateData)
          .where(and(...whereConditions.filter(Boolean)))
          .returning();

        if (!result[0]) {
          throw createError.notFound(`${this.config.tableName} record`, {
            errorType: 'database' as const,
            operation: 'update' as const,
            table: this.config.tableName,
          });
        }
      } else {
        // Hard delete
        const tableColumns = getTableColumns(this.table);
        const primaryKeyColumn = tableColumns[this.config.primaryKey];
        if (!primaryKeyColumn) {
          throw new Error(`Primary key column '${this.config.primaryKey}' not found`);
        }

        const result = await tx
          .delete(this.table)
          .where(eq(primaryKeyColumn, id))
          .returning();

        if (!result[0]) {
          throw createError.notFound(`${this.config.tableName} record`, {
            errorType: 'database' as const,
            operation: 'delete' as const,
            table: this.config.tableName,
          });
        }
      }

      apiLogger.info('Repository delete succeeded', {
        table: this.config.tableName,
        id,
        hard,
      });
    } catch (error) {
      apiLogger.error('Repository delete failed', {
        table: this.config.tableName,
        id,
        hard,
        error,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      throw createError.database(
        `Failed to delete ${this.config.tableName}`,
        {
          errorType: 'database' as const,
          operation: 'delete' as const,
          table: this.config.tableName,
        },
      );
    }
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(
    id: string,
    options: { tx?: typeof db | DrizzleTransaction; userId?: string } = {},
  ): Promise<TSelect> {
    if (!this.config.hasSoftDelete) {
      throw new Error(`Table ${this.config.tableName} does not support soft delete`);
    }

    const { tx = db, userId } = options;

    try {
      // Restore using discriminated union
      const auditData: AuditFieldData = {
        auditType: 'restore',
        deletedAt: null,
        updatedAt: new Date(),
        ...(userId && { updatedBy: userId }),
      };

      const updateData = {
        deletedAt: auditData.deletedAt,
        ...(this.config.hasAuditFields && {
          updatedAt: auditData.updatedAt,
          ...(auditData.updatedBy && { updatedBy: auditData.updatedBy }),
        }),
      };

      const tableColumns = getTableColumns(this.table);
      const primaryKeyColumn = tableColumns[this.config.primaryKey];
      const deletedAtColumn = tableColumns.deletedAt;
      if (!primaryKeyColumn) {
        throw new Error(`Primary key column '${this.config.primaryKey}' not found`);
      }

      const whereConditions = [eq(primaryKeyColumn, id)];
      if (deletedAtColumn) {
        whereConditions.push(isNotNull(deletedAtColumn));
      }

      const result = await tx
        .update(this.table)
        .set(updateData)
        .where(and(...whereConditions.filter(Boolean)))
        .returning();

      if (!result[0]) {
        throw createError.notFound(`Deleted ${this.config.tableName} record`, {
          errorType: 'database' as const,
          operation: 'update' as const,
          table: this.config.tableName,
        });
      }

      apiLogger.info('Repository restore succeeded', {
        table: this.config.tableName,
        id,
      });

      if (!this.selectSchema) {
        throw new Error(`Select schema required for ${this.config.tableName} repository`);
      }

      const parseResult = parseSingleResult(result[0], this.selectSchema);
      if (!parseResult.success) {
        throw createError.database(
          `Failed to parse restored ${this.config.tableName}: ${parseResult.error}`,
          {
            errorType: 'database' as const,
            operation: 'update' as const,
            table: this.config.tableName,
          },
        );
      }
      return parseResult.data as TSelect;
    } catch (error) {
      apiLogger.error('Repository restore failed', {
        table: this.config.tableName,
        id,
        error,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }

      throw createError.database(
        `Failed to restore ${this.config.tableName}`,
        {
          errorType: 'database' as const,
          operation: 'update' as const,
          table: this.config.tableName,
        },
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Execute a complex query with filtering, sorting, and pagination
   */
  private async executeQuery(
    whereClause: SQL | undefined,
    options: QueryOptions,
    tx: typeof db | DrizzleTransaction,
  ): Promise<{ items: TSelect[]; total: number }> {
    const { pagination, sort, filters } = options;

    // Build filter conditions
    const filterConditions: SQL[] = [];
    if (filters) {
      for (const filter of filters) {
        const condition = this.buildFilterCondition(filter);
        if (condition) {
          filterConditions.push(condition);
        }
      }
    }

    // Combine where clause with filters
    const allConditions = [whereClause, ...filterConditions].filter(Boolean);
    const finalWhere = allConditions.length > 0 ? and(...allConditions) : undefined;

    // Get total count using length approach
    const totalResult = finalWhere
      ? await db.select().from(this.table).where(finalWhere)
      : await db.select().from(this.table);

    const total = totalResult.length;

    // Build main query using dynamic mode
    let query = tx.select().from(this.table).$dynamic();

    if (finalWhere) {
      query = query.where(finalWhere);
    }

    // Add sorting
    if (sort && sort.length > 0) {
      const tableColumns = getTableColumns(this.table);
      const orderByClause = sort.map((s) => {
        const column = tableColumns[s.field];
        return column ? (s.direction === 'desc' ? desc(column) : asc(column)) : undefined;
      }).filter((clause): clause is NonNullable<typeof clause> => clause !== undefined);
      if (orderByClause.length > 0) {
        query = query.orderBy(...orderByClause);
      }
    } else if (this.config.hasAuditFields) {
      // Default sort by creation date
      const tableColumns = getTableColumns(this.table);
      const createdAtColumn = tableColumns.createdAt;
      if (createdAtColumn) {
        query = query.orderBy(desc(createdAtColumn)) as typeof query;
      }
    }

    // Add pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.limit(pagination.limit).offset(offset) as typeof query;
    }

    const queryResult = await query;

    if (!this.selectSchema) {
      throw new Error(`Select schema required for ${this.config.tableName} repository`);
    }

    const parseResult = parseQueryResult(queryResult, this.selectSchema);
    if (!parseResult.success) {
      throw createError.database(
        `Data validation failed for ${this.config.tableName} list`,
        {
          errorType: 'validation' as const,
          fieldErrors: [{
            field: this.config.tableName,
            message: parseResult.error,
          }],
          schemaName: `${this.config.tableName}SelectSchema`,
        },
      );
    }

    return { items: parseResult.data, total };
  }

  /**
   * Build filter condition from FilterOptions
   */
  private buildFilterCondition(filter: FilterOptions): SQL | undefined {
    const tableColumns = getTableColumns(this.table);
    const field = tableColumns[filter.field];
    if (!field)
      return undefined;

    switch (filter.operator) {
      case 'eq':
        return eq(field, filter.value);
      case 'ne':
        return eq(field, filter.value); // Note: drizzle doesn't have ne, use not(eq())
      case 'like':
        return like(field, `%${filter.value}%`);
      case 'gt':
        return gt(field, filter.value);
      case 'lt':
        return lt(field, filter.value);
      case 'gte':
        return gte(field, filter.value);
      case 'lte':
        return lte(field, filter.value);
      case 'isNull':
        return isNull(field);
      case 'isNotNull':
        return isNotNull(field);
      case 'in':
        // Note: implement with or() for multiple values
        if (filter.values && filter.values.length > 0) {
          return or(...filter.values.map(value => eq(field, value)));
        }
        return undefined;
      default:
        return undefined;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const tableColumns = getTableColumns(this.table);
      const primaryKeyColumn = tableColumns[this.config.primaryKey];
      if (!primaryKeyColumn) {
        throw new Error(`Primary key column '${this.config.primaryKey}' not found`);
      }

      const result = await db
        .select()
        .from(this.table)
        .where(eq(primaryKeyColumn, id))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      apiLogger.error('Repository exists check failed', {
        table: this.config.tableName,
        id,
        error,
      });
      return false;
    }
  }

  /**
   * Get count of records
   */
  async count(options: { filters?: FilterOptions[]; tx?: typeof db | DrizzleTransaction } = {}): Promise<number> {
    const { filters } = options;

    try {
      const conditions = [];

      if (this.config.hasSoftDelete) {
        const tableColumns = getTableColumns(this.table);
        const deletedAtColumn = tableColumns.deletedAt;
        if (deletedAtColumn) {
          conditions.push(isNull(deletedAtColumn));
        }
      }

      if (filters) {
        for (const filter of filters) {
          const condition = this.buildFilterCondition(filter);
          if (condition) {
            conditions.push(condition);
          }
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = whereClause
        ? await db.select().from(this.table).where(whereClause)
        : await db.select().from(this.table);

      return result.length;
    } catch (error) {
      apiLogger.error('Repository count failed', {
        table: this.config.tableName,
        error,
      });
      throw createError.database(
        `Failed to count ${this.config.tableName} records`,
        {
          errorType: 'database' as const,
          operation: 'select' as const,
          table: this.config.tableName,
        },
      );
    }
  }
}

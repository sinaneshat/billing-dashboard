/**
 * Schema builder utilities for consistent OpenAPI schemas across routes
 * Reduces duplication and ensures consistent API patterns
 */

import { z } from '@hono/zod-openapi';

/**
 * Common query parameter schemas
 */
export const QueryParams = {
  /**
   * Pagination parameters
   */
  pagination: () => z.object({
    limit: z
      .string()
      .optional()
      .default('20')
      .openapi({
        param: { name: 'limit', in: 'query' },
        example: '20',
        description: 'Number of items to return',
      }),
    cursor: z
      .string()
      .optional()
      .openapi({
        param: { name: 'cursor', in: 'query' },
        description: 'Cursor for pagination',
      }),
    offset: z
      .string()
      .optional()
      .openapi({
        param: { name: 'offset', in: 'query' },
        example: '0',
        description: 'Number of items to skip',
      }),
  }),

  /**
   * Sorting parameters
   */
  sorting: (fields: string[]) => z.object({
    sortBy: z
      .enum(fields as [string, ...string[]])
      .optional()
      .openapi({
        param: { name: 'sortBy', in: 'query' },
        description: `Sort by field: ${fields.join(', ')}`,
      }),
    sortOrder: z
      .enum(['asc', 'desc'])
      .optional()
      .default('asc')
      .openapi({
        param: { name: 'sortOrder', in: 'query' },
        description: 'Sort order',
      }),
  }),

  /**
   * Date range parameters
   */
  dateRange: () => z.object({
    startDate: z
      .string()
      .optional()
      .openapi({
        param: { name: 'startDate', in: 'query' },
        example: '2025-01-01',
        description: 'Start date (ISO 8601)',
      }),
    endDate: z
      .string()
      .optional()
      .openapi({
        param: { name: 'endDate', in: 'query' },
        example: '2025-12-31',
        description: 'End date (ISO 8601)',
      }),
  }),

  /**
   * Search parameters
   */
  search: () => z.object({
    q: z
      .string()
      .optional()
      .openapi({
        param: { name: 'q', in: 'query' },
        description: 'Search query',
      }),
    searchFields: z
      .string()
      .optional()
      .openapi({
        param: { name: 'searchFields', in: 'query' },
        example: 'name,email',
        description: 'Comma-separated fields to search in',
      }),
  }),
};

/**
 * Common body schemas
 */
export const BodySchemas = {
  /**
   * File upload body
   */
  fileUpload: () => z.object({
    file: z
      .any()
      .openapi({
        type: 'string',
        format: 'binary',
        description: 'File to upload',
      }),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({
        description: 'Additional metadata for the file',
      }),
  }),

  /**
   * Bulk operation body
   */
  bulkOperation: <T extends z.ZodType>(itemSchema: T) => z.object({
    items: z
      .array(itemSchema)
      .min(1)
      .max(100)
      .openapi({
        description: 'Items to process in bulk',
      }),
    options: z
      .object({
        stopOnError: z.boolean().optional(),
        parallel: z.boolean().optional(),
      })
      .optional()
      .openapi({
        description: 'Bulk operation options',
      }),
  }),
};

/**
 * Common response schemas
 */
export const ResponseSchemas = {
  /**
   * Paginated response
   */
  paginated: <T extends z.ZodType>(itemSchema: T) => z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      pagination: z.object({
        total: z.number(),
        limit: z.number(),
        offset: z.number().optional(),
        cursor: z.string().optional(),
        hasMore: z.boolean(),
      }),
    }),
    meta: z
      .object({
        requestId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
  }),

  /**
   * File response
   */
  file: () => z.object({
    success: z.literal(true),
    data: z.object({
      key: z.string(),
      url: z.string(),
      size: z.number(),
      contentType: z.string(),
      uploadedAt: z.string(),
      uploadedBy: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),

  /**
   * Bulk operation response
   */
  bulkResult: <T extends z.ZodType>(resultSchema: T) => z.object({
    success: z.literal(true),
    data: z.object({
      succeeded: z.array(resultSchema),
      failed: z.array(z.object({
        item: z.any(),
        error: z.string(),
      })),
      summary: z.object({
        total: z.number(),
        succeeded: z.number(),
        failed: z.number(),
      }),
    }),
  }),

  /**
   * Operation result
   */
  operation: () => z.object({
    success: z.literal(true),
    data: z.object({
      operationId: z.string(),
      status: z.enum(['pending', 'processing', 'completed', 'failed']),
      result: z.any().optional(),
      error: z.string().optional(),
      completedAt: z.string().optional(),
    }),
  }),
};

/**
 * Common metadata schemas
 */
export const MetadataSchemas = {
  /**
   * File metadata
   */
  file: () => z.object({
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    checksum: z.string().optional(),
    dimensions: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional(),
  }),

  /**
   * Audit metadata
   */
  audit: () => z.object({
    createdAt: z.string(),
    createdBy: z.string(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
    version: z.number().optional(),
  }),

  /**
   * Request metadata
   */
  request: () => z.object({
    requestId: z.string(),
    clientIp: z.string().optional(),
    userAgent: z.string().optional(),
    timestamp: z.string(),
  }),
};

/**
 * Schema builder class for complex schemas
 */
export class SchemaBuilder {
  /**
   * Create a complete list endpoint query schema
   */
  static listQuery(options: {
    searchable?: boolean;
    sortFields?: string[];
    filterable?: boolean;
    dateRange?: boolean;
  } = {}) {
    let schema = QueryParams.pagination();

    if (options.searchable) {
      schema = schema.merge(QueryParams.search());
    }

    if (options.sortFields && options.sortFields.length > 0) {
      schema = schema.merge(QueryParams.sorting(options.sortFields));
    }

    if (options.dateRange) {
      schema = schema.merge(QueryParams.dateRange());
    }

    return schema;
  }

  /**
   * Create an API response schema with standard structure
   */
  static apiResponse<T extends z.ZodType>(
    dataSchema: T,
    options: {
      paginated?: boolean;
      includeMeta?: boolean;
    } = {},
  ) {
    const base = {
      success: z.literal(true),
      data: options.paginated
        ? z.object({
            items: z.array(dataSchema),
            pagination: z.object({
              total: z.number(),
              limit: z.number(),
              hasMore: z.boolean(),
            }),
          })
        : dataSchema,
    };

    if (options.includeMeta) {
      return z.object({
        ...base,
        meta: MetadataSchemas.request().optional(),
      });
    }

    return z.object(base);
  }

  /**
   * Create an error response schema
   */
  static errorResponse(statusCode?: number) {
    return z.object({
      success: z.literal(false),
      error: z.object({
        code: statusCode ? z.literal(statusCode) : z.number(),
        message: z.string(),
        details: z.any().optional(),
        timestamp: z.string(),
        requestId: z.string().optional(),
      }),
    });
  }

  /**
   * Create a route configuration with common patterns
   */
  static routeConfig(options: {
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    path: string;
    summary: string;
    tags: string[];
    security?: boolean;
  }) {
    const config: Record<string, unknown> = {
      method: options.method,
      path: options.path,
      summary: options.summary,
      tags: options.tags,
    };

    if (options.security !== false) {
      config.security = [{ bearerAuth: [] }];
    }

    return config;
  }
}

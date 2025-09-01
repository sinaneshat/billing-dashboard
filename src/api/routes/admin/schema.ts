/**
 * Admin API Schemas - Platform Owner Access
 * Response and request schemas for admin endpoints
 */

import { z } from '@hono/zod-openapi';

import { ApiResponseSchema, CommonFieldSchemas } from '@/api/common/schemas';

// =============================================================================
// Admin Stats Schemas
// =============================================================================

export const AdminStatsDataSchema = z.object({
  users: z.object({
    total: z.number().openapi({ example: 1250 }),
    verified: z.number().openapi({ example: 1180 }),
  }),
  subscriptions: z.object({
    total: z.number().openapi({ example: 450 }),
    active: z.number().openapi({ example: 380 }),
    canceled: z.number().openapi({ example: 70 }),
  }),
  payments: z.object({
    total: z.number().openapi({ example: 1800 }),
    successful: z.number().openapi({ example: 1650 }),
    totalAmount: z.number().openapi({ example: 125000000 }),
    currency: CommonFieldSchemas.currency(),
  }),
});

export const AdminStatsResponseSchema = ApiResponseSchema(AdminStatsDataSchema);

// =============================================================================
// Admin Users Schemas
// =============================================================================

export const AdminUserSchema = z.object({
  id: CommonFieldSchemas.uuid(),
  name: z.string().openapi({ example: 'John Doe' }),
  email: CommonFieldSchemas.email(),
  emailVerified: z.boolean().openapi({ example: true }),
  createdAt: CommonFieldSchemas.timestamp(),
});

export const AdminUsersDataSchema = z.object({
  data: z.array(AdminUserSchema),
  pagination: z.object({
    page: z.number().openapi({ example: 1 }),
    limit: z.number().openapi({ example: 20 }),
    total: z.number().openapi({ example: 1250 }),
    pages: z.number().openapi({ example: 63 }),
  }),
});

export const AdminUsersResponseSchema = ApiResponseSchema(AdminUsersDataSchema);

export const AdminUsersQuerySchema = z.object({
  limit: CommonFieldSchemas.limit(),
  page: CommonFieldSchemas.page(),
  search: CommonFieldSchemas.search().optional(),
});

// =============================================================================
// Admin Webhook Test Schemas
// =============================================================================

export const AdminWebhookTestRequestSchema = z.object({
  event_type: z.string().default('test.event').openapi({
    example: 'test.admin',
    description: 'Event type to send in the test webhook',
  }),
  test_data: z.record(z.string(), z.unknown()).optional().openapi({
    example: { source: 'admin_panel', timestamp: '2025-09-01T10:00:00Z' },
    description: 'Optional test data to include in webhook payload',
  }),
});

export const AdminWebhookTestDataSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({
    example: 'Test webhook sent successfully to https://webhook.site/abc123',
  }),
  webhook_url: z.string().optional().openapi({
    example: 'https://webhook.site/abc123',
  }),
});

export const AdminWebhookTestResponseSchema = ApiResponseSchema(AdminWebhookTestDataSchema);

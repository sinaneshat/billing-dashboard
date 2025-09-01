/**
 * Admin API Routes - External Platform Access
 * Simple admin endpoints using master key authentication
 */

import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { CommonErrorResponses } from '@/api/common';

import {
  AdminStatsResponseSchema,
  AdminUsersQuerySchema,
  AdminUsersResponseSchema,
  AdminWebhookTestRequestSchema,
  AdminWebhookTestResponseSchema,
} from './schema';

// =============================================================================
// Admin Routes for Platform Owner Access (Stripe-like)
// =============================================================================

// GET /admin/stats - Platform statistics
export const adminStatsRoute = createRoute({
  method: 'get',
  path: '/admin/stats',
  tags: ['admin'],
  summary: 'Get platform statistics',
  description: 'Get comprehensive platform statistics (admin only)',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Platform statistics',
      content: {
        'application/json': { schema: AdminStatsResponseSchema },
      },
    },
    ...CommonErrorResponses.auth,
  },
});

// GET /admin/users - List all users
export const adminUsersRoute = createRoute({
  method: 'get',
  path: '/admin/users',
  tags: ['admin'],
  summary: 'List all users',
  description: 'Get paginated list of all users (admin only)',
  request: {
    query: AdminUsersQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'List of users',
      content: {
        'application/json': {
          schema: AdminUsersResponseSchema,
        },
      },
    },
    ...CommonErrorResponses.read,
  },
});

// POST /admin/webhooks/test - Test webhook delivery
export const adminTestWebhookRoute = createRoute({
  method: 'post',
  path: '/admin/webhooks/test',
  tags: ['admin'],
  summary: 'Test webhook delivery',
  description: 'Send a test webhook to verify external webhook configuration',
  request: {
    body: {
      content: {
        'application/json': {
          schema: AdminWebhookTestRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Test webhook sent',
      content: {
        'application/json': {
          schema: AdminWebhookTestResponseSchema,
        },
      },
    },
    ...CommonErrorResponses.auth,
  },
});

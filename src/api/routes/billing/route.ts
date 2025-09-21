import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { z } from 'zod';

import { createApiResponseSchema } from '@/api/core/schemas';

// Process recurring payments endpoint
export const processRecurringPaymentsRoute = createRoute({
  method: 'post',
  path: '/billing/process-recurring',
  tags: ['billing'],
  summary: 'Process recurring payments',
  description: 'Process due recurring payments for active subscriptions with direct debit contracts',
  security: [{ ApiKeyAuth: [] }], // Requires API key for cron jobs
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Recurring payments processed successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(
            z.object({
              processedCount: z.number(),
              successfulPayments: z.number(),
              failedPayments: z.number(),
              skippedSubscriptions: z.number(),
              details: z.array(z.object({
                subscriptionId: z.string(),
                userId: z.string(),
                status: z.enum(['success', 'failed', 'skipped']),
                amount: z.number().optional(),
                reason: z.string().optional(),
              })),
            }),
          ),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Unauthorized' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

// Get billing metrics endpoint
export const getBillingMetricsRoute = createRoute({
  method: 'get',
  path: '/billing/metrics',
  tags: ['billing'],
  summary: 'Get billing metrics',
  description: 'Get billing and subscription metrics for monitoring',
  security: [{ ApiKeyAuth: [] }], // Requires API key for monitoring
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Billing metrics retrieved successfully',
      content: {
        'application/json': {
          schema: createApiResponseSchema(
            z.object({
              subscriptions: z.object({
                total: z.number(),
                active: z.number(),
                pending: z.number(),
                canceled: z.number(),
                dueTodayCount: z.number(),
              }),
              payments: z.object({
                totalRevenue: z.number(),
                thisMonth: z.number(),
                lastMonth: z.number(),
                averageOrderValue: z.number(),
              }),
              directDebits: z.object({
                activeContracts: z.number(),
                pendingContracts: z.number(),
                expiredContracts: z.number(),
              }),
              webhooks: z.object({
                totalSent: z.number(),
                successfulDeliveries: z.number(),
                failedDeliveries: z.number(),
                lastWeekActivity: z.number(),
              }),
            }),
          ),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Unauthorized' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

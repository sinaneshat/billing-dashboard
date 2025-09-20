import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import {
  GetWebhookEventsResponseSchema,
  TestWebhookRequestSchema,
  TestWebhookResponseSchema,
  WebhookEventsQuerySchema,
  WebhookReceiveResponseSchema,
  ZarinPalWebhookRequestSchema,
} from './schema';

export const zarinPalWebhookRoute = createRoute({
  method: 'post',
  path: '/webhooks/zarinpal',
  tags: ['webhooks'],
  summary: 'Receive ZarinPal webhook',
  description: 'Receive and process ZarinPal payment events',
  request: {
    body: {
      content: {
        'application/json': { schema: ZarinPalWebhookRequestSchema },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Webhook processed successfully',
      content: {
        'application/json': { schema: WebhookReceiveResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const getWebhookEventsRoute = createRoute({
  method: 'get',
  path: '/webhooks/events',
  tags: ['webhooks'],
  summary: 'Get webhook events',
  description: 'Get webhook events for debugging and monitoring',
  request: {
    query: WebhookEventsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Webhook events retrieved successfully',
      content: {
        'application/json': { schema: GetWebhookEventsResponseSchema },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: { description: 'Bad Request' },
    [HttpStatusCodes.NOT_FOUND]: { description: 'Not Found' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

export const testWebhookRoute = createRoute({
  method: 'post',
  path: '/webhooks/test',
  tags: ['webhooks'],
  summary: 'Test webhook endpoint',
  description: 'Test webhook delivery to external URL',
  request: {
    body: {
      content: {
        'application/json': { schema: TestWebhookRequestSchema },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Webhook test completed',
      content: {
        'application/json': { schema: TestWebhookResponseSchema },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: { description: 'Unauthorized' },
    [HttpStatusCodes.FORBIDDEN]: { description: 'Forbidden' },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: { description: 'Internal Server Error' },
  },
});

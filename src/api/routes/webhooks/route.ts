import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import {
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

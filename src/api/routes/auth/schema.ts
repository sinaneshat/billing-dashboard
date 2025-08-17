import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';

const SecureMePayloadSchema = z.object({
  userId: z.string().openapi({ example: 'user_123' }),
  email: z.string().email().nullable().openapi({ example: 'user@example.com' }),
  activeOrganizationId: z.string().nullable().openapi({ example: 'org_456' }),
});

export const SecureMeResponseSchema = ApiResponseSchema(SecureMePayloadSchema).openapi('SecureMeResponse');

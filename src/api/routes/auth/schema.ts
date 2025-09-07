import { z } from '@hono/zod-openapi';

import { CoreSchemas } from '@/api/core/schemas';

// ✅ Refactored: Direct data schema, response wrapper handled by Responses.ok()
export const SecureMePayloadSchema = z.object({
  userId: CoreSchemas.id().openapi({
    example: 'user_123',
    description: 'User identifier',
  }),
  email: CoreSchemas.email().nullable().openapi({
    example: 'user@example.com',
    description: 'User email address (null if not available)',
  }),
}).openapi('SecureMePayload');

// Export for handler type inference
export type SecureMePayload = z.infer<typeof SecureMePayloadSchema>;

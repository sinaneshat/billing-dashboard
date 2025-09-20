import { z } from '@hono/zod-openapi';

import { CoreSchemas } from '@/api/core/schemas';

// Better Auth user schema following the official user structure
export const SecureMePayloadSchema = z.object({
  userId: CoreSchemas.id().openapi({
    example: 'cm4abc123def456ghi',
    description: 'Better Auth user identifier',
  }),
  email: CoreSchemas.email().openapi({
    example: 'user@example.com',
    description: 'User email address',
  }),
  name: z.string().openapi({
    example: 'John Doe',
    description: 'User display name',
  }),
  emailVerified: z.boolean().openapi({
    example: true,
    description: 'Whether the user email has been verified',
  }),
  image: z.string().nullable().openapi({
    example: 'https://example.com/avatar.jpg',
    description: 'User profile image URL',
  }),
  createdAt: z.string().datetime().openapi({
    example: '2024-01-01T00:00:00.000Z',
    description: 'User account creation timestamp',
  }),
  updatedAt: z.string().datetime().openapi({
    example: '2024-01-01T00:00:00.000Z',
    description: 'User account last update timestamp',
  }),
}).openapi('SecureMePayload');

// Export for handler type inference
export type SecureMePayload = z.infer<typeof SecureMePayloadSchema>;

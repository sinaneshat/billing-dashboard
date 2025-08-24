import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';

// Constants for image validation
export const IMAGE_TYPES = {
  AVATAR: 'avatar',
  LOGO: 'logo',
  BANNER: 'banner',
} as const;

export const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_COMPANY_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Query schemas
export const GetImagesQuerySchema = z.object({
  type: z.enum(['avatar', 'logo', 'banner', 'all']).optional().openapi({
    param: { name: 'type', in: 'query' },
    example: 'avatar',
  }),
  organizationId: z.string().optional().openapi({
    param: { name: 'organizationId', in: 'query' },
    example: 'org_123',
  }),
  userId: z.string().optional().openapi({
    param: { name: 'userId', in: 'query' },
    example: 'user_123',
  }),
  limit: z.coerce.number().int().min(1).max(100).optional().openapi({
    param: { name: 'limit', in: 'query' },
    example: 20,
  }),
});

// Params schemas
export const ImageKeyParamsSchema = z.object({
  key: z.string().min(1).optional().openapi({
    param: { name: 'key', in: 'path' },
    example: 'avatars/user_123.jpg',
  }),
  type: z.enum(['logo', 'banner']).optional().openapi({
    param: { name: 'type', in: 'path' },
    example: 'logo',
  }),
});

// Image metadata schema
const ImageMetadataSchema = z.object({
  key: z.string().openapi({ example: 'avatars/user_123.jpg' }),
  url: z.string().url().openapi({ example: 'https://cdn.example.com/avatars/user_123.jpg' }),
  size: z.number().openapi({ example: 123456 }),
  contentType: z.string().openapi({ example: 'image/jpeg' }),
  width: z.number().optional().openapi({ example: 200 }),
  height: z.number().optional().openapi({ example: 200 }),
  uploadedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  uploadedBy: z.string().openapi({ example: 'user_123' }),
  type: z.enum(['avatar', 'logo', 'banner']).openapi({ example: 'avatar' }),
  entityId: z.string().openapi({ example: 'user_123' }),
  entityType: z.enum(['user', 'organization']).openapi({ example: 'user' }),
});

// Response payload schemas
const UploadUserAvatarResponsePayload = z
  .object({
    ...ImageMetadataSchema.shape,
    previousAvatarDeleted: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UploadUserAvatarPayload');

export const UploadUserAvatarResponseSchema = ApiResponseSchema(
  UploadUserAvatarResponsePayload,
).openapi('UploadUserAvatarResponse');

const UploadCompanyImageResponsePayload = z
  .object({
    ...ImageMetadataSchema.shape,
    organizationId: z.string().openapi({ example: 'org_123' }),
    previousImageDeleted: z.boolean().optional().openapi({ example: false }),
  })
  .openapi('UploadCompanyImagePayload');

export const UploadCompanyImageResponseSchema = ApiResponseSchema(
  UploadCompanyImageResponsePayload,
).openapi('UploadCompanyImageResponse');

const GetImagesResponsePayload = z
  .object({
    images: z.array(ImageMetadataSchema),
    total: z.number().openapi({ example: 10 }),
  })
  .openapi('GetImagesPayload');

export const GetImagesResponseSchema = ApiResponseSchema(GetImagesResponsePayload).openapi(
  'GetImagesResponse',
);

const GetImageMetadataResponsePayload = ImageMetadataSchema.openapi('GetImageMetadataPayload');

export const GetImageMetadataResponseSchema = ApiResponseSchema(
  GetImageMetadataResponsePayload,
).openapi('GetImageMetadataResponse');

const DeleteImageResponsePayload = z
  .object({
    key: z.string().openapi({ example: 'avatars/user_123.jpg' }),
    deleted: z.boolean().openapi({ example: true }),
    deletedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  })
  .openapi('DeleteImagePayload');

export const DeleteImageResponseSchema = ApiResponseSchema(DeleteImageResponsePayload).openapi(
  'DeleteImageResponse',
);

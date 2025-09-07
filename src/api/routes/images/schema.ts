import { z } from '@hono/zod-openapi';

import { CoreSchemas, createApiResponseSchema } from '@/api/core/schemas';

// Image type constants
export const IMAGE_TYPES = {
  AVATAR: 'avatar',
  LOGO: 'logo',
  BANNER: 'banner',
} as const;

// Path parameter schemas - following standard naming convention
export const ImageParamsSchema = z.object({
  key: z.string().min(1).openapi({
    param: { name: 'key', in: 'path' },
    example: 'user_avatar_abc123.jpg',
    description: 'Image key identifier',
  }),
});

export const ImageTypeParamsSchema = z.object({
  type: z.enum(['logo', 'banner']).openapi({
    param: { name: 'type', in: 'path' },
    example: 'logo',
    description: 'Image type for company uploads',
  }),
});

// Schema for get images query parameters
export const GetImagesQuerySchema = z.object({
  type: z.enum(['avatar', 'logo', 'banner', 'all']).optional().openapi({ example: 'avatar' }),
  userId: z.string().optional().openapi({ example: 'user_123' }),
  page: CoreSchemas.page(),
  limit: CoreSchemas.limit(),
});

// Data schema for upload responses (to be wrapped in ApiResponse)
const UploadUserAvatarDataSchema = z.object({
  key: z.string().openapi({ example: 'user_avatar_abc123.jpg' }),
  url: z.string().url().openapi({ example: 'https://images.example.com/user_avatar_abc123.jpg' }),
  size: z.number().openapi({ example: 1024000 }),
  contentType: z.string().openapi({ example: 'image/jpeg' }),
  uploadedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  uploadedBy: z.string().openapi({ example: 'user_123' }),
  type: z.literal('avatar').openapi({ example: 'avatar' }),
  entityId: z.string().openapi({ example: 'user_123' }),
  entityType: z.literal('user').openapi({ example: 'user' }),
  previousAvatarDeleted: z.boolean().openapi({ example: false }),
});

// Response schemas for uploads (wrapped in ApiResponse)
export const UploadUserAvatarResponseSchema = createApiResponseSchema(UploadUserAvatarDataSchema);

const UploadCompanyImageDataSchema = z.object({
  key: z.string().openapi({ example: 'company_logo_abc123.jpg' }),
  url: z.string().url().openapi({ example: 'https://images.example.com/company_logo_abc123.jpg' }),
  size: z.number().openapi({ example: 2048000 }),
  contentType: z.string().openapi({ example: 'image/jpeg' }),
  uploadedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  uploadedBy: z.string().openapi({ example: 'user_123' }),
  type: z.enum(['logo', 'banner']).openapi({ example: 'logo' }),
  entityId: z.string().openapi({ example: 'user_123' }),
  entityType: z.literal('user').openapi({ example: 'user' }),
  previousImageDeleted: z.boolean().openapi({ example: false }),
});

export const UploadCompanyImageResponseSchema = createApiResponseSchema(UploadCompanyImageDataSchema);

// Data schema for get images response
const GetImagesDataSchema = z.object({
  images: z.array(z.object({
    key: z.string().openapi({ example: 'user_avatar_abc123.jpg' }),
    url: z.string().url().openapi({ example: 'https://images.example.com/user_avatar_abc123.jpg' }),
    size: z.number().openapi({ example: 1024000 }),
    contentType: z.string().openapi({ example: 'image/jpeg' }),
    uploadedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
    uploadedBy: z.string().openapi({ example: 'user_123' }),
    type: z.enum(['avatar', 'logo', 'banner']).openapi({ example: 'avatar' }),
    entityId: z.string().openapi({ example: 'user_123' }),
    entityType: z.literal('user').openapi({ example: 'user' }),
  })).openapi({ example: [] }),
  total: z.number().openapi({ example: 5 }),
});

export const GetImagesResponseSchema = createApiResponseSchema(GetImagesDataSchema);

const GetImageMetadataDataSchema = z.object({
  key: z.string().openapi({ example: 'user_avatar_abc123.jpg' }),
  url: z.string().url().openapi({ example: 'https://images.example.com/user_avatar_abc123.jpg' }),
  size: z.number().openapi({ example: 1024000 }),
  contentType: z.string().openapi({ example: 'image/jpeg' }),
  uploadedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  uploadedBy: z.string().openapi({ example: 'user_123' }),
  type: z.string().openapi({ example: 'avatar' }),
  entityId: z.string().openapi({ example: 'user_123' }),
  entityType: z.literal('user').openapi({ example: 'user' }),
});

export const GetImageMetadataResponseSchema = createApiResponseSchema(GetImageMetadataDataSchema);

const DeleteImageDataSchema = z.object({
  key: z.string().openapi({ example: 'user_avatar_abc123.jpg' }),
  deleted: z.boolean().openapi({ example: true }),
  deletedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
});

export const DeleteImageResponseSchema = createApiResponseSchema(DeleteImageDataSchema);

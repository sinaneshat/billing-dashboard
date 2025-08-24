import { createRoute } from '@hono/zod-openapi';

import {
  DeleteImageResponseSchema,
  GetImageMetadataResponseSchema,
  GetImagesQuerySchema,
  GetImagesResponseSchema,
  ImageKeyParamsSchema,
  UploadCompanyImageResponseSchema,
  UploadUserAvatarResponseSchema,
} from './schema';

export const uploadUserAvatarRoute = createRoute({
  method: 'post',
  path: '/images/avatar',
  tags: ['images'],
  responses: {
    200: {
      description: 'Upload user avatar image',
      content: { 'application/json': { schema: UploadUserAvatarResponseSchema } },
    },
    400: {
      description: 'Invalid image format or size',
    },
    413: {
      description: 'Image too large',
    },
  },
});

export const uploadCompanyImageRoute = createRoute({
  method: 'post',
  path: '/images/company/:type',
  tags: ['images'],
  request: {
    params: ImageKeyParamsSchema,
  },
  responses: {
    200: {
      description: 'Upload company image (logo or banner)',
      content: { 'application/json': { schema: UploadCompanyImageResponseSchema } },
    },
    400: {
      description: 'Invalid image format, size, or type',
    },
    403: {
      description: 'Not authorized to upload company images',
    },
    413: {
      description: 'Image too large',
    },
  },
});

export const getImagesRoute = createRoute({
  method: 'get',
  path: '/images',
  tags: ['images'],
  request: {
    query: GetImagesQuerySchema,
  },
  responses: {
    200: {
      description: 'List user and organization images',
      content: { 'application/json': { schema: GetImagesResponseSchema } },
    },
  },
});

export const getImageMetadataRoute = createRoute({
  method: 'get',
  path: '/images/:key',
  tags: ['images'],
  request: {
    params: ImageKeyParamsSchema,
  },
  responses: {
    200: {
      description: 'Get image metadata',
      content: { 'application/json': { schema: GetImageMetadataResponseSchema } },
    },
    404: {
      description: 'Image not found',
    },
  },
});

export const deleteImageRoute = createRoute({
  method: 'delete',
  path: '/images/:key',
  tags: ['images'],
  request: {
    params: ImageKeyParamsSchema,
  },
  responses: {
    200: {
      description: 'Delete image',
      content: { 'application/json': { schema: DeleteImageResponseSchema } },
    },
    403: {
      description: 'Not authorized to delete this image',
    },
    404: {
      description: 'Image not found',
    },
  },
});

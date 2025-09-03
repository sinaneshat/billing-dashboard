import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';

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
    [HttpStatusCodes.OK]: {
      description: 'Upload user avatar image',
      content: { 'application/json': { schema: UploadUserAvatarResponseSchema } },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Invalid image format or size',
    },
    [HttpStatusCodes.REQUEST_TOO_LONG]: {
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
    [HttpStatusCodes.OK]: {
      description: 'Upload company image (logo or banner)',
      content: { 'application/json': { schema: UploadCompanyImageResponseSchema } },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Invalid image format, size, or type',
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Not authorized to upload company images',
    },
    [HttpStatusCodes.REQUEST_TOO_LONG]: {
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
    [HttpStatusCodes.OK]: {
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
    [HttpStatusCodes.OK]: {
      description: 'Get image metadata',
      content: { 'application/json': { schema: GetImageMetadataResponseSchema } },
    },
    [HttpStatusCodes.NOT_FOUND]: {
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
    [HttpStatusCodes.OK]: {
      description: 'Delete image',
      content: { 'application/json': { schema: DeleteImageResponseSchema } },
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Not authorized to delete this image',
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Image not found',
    },
  },
});

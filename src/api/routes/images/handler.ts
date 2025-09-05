import type { R2ListOptions } from '@cloudflare/workers-types';
import type { RouteHandler } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ImageType } from '@/api/common/file-validation';
import { FileValidator } from '@/api/common/file-validation';
import { extractFile, extractOptionalString } from '@/api/common/form-utils';
import { getStringFromObject } from '@/api/common/type-utils';
import { createHandler, Responses } from '@/api/core';
import type { ApiEnv } from '@/api/types';

import type {
  deleteImageRoute,
  getImageMetadataRoute,
  getImagesRoute,
  uploadCompanyImageRoute,
  uploadUserAvatarRoute,
} from './route';
import { IMAGE_TYPES } from './schema';

export const uploadUserAvatarHandler: RouteHandler<typeof uploadUserAvatarRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'uploadUserAvatar',
  },
  async (c) => {
    const currentUser = c.get('user')!;
    const bucket = c.env.UPLOADS_R2_BUCKET;

    // Parse multipart form data safely
    const formData = await c.req.formData();
    const file = extractFile(formData, 'file');

    // Validate image
    const validation = await FileValidator.validateWithPreset(file, 'userAvatar');
    if (!validation.isValid) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: validation.error,
      });
    }

    // Generate key for the new avatar
    const extension = FileValidator.getExtensionFromMimeType(file.type);
    const imageKey = FileValidator.generateImageKey('userAvatar', currentUser.id, extension);

    // Check if user has an existing avatar and delete it
    let previousAvatarDeleted = false;
    if (currentUser.image) {
      try {
      // Extract key from URL if it's a full URL
        const existingKey = currentUser.image.includes('/')
          ? currentUser.image.split('/').slice(-3).join('/')
          : currentUser.image;

        // Delete existing avatar from R2
        await bucket.delete(existingKey);
        previousAvatarDeleted = true;
      } catch {
      // Ignore deletion errors
      }
    }

    // Upload new avatar to R2
    const customMetadata: Record<string, string> = {
      userId: currentUser.id,
      type: IMAGE_TYPES.AVATAR,
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    };

    const uploadResult = await bucket.put(imageKey, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata,
    });

    // Update user profile with new avatar URL using Better Auth's updateUser
    const imageUrl = `${c.req.url.split('/api')[0]}/api/v1/storage/${imageKey}`;

    // Import auth instance to use server-side Better Auth API
    const { auth } = await import('@/lib/auth');

    // Use Better Auth's server API to update user image
    await auth.api.updateUser({
      body: {
        image: imageUrl,
      },
      headers: c.req.raw.headers, // Pass through the request headers for session
    });

    return Responses.ok(
      c,
      {
        key: imageKey,
        url: imageUrl,
        size: file.size,
        contentType: file.type,
        uploadedAt: uploadResult?.uploaded?.toISOString() || new Date().toISOString(),
        uploadedBy: currentUser.id,
        type: IMAGE_TYPES.AVATAR,
        entityId: currentUser.id,
        entityType: 'user' as const,
        previousAvatarDeleted,
      },
    );
  },
);

export const uploadCompanyImageHandler: RouteHandler<typeof uploadCompanyImageRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'uploadCompanyImage',
  },
  async (c) => {
    const routeType = getStringFromObject(c.req.param(), 'type', 'banner');
    const currentUser = c.get('user')!;
    const bucket = c.env.UPLOADS_R2_BUCKET;

    // Parse multipart form data safely
    const formData = await c.req.formData();
    const file = extractFile(formData, 'file');
    const type = extractOptionalString(formData, 'type') || routeType;

    // Validate image
    const imageType: ImageType = type === 'logo' ? 'companyLogo' : 'companyBanner';
    const validation = await FileValidator.validateWithPreset(file, imageType);
    if (!validation.isValid) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: validation.error,
      });
    }

    // Generate key for the new image
    const extension = FileValidator.getExtensionFromMimeType(file.type);
    const imageKey = FileValidator.generateImageKey(imageType, currentUser.id, extension);

    // Check if organization has an existing image of this type and delete it
    let previousImageDeleted = false;

    if (currentUser?.image && type === 'logo') {
      try {
        const existingKey = currentUser.image.includes('/')
          ? currentUser.image.split('/').slice(-3).join('/')
          : currentUser.image;
        await bucket.delete(existingKey);
        previousImageDeleted = true;
      } catch {
      // Ignore deletion errors
      }
    }

    // Upload new image to R2
    const imageTypeConstant = type === 'logo' ? IMAGE_TYPES.LOGO : IMAGE_TYPES.BANNER;
    const customMetadata: Record<string, string> = {
      userId: currentUser.id,
      type: imageTypeConstant,
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    };

    const uploadResult = await bucket.put(imageKey, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata,
    });

    const imageUrl = `${c.req.url.split('/api')[0]}/api/v1/storage/${imageKey}`;

    return Responses.ok(
      c,
      {
        key: imageKey,
        url: imageUrl,
        size: file.size,
        contentType: file.type,
        uploadedAt: uploadResult?.uploaded?.toISOString() || new Date().toISOString(),
        uploadedBy: currentUser.id,
        type: imageTypeConstant,
        entityId: currentUser.id,
        entityType: 'user' as const,
        previousImageDeleted,
      },
    );
  },
);

export const getImagesHandler: RouteHandler<typeof getImagesRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getImages',
  },
  async (c) => {
    const { type, userId, limit } = c.req.query();
    const currentUser = c.get('user')!;
    const bucket = c.env.UPLOADS_R2_BUCKET;

    // Build prefix for listing
    let prefix = 'images/';
    if (type && type !== 'all') {
      prefix += `${type}/`;
    }

    const listOptions: R2ListOptions = {
      prefix,
      limit: Number(limit) || 20,
    };

    const listed = await bucket.list(listOptions);

    // Filter results based on permissions
    const images = await Promise.all(
      listed.objects.map(async (obj) => {
        const metadata = obj.customMetadata || {};

        // Check permissions
        const isOwnAvatar = metadata.type === IMAGE_TYPES.AVATAR && metadata.userId === currentUser?.id;

        if (!isOwnAvatar) {
          return null;
        }

        // Apply additional filters
        if (userId && metadata.userId !== userId) {
          return null;
        }

        const imageUrl = `${c.req.url.split('/api')[0]}/api/v1/storage/${obj.key}`;

        return {
          key: obj.key,
          url: imageUrl,
          size: obj.size,
          contentType: obj.httpMetadata?.contentType || 'image/jpeg',
          uploadedAt: obj.uploaded.toISOString(),
          uploadedBy: metadata.userId || 'unknown',
          type: (metadata.type || IMAGE_TYPES.AVATAR) as 'avatar' | 'logo' | 'banner',
          entityId: metadata.userId || 'unknown',
          entityType: 'user' as const,
        };
      }),
    );

    const filteredImages = images.filter((img): img is NonNullable<typeof img> => img !== null);

    return Responses.ok(
      c,
      {
        images: filteredImages,
        total: filteredImages.length,
      },
    );
  },
);

export const getImageMetadataHandler: RouteHandler<typeof getImageMetadataRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getImageMetadata',
  },
  async (c) => {
    const key = c.req.param('key');
    const currentUser = c.get('user')!;
    const bucket = c.env.UPLOADS_R2_BUCKET;

    const object = await bucket.head(key!);
    if (!object) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Image not found',
      });
    }

    const metadata = object.customMetadata || {};

    // Check permissions
    const isOwnAvatar = metadata.type === IMAGE_TYPES.AVATAR && metadata.userId === currentUser?.id;

    if (!isOwnAvatar) {
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message: 'Not authorized to access this image',
      });
    }

    const imageUrl = `${c.req.url.split('/api')[0]}/api/v1/storage/${key}`;

    return Responses.ok(
      c,
      {
        key,
        url: imageUrl,
        size: object.size,
        contentType: object.httpMetadata?.contentType || 'image/jpeg',
        uploadedAt: object.uploaded.toISOString(),
        uploadedBy: metadata.userId || 'unknown',
        type: metadata.type || IMAGE_TYPES.AVATAR,
        entityId: metadata.userId || 'unknown',
        entityType: 'user' as const,
      },
    );
  },
);

export const deleteImageHandler: RouteHandler<typeof deleteImageRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'deleteImage',
  },
  async (c) => {
    const key = c.req.param('key');
    const currentUser = c.get('user')!;
    const bucket = c.env.UPLOADS_R2_BUCKET;

    // Get object metadata to check permissions
    const object = await bucket.head(key!);
    if (!object) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Image not found',
      });
    }

    const metadata = object.customMetadata || {};

    // Check permissions
    const isOwnAvatar = metadata.type === IMAGE_TYPES.AVATAR && metadata.userId === currentUser?.id;

    if (!isOwnAvatar) {
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
        message: 'Not authorized to delete this image',
      });
    }

    // Delete from R2
    await bucket.delete(key!);

    // Update database using Better Auth's APIs
    const { auth } = await import('@/lib/auth');

    if (isOwnAvatar) {
    // Clear user avatar via Better Auth
      await auth.api.updateUser({
        body: {
          image: undefined,
        },
        headers: c.req.raw.headers,
      });
    }

    return Responses.ok(
      c,
      {
        key,
        deleted: true,
        deletedAt: new Date().toISOString(),
      },
    );
  },
);

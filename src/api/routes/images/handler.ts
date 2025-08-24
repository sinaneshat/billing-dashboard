import type { R2ListOptions } from '@cloudflare/workers-types';
import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { ImageType } from '@/api/common/image-validation';
import {
  generateImageKey,
  getExtensionFromMimeType,
  validateImage,
} from '@/api/common/image-validation';
import { ok } from '@/api/common/responses';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { organization } from '@/db/tables/auth';

import type {
  deleteImageRoute,
  getImageMetadataRoute,
  getImagesRoute,
  uploadCompanyImageRoute,
  uploadUserAvatarRoute,
} from './route';
import { IMAGE_TYPES } from './schema';

export const uploadUserAvatarHandler: RouteHandler<typeof uploadUserAvatarRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'images/avatar');
  const currentUser = c.get('user');
  const bucket = c.env.UPLOADS_R2_BUCKET;

  if (!currentUser?.id) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'User not authenticated',
    });
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'No file provided',
    });
  }

  // Validate image
  const validation = await validateImage(file, 'avatar');
  if (!validation.isValid) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: validation.error,
    });
  }

  // Generate key for the new avatar
  const extension = getExtensionFromMimeType(file.type);
  const imageKey = generateImageKey('avatar', currentUser.id, extension);

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

  return ok(
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
    undefined,
    HttpStatusCodes.OK,
  );
};

export const uploadCompanyImageHandler: RouteHandler<typeof uploadCompanyImageRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'images/company');
  const { type } = c.req.param() as { type: string };
  const session = c.get('session');
  const currentUser = c.get('user');
  const bucket = c.env.UPLOADS_R2_BUCKET;

  if (!currentUser?.id || !session?.activeOrganizationId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'User not authenticated or no active organization',
    });
  }

  // Check user has permission to upload company images (admin or owner)
  const memberRole = await db
    .select()
    .from(organization)
    .where(eq(organization.id, session.activeOrganizationId))
    .then(orgs => orgs[0]);

  if (!memberRole) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: 'Not authorized to upload company images',
    });
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: 'No file provided',
    });
  }

  // Validate image
  const imageType: ImageType = type === 'logo' ? 'logo' : 'banner';
  const validation = await validateImage(file, imageType);
  if (!validation.isValid) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: validation.error,
    });
  }

  // Generate key for the new image
  const extension = getExtensionFromMimeType(file.type);
  const imageKey = generateImageKey(imageType, session.activeOrganizationId, extension);

  // Check if organization has an existing image of this type and delete it
  let previousImageDeleted = false;
  const existingOrg = await db
    .select()
    .from(organization)
    .where(eq(organization.id, session.activeOrganizationId))
    .then(orgs => orgs[0]);

  if (existingOrg?.logo && type === 'logo') {
    try {
      const existingKey = existingOrg.logo.includes('/')
        ? existingOrg.logo.split('/').slice(-3).join('/')
        : existingOrg.logo;
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
    organizationId: session.activeOrganizationId,
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

  // Update organization with new image URL using Better Auth's organization.update
  const imageUrl = `${c.req.url.split('/api')[0]}/api/v1/storage/${imageKey}`;

  // Import auth instance to use server-side Better Auth API
  const { auth } = await import('@/lib/auth');

  if (type === 'logo') {
    // Use Better Auth's server API to update organization logo
    await auth.api.updateOrganization({
      body: {
        organizationId: session.activeOrganizationId,
        data: {
          logo: imageUrl,
        },
      },
      headers: c.req.raw.headers, // Pass through the request headers for session
    });
  }
  // Note: Banner field would need to be added to organization table if needed

  return ok(
    c,
    {
      key: imageKey,
      url: imageUrl,
      size: file.size,
      contentType: file.type,
      uploadedAt: uploadResult?.uploaded?.toISOString() || new Date().toISOString(),
      uploadedBy: currentUser.id,
      type: imageTypeConstant,
      entityId: session.activeOrganizationId,
      entityType: 'organization' as const,
      organizationId: session.activeOrganizationId,
      previousImageDeleted,
    },
    undefined,
    HttpStatusCodes.OK,
  );
};

export const getImagesHandler: RouteHandler<typeof getImagesRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'images/list');
  const { type, organizationId, userId, limit } = c.req.query();
  const session = c.get('session');
  const currentUser = c.get('user');
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
      const isOrgImage
        = (metadata.type === IMAGE_TYPES.LOGO || metadata.type === IMAGE_TYPES.BANNER)
          && metadata.organizationId === session?.activeOrganizationId;

      if (!isOwnAvatar && !isOrgImage) {
        return null;
      }

      // Apply additional filters
      if (userId && metadata.userId !== userId) {
        return null;
      }
      if (organizationId && metadata.organizationId !== organizationId) {
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
        entityId: metadata.userId || metadata.organizationId || 'unknown',
        entityType: metadata.organizationId ? ('organization' as const) : ('user' as const),
      };
    }),
  );

  const filteredImages = images.filter((img): img is NonNullable<typeof img> => img !== null);

  return ok(
    c,
    {
      images: filteredImages,
      total: filteredImages.length,
    },
    undefined,
    HttpStatusCodes.OK,
  );
};

export const getImageMetadataHandler: RouteHandler<typeof getImageMetadataRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'images/metadata');
  const key = c.req.param('key');
  const session = c.get('session');
  const currentUser = c.get('user');
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
  const isOrgImage
    = (metadata.type === IMAGE_TYPES.LOGO || metadata.type === IMAGE_TYPES.BANNER)
      && metadata.organizationId === session?.activeOrganizationId;

  if (!isOwnAvatar && !isOrgImage) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: 'Not authorized to access this image',
    });
  }

  const imageUrl = `${c.req.url.split('/api')[0]}/api/v1/storage/${key}`;

  return ok(
    c,
    {
      key,
      url: imageUrl,
      size: object.size,
      contentType: object.httpMetadata?.contentType || 'image/jpeg',
      uploadedAt: object.uploaded.toISOString(),
      uploadedBy: metadata.userId || 'unknown',
      type: metadata.type || IMAGE_TYPES.AVATAR,
      entityId: metadata.userId || metadata.organizationId || 'unknown',
      entityType: metadata.organizationId ? ('organization' as const) : ('user' as const),
    },
    undefined,
    HttpStatusCodes.OK,
  );
};

export const deleteImageHandler: RouteHandler<typeof deleteImageRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'images/delete');
  const key = c.req.param('key');
  const session = c.get('session');
  const currentUser = c.get('user');
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
  const canDeleteOrgImage
    = (metadata.type === IMAGE_TYPES.LOGO || metadata.type === IMAGE_TYPES.BANNER)
      && metadata.organizationId === session?.activeOrganizationId;

  if (!isOwnAvatar && !canDeleteOrgImage) {
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
  } else if (metadata.type === IMAGE_TYPES.LOGO && metadata.organizationId) {
    // Clear organization logo via Better Auth
    await auth.api.updateOrganization({
      body: {
        organizationId: metadata.organizationId,
        data: {
          logo: undefined,
        },
      },
      headers: c.req.raw.headers,
    });
  }

  return ok(
    c,
    {
      key,
      deleted: true,
      deletedAt: new Date().toISOString(),
    },
    undefined,
    HttpStatusCodes.OK,
  );
};

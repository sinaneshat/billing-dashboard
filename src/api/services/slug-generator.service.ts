/**
 * Slug Generator Service
 *
 * Generates SEO-friendly, unique slugs for chat threads
 * Format: {title-kebab-case}-{short-id}
 * Example: "product-strategy-brainstorm-abc123"
 */

import { eq } from 'drizzle-orm';

import { getDbAsync } from '@/db';
import * as tables from '@/db/schema';

/**
 * Convert string to kebab-case
 * Removes special characters, converts to lowercase, replaces spaces with hyphens
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .slice(0, 50)
    // Remove trailing hyphen if slicing created one
    .replace(/-$/g, '');
}

/**
 * Generate a short random ID (6 characters, alphanumeric)
 * Uses base36 (0-9, a-z) for URL-friendliness
 */
function generateShortId(): string {
  // Generate 6 random characters
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Generate unique slug from title
 * Format: {title-kebab}-{short-id}
 * Ensures uniqueness by checking database
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = toKebabCase(title);

  // Try up to 5 times to generate a unique slug
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = generateShortId();
    const slug = `${baseSlug}-${shortId}`;

    // Check if slug already exists
    const db = await getDbAsync();
    const existing = await db.query.chatThread.findFirst({
      where: eq(tables.chatThread.slug, slug),
    });

    if (!existing) {
      return slug;
    }

    // If collision, try again with new short ID
  }

  // If still can't generate unique slug after 5 attempts, add timestamp
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Generate slug from a temporary title (for threads without AI-generated titles yet)
 * Uses "New Chat" as base with timestamp
 */
export async function generateTemporarySlug(): Promise<string> {
  const timestamp = Date.now().toString(36);
  const shortId = generateShortId();
  return `new-chat-${timestamp}-${shortId}`;
}

/**
 * Update slug when title changes
 * Useful when AI generates a better title after thread creation
 */
export async function updateThreadSlug(threadId: string, newTitle: string): Promise<string> {
  const db = await getDbAsync();
  const newSlug = await generateUniqueSlug(newTitle);

  await db
    .update(tables.chatThread)
    .set({
      slug: newSlug,
      updatedAt: new Date(),
    })
    .where(eq(tables.chatThread.id, threadId));

  return newSlug;
}

/**
 * Validate slug format
 * Returns true if slug follows the correct format
 */
export function isValidSlug(slug: string): boolean {
  // Slug should be kebab-case with optional short ID suffix
  // Min length: 3 chars, Max length: 60 chars
  // Format: lowercase letters, numbers, hyphens only
  const slugRegex = /^[a-z0-9-]{3,60}$/;
  return slugRegex.test(slug);
}

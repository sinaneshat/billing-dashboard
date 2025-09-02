/**
 * Image queries removed - use session.user.image instead
 *
 * User images are now provided through Better Auth sessions.
 * Use useSession() from '@/lib/auth/client' and access session.user.image
 *
 * This eliminates unnecessary API calls for user avatars since
 * the image URL is already available in the session data.
 */

// This file is kept for reference and will be removed in a future cleanup.
// All image query functionality has been replaced with session-based image access.

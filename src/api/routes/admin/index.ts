/**
 * Admin API Module - Platform Owner Access
 * Minimal admin endpoints that leverage existing infrastructure
 */

export {
  adminStatsHandler,
  adminTestWebhookHandler,
  adminUsersHandler,
} from './handler';
export {
  adminStatsRoute,
  adminTestWebhookRoute,
  adminUsersRoute,
} from './route';

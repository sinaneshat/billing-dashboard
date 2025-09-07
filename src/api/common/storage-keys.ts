/**
 * Storage purpose type definition
 * MIGRATION COMPLETE: Unused StorageKeyManager and utilities removed.
 * Only the StoragePurpose type is used by the codebase.
 */

import { z } from 'zod';

export const storagePurposeSchema = z.enum([
  'user_avatar',
  'company_logo',
  'company_banner',
  'document',
  'receipt',
  'invoice',
  'temp',
]);

export type StoragePurpose = z.infer<typeof storagePurposeSchema>;

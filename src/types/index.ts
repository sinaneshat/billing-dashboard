/**
 * Type exports for the application
 *
 * Following Better Auth best practices:
 * - Import Better Auth types directly from @/lib/auth/types
 * - No intermediate re-exports that create unnecessary layers
 */

// Better Auth types - import directly from @/lib/auth/types
// export type { Session, User } from '@/lib/auth/types';

// General utility types - explicit named exports for clarity
export type {
  AIHistoryStatus,
  ApiDefaultError,
  CustomFetchConfig,
  FormOption,
  FormOptions,
  GeneralFormProps,
  InitialDefaultValues,
  NavItem,
  ServiceConfig,
  TextInputProps,
  WithOptionsProps,
} from './general';

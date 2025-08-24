import type { Session, User } from '@/lib/auth/types';

declare module 'hono' {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface ContextVariableMap {
    session: Session | null;
    user: User | null;
    apiKey: string | undefined;
    requestId: string | undefined;
    // Storage-related context variables
    storageKey: string;
    storagePurpose: import('@/api/middleware/storage-security').StoragePurpose | null;
    storageMethod: string;
    fileContentType: string;
    fileSize: number;
  }
}

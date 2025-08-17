import type { auth } from '@/lib/auth';

declare module 'hono' {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface ContextVariableMap {
    session: typeof auth.$Infer.Session.session | null;
    user: typeof auth.$Infer.Session.user | null;
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

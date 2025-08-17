import type { StoragePurpose } from '@/api/middleware/storage-security';
import type { auth } from '@/lib/auth';

export type ApiEnv = {
  Bindings: CloudflareEnv;
  Variables: {
    session?: typeof auth.$Infer.Session.session | null;
    user?: typeof auth.$Infer.Session.user | null;
    apiKey?: string | undefined;
    requestId?: string;
    // Storage-related context variables
    storageKey?: string;
    storagePurpose?: StoragePurpose | null;
    storageMethod?: string;
    fileContentType?: string;
    fileSize?: number;
  };
};

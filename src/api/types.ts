import type { StoragePurpose } from '@/api/common/storage-keys';
import type { Session, User } from '@/lib/auth/types';

// CloudflareEnv is globally available from cloudflare-env.d.ts

export type ApiEnv = {
  Bindings: CloudflareEnv;
  Variables: {
    session?: Session | null;
    user?: User | null;
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

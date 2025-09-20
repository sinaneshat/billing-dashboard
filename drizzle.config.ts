import { defineConfig } from 'drizzle-kit';

// Always use Wrangler D1 - both locally and in production
// Local development uses Wrangler's local D1, production uses remote D1

const isProduction = process.env.NEXT_PUBLIC_WEBAPP_ENV === 'prod';
const isPreview = process.env.NEXT_PUBLIC_WEBAPP_ENV === 'preview';

// Remote database configuration for preview/production
function getRemoteConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.D1_TOKEN;
  const databaseId = isPreview
    ? process.env.PREVIEW_DATABASE_ID
    : process.env.PROD_DATABASE_ID;

  if (!accountId || !token || !databaseId) {
    throw new Error(`Missing required environment variables for ${isPreview ? 'preview' : 'production'} D1 database`);
  }

  return {
    accountId,
    token,
    databaseId,
  };
}

// Export unified Wrangler D1 configuration
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',

  // Use Wrangler D1 for all environments
  ...(isProduction || isPreview
    ? {
        // Remote D1 for preview/production
        driver: 'd1-http',
        dbCredentials: getRemoteConfig(),
      }
    : {
        // Local SQLite for schema generation
        driver: 'libsql',
        dbCredentials: {
          url: 'file:./local.db',
        },
      }),
});

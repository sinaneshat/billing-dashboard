# D1 Database & Better Auth Troubleshooting Guide

## Fixed Issues (September 2025)

### Transaction Errors in Production and Preview

**Symptoms:**
- `Failed query: begin params:` errors in Cloudflare logs
- `unable_to_create_user` errors during authentication
- Google OAuth callback failures

**Root Cause:**
D1 databases do not support traditional SQL transactions (`BEGIN`/`COMMIT`). Better Auth was attempting to use transactions without the proper D1 configuration.

**Solution Applied:**
1. **Fixed Better Auth Configuration** (`src/lib/auth/server/index.ts:46`):
   ```typescript
   const database = drizzleAdapter(drizzleD1(d1Database, { schema: authSchema }), {
     provider: 'sqlite',
     usePlural: true, // ✅ CRITICAL for D1 compatibility
     schema: authSchema,
   });
   ```

2. **Complete Database Reset Procedure:**
   - Dropped all application tables
   - Cleared migration history
   - Reapplied fresh schema
   - Updated migration tracking

## Database Reset Commands

### Production Reset (Use with extreme caution)
```bash
# 1. Drop all tables
npx wrangler d1 execute DB --env production --remote --command="
DROP TABLE IF EXISTS billing_event;
DROP TABLE IF EXISTS payment;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS subscription;
DROP TABLE IF EXISTS webhook_event;
DROP TABLE IF EXISTS external_webhook_endpoint;
DROP TABLE IF EXISTS webhook_delivery_attempt;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS payment_method;"

# 2. Clear migration history
npx wrangler d1 execute DB --env production --remote --command="DELETE FROM d1_migrations;"

# 3. Apply fresh schema
npx wrangler d1 execute DB --env production --remote --file=./src/db/migrations/0000_unique_pride.sql

# 4. Update migration tracking
npx wrangler d1 execute DB --env production --remote --command="INSERT INTO d1_migrations (id, name, applied_at) VALUES (1, '0000_unique_pride.sql', datetime('now'));"
```

### Preview Reset
```bash
# Same commands as production, but use --env preview
npx wrangler d1 execute DB --env preview --remote --command="..."
```

## Prevention Guidelines

### Critical Configuration Requirements
1. **Always use `usePlural: true`** in Better Auth drizzle adapter for D1
2. **Never use `BEGIN`/`COMMIT`** transactions in D1 queries
3. **Use Drizzle `batch()` operations** for multi-query consistency
4. **Test auth endpoints** after any database changes

### Verification Commands
```bash
# Test auth endpoints
curl -s "https://billing.roundtable.now/api/auth/test-session"
curl -s "https://billing-preview.roundtable.now/api/auth/test-session"

# Check database status
npx wrangler d1 info DB --env production
npx wrangler d1 info DB --env preview
```

### Warning Signs
- `Failed query: begin params:` in logs
- `unable_to_create_user` errors
- 500 errors on auth endpoints
- OAuth callback failures

## Related Files
- `src/lib/auth/server/index.ts` - Better Auth configuration
- `src/db/migrations/0000_unique_pride.sql` - Database schema
- `wrangler.jsonc` - D1 binding configuration
- `CLAUDE.md` - Complete troubleshooting procedures
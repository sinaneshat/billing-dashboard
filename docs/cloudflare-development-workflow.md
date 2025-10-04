# Cloudflare Development & Deployment Workflow

**This guide follows Cloudflare's official recommended practices for developing and deploying Next.js applications with `@opennextjs/cloudflare`.**

---

## 📖 Official Cloudflare Recommendation

> The primary purpose of @opennextjs/cloudflare is to take a Next.js application, built with standard Next.js tooling, and convert it into a format compatible with Cloudflare Workers.
>
> **We recommend that developers continue using the tools they are already comfortable with for local development and then use @opennextjs/cloudflare when they are ready to deploy their applications to the Cloudflare platform.**

---

## 🔄 Recommended Workflow

### **1. Local Development: Use `next dev` (Primary)**

**Command:**
```bash
pnpm dev
```

**What it does:**
- Runs Next.js development server with Turbopack
- Enables Hot Module Replacement (HMR) for instant feedback
- Provides access to Cloudflare bindings via `getCloudflareContext()`
- **Fast iteration** - Best for active development

**Expected Behavior:**
- ✅ Your app works normally
- ✅ All routes and API endpoints function
- ✅ Access to R2, D1, KV bindings (simulated locally)
- ⚠️ **Durable Object warnings are NORMAL** - see [Local Development Warnings](/docs/local-development-warnings.md)

**Why use this:**
- **Fast feedback loop** - Changes reflect immediately
- **Hot Module Replacement** - No need to restart the server
- **Familiar tooling** - Standard Next.js development experience
- **Quality of life features** - Error overlays, better debugging

---

### **2. Test in Workers Runtime: Use `opennextjs-cloudflare preview`**

**Command:**
```bash
pnpm preview
```

**What it does:**
1. Builds your Next.js app: `opennextjs-cloudflare build`
2. Populates the local cache with build-time data
3. Starts a local server running your Worker in the Cloudflare Workers runtime

**Use this when:**
- ✅ You need to test ISR (Incremental Static Regeneration)
- ✅ You want to verify Durable Objects work correctly
- ✅ You need to test Cloudflare-specific features
- ✅ You want to ensure the Worker builds without errors

**Testing with Workers Runtime:**
- ✅ Durable Objects (DOQueueHandler, BucketCachePurge) work
- ✅ ISR revalidation queue functions
- ✅ Tag cache for on-demand revalidation
- ✅ Regional cache behavior
- ✅ R2, D1, KV bindings (local simulation)

---

### **3. Deploy to Cloudflare**

#### **Deploy Immediately (Preview Environment)**
```bash
pnpm deploy:preview
```

**What it does:**
1. Builds the Worker: `opennextjs-cloudflare build`
2. Initializes remote cache
3. Deploys to preview environment
4. **Starts serving immediately**

#### **Deploy Immediately (Production Environment)**
```bash
pnpm deploy:production
```

#### **Upload New Version (Gradual Deployments)**
```bash
pnpm upload -- --env=preview
pnpm upload -- --env=production
```

**What it does:**
1. Builds the Worker
2. Uploads new version to Cloudflare
3. **Does NOT start serving** - Allows gradual rollout

---

## 🏗️ Build System Overview

### Local Build
```bash
# Build the Worker locally
pnpm build:worker

# Preview locally
pnpm preview:worker

# Deploy
pnpm deploy:worker
```

**Note:** When building locally, `.dev.vars` and `.env` files may override your configuration.

**Recommendation:** Use Cloudflare Workers Builds (CI/CD) for reproducible deployments.

### Workers Builds (Recommended for Production)

**Setup:**
1. Connect your GitHub repository to Cloudflare
2. Configure Build Settings:
   - **Build command**: `npx opennextjs-cloudflare build`
   - **Deploy command**: `npx opennextjs-cloudflare deploy` (or `upload` for gradual deployments)

**Advantages:**
- ✅ Reproducible builds
- ✅ No local environment overrides
- ✅ Automatic deployments on push
- ✅ Environment variable management via Cloudflare dashboard

---

## 🛠️ Available Commands

### Development
```bash
pnpm dev              # Next.js dev server (recommended for development)
pnpm preview          # Build + test in Workers runtime locally
```

### Building
```bash
pnpm build            # Next.js build (creates .next directory)
pnpm build:worker     # OpenNext Cloudflare build (creates .open-next directory)
```

### Deployment
```bash
pnpm deploy:preview       # Build + deploy to preview environment
pnpm deploy:production    # Build + deploy to production environment
pnpm upload              # Build + upload new version (gradual deployment)
```

### Passing Arguments to Wrangler
```bash
# Pass arguments to wrangler after --
pnpm deploy -- --env=prod --dry-run
pnpm upload -- --env=preview --compatibility-date=2025-03-25
```

---

## ⚙️ Configuration Files

### `next.config.ts` - Required Setup

Your `next.config.ts` **MUST** call `initOpenNextCloudflareForDev()` to access Cloudflare bindings during `next dev`:

```typescript
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

// Initialize for local development
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  output: 'standalone', // Required for OpenNext
  // ... your config
};

export default nextConfig;
```

### `wrangler.jsonc` - Cloudflare Configuration

Defines your Worker configuration, bindings, and environments.

### `open-next.config.ts` - ISR Configuration

Configures ISR features:
- R2 Incremental Cache with Regional Cache
- Durable Object Queue
- D1 Tag Cache
- Cache interception
- Automatic cache purge

---

## 🔍 Accessing Cloudflare Resources

### In Server Components or API Routes

```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(request: Request) {
  const { env, cf, ctx } = getCloudflareContext();

  // Access bindings
  const value = await env.KV.get('key');
  const data = await env.DB.prepare('SELECT * FROM users').all();
  const file = await env.UPLOADS_R2_BUCKET.get('image.png');

  return Response.json({ success: true });
}
```

**Available in:**
- ✅ `next dev` - Simulated local bindings
- ✅ `opennextjs-cloudflare preview` - Local bindings
- ✅ Production - Real Cloudflare bindings

---

## 📊 Development vs Production

| Feature | `next dev` | `opennextjs-cloudflare preview` | Production |
|---------|------------|--------------------------------|------------|
| Hot Module Replacement | ✅ Yes | ❌ No | ❌ No |
| Fast feedback loop | ✅ Instant | ⚠️ Rebuild required | ❌ Deploy required |
| Cloudflare bindings | ✅ Simulated | ✅ Local | ✅ Real |
| Durable Objects | ⚠️ Warnings (expected) | ✅ Simulated | ✅ Real |
| ISR functionality | ⚠️ Limited | ✅ Full | ✅ Full |
| Regional cache | ❌ No | ✅ Simulated | ✅ Real |
| Best for | Active development | Pre-deployment testing | Production traffic |

---

## 🎯 Best Practices

### During Active Development
1. **Use `pnpm dev`** for the fastest iteration cycle
2. **Ignore Durable Object warnings** - they're expected and harmless
3. **Access bindings via `getCloudflareContext()`** - works in all environments

### Before Deploying
1. **Run `pnpm preview`** to test in Workers runtime
2. **Verify ISR features work** (revalidation, cache, etc.)
3. **Check for build errors**
4. **Test with production-like data**

### For Deployment
1. **Use Workers Builds (CI/CD)** for reproducible deployments
2. **Test on preview environment first**: `pnpm deploy:preview`
3. **Use gradual deployments**: `pnpm upload` for zero-downtime releases
4. **Monitor Cloudflare dashboard** for errors and performance

---

## 🐛 Troubleshooting

### "Durable Object class not exported" warnings

**This is expected during `next dev`.** See [Local Development Warnings](/docs/local-development-warnings.md).

### ISR not working in development

**Expected:** ISR uses Next.js default behavior in `next dev`.
**Solution:** Use `pnpm preview` to test ISR with Cloudflare's queue system.

### Build fails with missing bindings

**Check:**
1. `wrangler.jsonc` has all required bindings
2. `.dev.vars` has necessary environment variables
3. Run `pnpm cf-typegen` to regenerate types

### Environment variables not working

**Local:** Check `.dev.vars`
**Preview/Prod:** Set secrets via `npx wrangler secret put <NAME> --env=<ENV>`

---

## 📚 Additional Resources

- [Cloudflare OpenNext Documentation](https://opennextjs.js.org/cloudflare)
- [Cloudflare ISR Setup Guide](/docs/cloudflare-isr-setup.md)
- [Local Development Warnings Explained](/docs/local-development-warnings.md)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers Builds (CI/CD)](https://developers.cloudflare.com/workers/ci-cd/)

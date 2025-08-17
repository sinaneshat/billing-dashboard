import { createMiddleware } from 'hono/factory';

import type { ApiEnv } from '@/api/types';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  namespace?: string;
};

export function createRateLimitMiddleware(options: RateLimitOptions) {
  return createMiddleware<ApiEnv>(async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = options.windowMs;
    const limit = options.limit;
    const ns = options.namespace ?? 'rate-limit';

    // Prefer Cloudflare KV if available
    const kv = c.env.KV;

    if (kv) {
      const key = `${ns}:${ip}`;
      try {
        const raw = await kv.get<string>(key);
        const data = raw ? JSON.parse(raw) as { count: number; resetAt: number } : { count: 0, resetAt: now + windowMs };

        if (now > data.resetAt) {
          data.count = 0;
          data.resetAt = now + windowMs;
        }

        data.count += 1;
        await kv.put(key, JSON.stringify(data), { expirationTtl: Math.ceil((data.resetAt - now) / 1000) });

        c.res.headers.set('X-RateLimit-Limit', String(limit));
        c.res.headers.set('X-RateLimit-Remaining', String(Math.max(limit - data.count, 0)));
        c.res.headers.set('X-RateLimit-Reset', String(Math.floor(data.resetAt / 1000)));

        if (data.count > limit) {
          return c.json({ code: 429, message: 'Too Many Requests' }, 429);
        }

        return next();
      } catch {
        // Fall through to in-memory if KV fails
      }
    }

    // Fallback in-memory limiter per instance
    const hits = (globalThis as unknown as { __rl?: Map<string, { count: number; resetAt: number }> }).__rl ?? new Map<string, { count: number; resetAt: number }>();
    (globalThis as unknown as { __rl?: Map<string, { count: number; resetAt: number }> }).__rl = hits;

    const entry = hits.get(ip) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    hits.set(ip, entry);

    c.res.headers.set('X-RateLimit-Limit', String(limit));
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(limit - entry.count, 0)));
    c.res.headers.set('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)));

    if (entry.count > limit) {
      return c.json({ code: 429, message: 'Too Many Requests' }, 429);
    }

    return next();
  });
}

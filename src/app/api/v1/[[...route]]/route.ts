import type { NextRequest } from 'next/server';

import api from '@/api';

// Factory function that creates a Next.js API route handler
function createApiHandler() {
  return async function (req: NextRequest) {
    // Extract the path after /api/v1
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/v1', '') || '/';

    // Create a new request with the corrected path and preserve query parameters
    const newUrl = new URL(req.url);
    newUrl.pathname = path; // Set the corrected path directly
    const request = new Request(newUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
      duplex: 'half',
    } as RequestInit);

    // All requests go to the main API (now includes docs)
    return api.fetch(request, process.env);
  };
}

// Create a single handler instance for reuse across all HTTP methods
// Note: Next.js requires separate exports for each HTTP method, but they can share
// the same handler implementation when proxying to a unified API (like Hono.js)
const handler = createApiHandler();

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;

/**
 * Dynamic configuration to prevent unnecessary static optimization
 * that might interfere with Hono's routing
 */
export const dynamic = 'force-dynamic';

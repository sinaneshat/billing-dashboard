import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

// Define routing configuration (English-only)
export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  // We're not using URL-based routing, so we disable prefixes
  localePrefix: 'never',
});

// Create navigation APIs
export const { Link, redirect, usePathname, useRouter, getPathname }
  = createNavigation(routing);
